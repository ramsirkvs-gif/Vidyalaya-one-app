# Firebase work

For Firebase-related tasks, consult the relevant official Firebase agent skills
from the `firebase@firebase` Codex plugin. Check installation/version first. If
missing, use the official marketplace setup:

```sh
codex plugin marketplace add firebase/skills
codex plugin add firebase@firebase
```

The upstream repository is https://github.com/firebase/agent-skills. Prefer its
current Authentication skill for auth changes. Explain any unavailable plugin,
MCP, authentication or network prerequisites accurately rather than treating
local tests or saved configuration as a production deployment.

The existing project is `vidyalaya-one-app`. Preserve the Principal's password-only
login screen; it uses the configured Principal email internally with Firebase
Email/Password authentication. Do not introduce public signup, embed passwords
in code, or bypass Firebase authentication/Principal UID authorization. Do not
commit uploaded student records or backups. Publish only the approved fields
when the Principal chooses Publish in the app. User instructions can change the
intended workflow.

Use the existing checkout; each cloud task is isolated. Do not create a worktree
unless the user requests one.
