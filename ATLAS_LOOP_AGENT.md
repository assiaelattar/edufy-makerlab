# Atlas Loop Agent

The Atlas Loop Agent is the working protocol that keeps development moving in a controlled cycle. It is not a separate AI product yet. It is the repo-level operating system for deciding the next step, building it, testing it, and updating memory.

## Source Files

The agent connects these files:

- `ATLAS_BUILD_CONTEXT.md` - living source of truth for vision, progress, risks, and next loop.
- `ATLAS_SAAS_ARCHITECTURE.md` - product and technical architecture.
- `actionplan.md` - older roadmap reference, kept for historical context.
- `scripts/atlas-loop-agent.js` - local helper that prints the current loop summary.

## Trigger Phrases

When the user says any of these:

- "continue"
- "next step"
- "continue the work"
- "move to the next module"
- "what is next"
- "run the loop"

The assistant should:

1. Read `ATLAS_BUILD_CONTEXT.md`.
2. Run or mentally apply the Atlas loop.
3. Work on the module named under `Immediate Next Loop`, unless the user overrides it.
4. Build/test.
5. Update `ATLAS_BUILD_CONTEXT.md`.

## Required Loop

```txt
READ CONTEXT
  -> THINK
  -> PICK FOCUS
  -> INSPECT CODE
  -> BUILD
  -> TEST
  -> UPDATE CONTEXT
  -> REPORT
```

## Local Command

Run:

```bash
npm run atlas:next
```

This prints:

- current recommended module
- target checklist
- known cross-cutting risks
- latest verification log

## Rules for the Assistant

- Do not rely on memory alone. Read `ATLAS_BUILD_CONTEXT.md` at the start of each loop.
- Keep each loop focused on one module or one foundation.
- Prefer improvements that move Atlas toward high-end SaaS quality.
- Keep tenant safety and `organizationId` in mind on every module.
- Replace browser `alert()` / `confirm()` with app modals.
- Fix production-risk dynamic Tailwind classes as modules are touched.
- Run `npm.cmd run build` before closing implementation loops.
- Update `ATLAS_BUILD_CONTEXT.md` after each meaningful change.

## Future Evolution

Later, this can become a real Atlas agent with:

- an MCP tool for reading/updating project context
- module scanners for alerts, dynamic Tailwind, unsafe writes, and browser alerts
- a task queue
- auto-generated loop reports
- integration with GitHub issues or project boards
