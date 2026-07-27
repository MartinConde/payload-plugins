# Contributing

The dev loop, pre-commit checklist (build → typecheck → `check:internals`, and the
committed-`dist/` rule), and release process are documented in the starter repo's
docs app: `cf-payload-astro-starter/apps/docs/src/content/docs/contributing/`
(`plugin-dev-loop.md` and `releasing.md`), browsable with `pnpm docs dev` there.

Short version: `pnpm install && pnpm build && pnpm typecheck`, develop against the
starter via `pnpm mode dev` from `cf-payload-astro-starter/`, and always rebuild +
commit `dist/` with any source change — the committed `dist/` is the shipped code.
