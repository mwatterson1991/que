# Que agent — local hourly schedule

This folder holds the pieces that run the Que autonomous agent on Michael's Mac, once per hour, via `launchd`.

## Files

- `agent-prompt.md` — the prompt sent to Claude Code on each run. Mirrors the original Cowork scheduled-task body. Edit this if you want to change the agent's job description.
- `run-agent.sh` — the wrapper script `launchd` actually invokes. Sets up PATH, logs everything, and pipes the prompt into `claude --print`.
- `logs/` — created on first run. One `agent-YYYYMMDD-HHMM.log` per run. Capped at the 48 most recent.

## How to start the schedule

One-time setup (Michael runs this in Terminal):

```bash
chmod +x ~/QueApp/scripts/run-agent.sh

cat > ~/Library/LaunchAgents/com.que.agent.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.que.agent</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>$HOME/QueApp/scripts/run-agent.sh</string>
  </array>
  <key>StartInterval</key><integer>3600</integer>
  <key>RunAtLoad</key><false/>
  <key>StandardOutPath</key><string>/tmp/que-agent.out</string>
  <key>StandardErrorPath</key><string>/tmp/que-agent.err</string>
</dict>
</plist>
PLIST

launchctl unload ~/Library/LaunchAgents/com.que.agent.plist 2>/dev/null
launchctl load   ~/Library/LaunchAgents/com.que.agent.plist
```

That's it — the agent will run every hour from then on, as long as the Mac is awake.

## Useful commands

Run it once right now (without waiting an hour):

```bash
~/QueApp/scripts/run-agent.sh
```

See the most recent log:

```bash
ls -t ~/QueApp/scripts/logs | head -1 | xargs -I {} less ~/QueApp/scripts/logs/{}
```

Stop the schedule:

```bash
launchctl unload ~/Library/LaunchAgents/com.que.agent.plist
```

Start it again:

```bash
launchctl load ~/Library/LaunchAgents/com.que.agent.plist
```

## Notes

- The schedule does NOT run while the Mac is asleep. If you close the lid, the agent pauses until you wake it. That's fine.
- Logs are capped at 48 files (~2 days). If you need more history, edit the `tail -n +49` line in `run-agent.sh`.
- The agent respects the hard rules in `QUE-AGENT-PROTOCOL.md` Section 7 — it won't push to `main`, won't merge PRs, and won't touch `.env`.
