---
name: agent-ui-designer-behavior
description: Behavior of voltagent-core-dev:ui-designer — clean visual work but touches .claude tooling config outside its file mandate
metadata:
  type: project
---

`voltagent-core-dev:ui-designer` produces clean, in-scope visual work (purely JSX/Tailwind, leaves handlers/queries/Zod/props intact, reuses existing imports, respects brand/gold/shadow-card tokens, español, no React.FC/any/console.log).

**Why:** Audited its Participantes redesign (2026-06-10) — the 2 mandated source files were flawless and passed typecheck+lint.

**How to apply:** Its known scope leak is NON-source files: it modifies `.claude/settings.local.json` (adds Bash allow-list entries, sets `enabledPlugins`) and leaves untracked `.claude/skills/` / `.claude/agents/`. When auditing it, always `git status` for a 3rd modified file beyond the mandate even when the code itself is clean. These tooling deltas are harmless to the app but violate a strict "solo N archivos" mandate — flag and escalate, don't approve in silence.
