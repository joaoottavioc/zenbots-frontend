"""PostToolUse hook stub for the zenbots-frontend repo.

The global Claude Code config points at `.claude/hooks/post-edit-simulation.py`
relative to the current working directory. The backend repo (zenbots) has
the real script that triggers the LLM simulation suite when critical
conversational files change. The frontend has no such concern — every
file in this repo is UI/static-asset code that the backend simulation
doesn't cover.

This stub exits 0 for every edit so the hook doesn't block frontend
work. If we ever want frontend-side post-edit automation (e.g. run
vitest on touched components), this is the place to add it.
"""

import sys

# Drain stdin to mirror the real hook's stdin contract (the global
# hook config pipes JSON in even when we don't use it).
try:
    sys.stdin.read()
except Exception:
    pass

sys.exit(0)
