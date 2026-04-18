#!/bin/bash
# Runs the Que autonomous agent via Claude Code.
# Invoked hourly by the launchd job at ~/Library/LaunchAgents/com.que.agent.plist.
# Logs land in ~/QueApp/scripts/logs/.

set -u  # error on unset vars; do NOT use -e so we still write a log on failure

REPO_DIR="$HOME/QueApp"
SCRIPT_DIR="$REPO_DIR/scripts"
PROMPT_FILE="$SCRIPT_DIR/agent-prompt.md"
LOG_DIR="$SCRIPT_DIR/logs"
STAMP="$(date +%Y%m%d-%H%M)"
LOG_FILE="$LOG_DIR/agent-$STAMP.log"

# Hard caps so a runaway run can never lock things up.
MAX_SECONDS=600   # 10-minute wall-clock limit
MAX_TURNS=80      # Claude Code tool-use turn budget (one task usually needs 30-60)

mkdir -p "$LOG_DIR"

# launchd doesn't inherit your interactive shell PATH. Rebuild the essentials
# so claude, gh, git, node, and brew-installed tools all resolve.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

{
  echo "=============================================================="
  echo "Que agent run — $(date)"
  echo "Wall-clock cap: ${MAX_SECONDS}s   Turn cap: ${MAX_TURNS}"
  echo "=============================================================="

  if [ ! -d "$REPO_DIR/.git" ]; then
    echo "NO-OP: repo not found at $REPO_DIR"
    exit 0
  fi

  if [ ! -f "$PROMPT_FILE" ]; then
    echo "NO-OP: agent prompt missing at $PROMPT_FILE"
    exit 0
  fi

  cd "$REPO_DIR" || { echo "NO-OP: could not cd into $REPO_DIR"; exit 0; }

  # --print runs Claude Code in headless mode and exits when done.
  # --dangerously-skip-permissions lets the agent act without prompting; the
  # agent's own "Hard rules" section is what keeps it in bounds.
  # --max-turns caps how many tool-use rounds the agent can take.
  # --verbose makes every turn stream into the log in real time instead of
  # only the final message (which is empty if the agent early-exits). Without
  # this, silent NO-OPs look identical to total failure.
  cat "$PROMPT_FILE" | claude --print --verbose --dangerously-skip-permissions --max-turns "$MAX_TURNS" &
  CLAUDE_PID=$!

  # Watchdog: if claude is still running after MAX_SECONDS, kill it (and its
  # children) so the run never hangs the schedule.
  (
    sleep "$MAX_SECONDS"
    if kill -0 "$CLAUDE_PID" 2>/dev/null; then
      echo ""
      echo "!! TIMEOUT after ${MAX_SECONDS}s — killing agent run."
      # Try graceful first, then force.
      pkill -TERM -P "$CLAUDE_PID" 2>/dev/null
      kill -TERM "$CLAUDE_PID" 2>/dev/null
      sleep 5
      pkill -KILL -P "$CLAUDE_PID" 2>/dev/null
      kill -KILL "$CLAUDE_PID" 2>/dev/null
    fi
  ) &
  WATCHDOG_PID=$!

  wait "$CLAUDE_PID"
  CLAUDE_EXIT=$?

  # Clean up the watchdog if claude finished on its own.
  kill "$WATCHDOG_PID" 2>/dev/null
  wait "$WATCHDOG_PID" 2>/dev/null

  echo ""
  echo "=============================================================="
  echo "Run finished — $(date)   exit=$CLAUDE_EXIT"
  echo "=============================================================="
} >> "$LOG_FILE" 2>&1

# Keep only the 48 most recent logs so this doesn't grow forever.
ls -1t "$LOG_DIR"/agent-*.log 2>/dev/null | tail -n +49 | xargs -I {} rm -f {}
