# voice-coach: harness project data

This branch (`harness-project`) is the agent-harness **project directory** for the
voice-coach app. The app's code is on `main` of this same repository. This branch
shares no history with `main`, and the harness never reads it as code.

| Path | What it is |
|---|---|
| `request/` | The user's requests, verbatim, hashed at capture |
| `plan/` | The plan as validated revisions (`plan.md` is the readable view) |
| `architecture.md` | The contract every model builds against |
| `harness.toml` | Caps, review policy, routing, gates for this project |
| `ledger/` | Append-only record of every call, run and event: commit it |

Run artefacts (`runs/`, `workspaces/`, `cache/`, ...) and the code clone (`repo/`)
are git-ignored.

## Restore it on a new machine or in a new cloud session

```bash
git clone -b harness-project https://github.com/luck058/voice-coach ../projects/voice-coach
harness repo clone --project ../projects/voice-coach     # the app code, from [repo] source
harness doctor --project ../projects/voice-coach
```

The harness never pushes. After a run, review `harness changes`, then merge
`harness/integration` into `main` in `repo/` and push it yourself; commit and push
this branch too, so the ledger keeps the record.
