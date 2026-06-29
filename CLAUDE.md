# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Run CLI in development (via tsx)
npm run build         # Build with tsup → dist/index.js (ESM, node22 target, shebang prepended)
npm start             # Run the built CLI

# No test framework configured yet
# No linter configured yet
```

## Architecture

CLI tool that batch-fetches user IDs (open_id, user_id, union_id) from Feishu/Lark apps via the Open API. Built with Commander for command routing and @clack/prompts for interactive selection.

**Commands** (`src/commands/`):
- `config` — add/list/remove Feishu app credentials (stored at `~/.feishu-fetcher/config.json`)
- `fetch` — authenticate, optionally show interactive department picker, BFS-traverse departments collecting users, output CSV/JSON
- `dept` — display accessible department tree (tree or flat format)

**Core flow** (`src/lib/`):
- `config-store.ts` — reads/writes the local config file (multi-app support with a default)
- `feishu-client.ts` — thin HTTP wrapper over Feishu Open API with 20ms rate limiting and 3-retry exponential backoff on 429/network errors
- `traverser.ts` — BFS traversal: `buildDeptTree` builds the department hierarchy; `traverseAndCollect` walks departments collecting deduplicated users
- `dept-tree.ts` — renders tree as ASCII or flat `id\tpath` lines; interactive multiselect for department picking
- `formatter.ts` — CSV/JSON formatting and file/stdout output

**Key patterns**:
- All user-facing progress/status goes to stderr; data output goes to stdout (pipe-friendly)
- Pagination via `page_token` pattern common to all Feishu list endpoints
- Interactive prompts are skipped when stdin is not a TTY or `--department` is provided
- ESM throughout (`.js` extensions in imports, `"type": "module"` in package.json)
