# QUE — Agent Protocol

> This file is the operating manual for the autonomous agent that runs once an hour. Every run is a fresh session with no memory of previous runs. The three files in this repo (`QUE-MASTER-CONTEXT.md`, `QUE-STATUS.md`, `QUE-BLOCKERS.md`) are the persistent brain.
>
> If you are a Claude session that was triggered by the hourly scheduler, follow this protocol exactly.

## 1. Orientation (every run, in order)

1. `cd` into the Que repo (the path is in the scheduler prompt).
2. Read `QUE-MASTER-CONTEXT.md` — the product vision and constraints.
3. Read `QUE-STATUS.md` — the live checklist state, journal of prior runs, and current branches.
4. Read `QUE-BLOCKERS.md` — items waiting on Michael's human action. **Do not attempt to work on blocked items.**
5. Run `git status` and `git log --oneline -20` to understand the current repo state.
6. Run `git fetch origin` and check if any auto-branches have been merged or closed on GitHub.

## 2. Pick the next task

From `QUE-MASTER-CONTEXT.md`'s checklist, pick the **one** item that:

- Is not yet done.
- Is not flagged `(human-only)`.
- Is not listed in `QUE-BLOCKERS.md`.
- Is not already in flight on an open auto-branch (check `git branch -a | grep auto/`).
- Delivers the highest leverage toward launch — prefer foundation work (ElevenLabs integration, audio pipeline) over polish until the core is solid.

**Scope discipline:** one task per run. If the task is genuinely larger than one hour of work, break it into the smallest shippable slice that still delivers value, and note the follow-up work in `QUE-STATUS.md`.

## 3. Do the work

- Create a branch: `git checkout -b auto/agent-<YYYYMMDD-HHMM>-<short-slug>` (e.g. `auto/agent-20260418-1400-elevenlabs-client`).
- Write real code, real copy, real content. **No placeholders. No TODO comments in shipped code. No "TBD".**
- Follow the voice and tone rules in `QUE-MASTER-CONTEXT.md` for any user-facing copy.
- If you generate audio scripts, write the full script — do not stub.
- Run `npm run typecheck` and `npm run lint` before committing. Fix any errors you introduce.
- Do **not** run `npm install` or modify `package-lock.json` unless the task explicitly requires a new dependency, and then only after justifying the dep in the PR body.

## 4. Commit and push

- Stage only the files your task changed. **Never** `git add -A` or `git add .` — that risks committing `.env`, local caches, or unrelated changes.
- Write a commit message in the form:
  ```
  <type>: <short summary>

  <body explaining what and why>

  Checklist item: <exact label from QUE-MASTER-CONTEXT.md>

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
  Types: `feat`, `fix`, `docs`, `copy`, `chore`, `refactor`.
- Push the branch: `git push -u origin <branch-name>`.

## 5. Open (or update) a PR

- Use `gh pr create --base main --head <branch-name> --title "<type>: <summary>"` with a body that includes:
  - **Checklist item** — the exact label it advances.
  - **What changed** — in plain language.
  - **How Michael should verify** — explicit, click-by-click if it's a UI change.
  - **Blockers surfaced** — anything new that requires Michael's action.
- If the PR would touch the same checklist item as an existing open auto-branch, prefer updating that branch over creating a new one.

## 6. Log the run

Update `QUE-STATUS.md`:

- Mark the checklist item as "in-review" (✴) with the PR link. Only Michael marks items complete (x) after merge.
- Append a journal entry with the date/time, the task, the branch, the PR link, and a one-sentence summary.

If you discovered a new blocker during the run, append it to `QUE-BLOCKERS.md` with today's date, what's blocked, and exactly what Michael needs to do.

## 7. Hard rules (never violate)

- **Never push to `main`.** Always use a branch + PR.
- **Never merge a PR.** Only Michael merges.
- **Never modify `.env` or commit secrets.** If a task needs a new env var, document it in the PR body and add a placeholder to `.env.example`.
- **Never run `eas submit`, `xcrun altool`, or any App Store / Play Store submission command.** Submission is human-only.
- **Never enroll in any paid program or make any purchase.**
- **Never delete or rewrite another auto-branch's commits.** If a prior run's PR is stale, note it — don't touch it.
- **Never take actions on the user's actual iPhone/iPad.** Physical device testing is Michael's job.
- **If the repo state is unexpected** (uncommitted changes on `main`, a merge conflict, missing files) — stop, don't try to "fix" it, and write a blocker entry describing what you saw. Michael will untangle it.

## 8. Completion

End the run with a single summary line printed to the session transcript:

```
COMPLETED: <checklist-item> — PR #<number> — <branch-name>
```

or, if the run was a no-op (everything blocked or already in flight):

```
NO-OP: <reason>
```

That summary is what Michael will see when he checks on the task.
