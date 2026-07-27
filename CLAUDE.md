# payload-plugins — agent notes

- **Committed `dist/` is the shipped code.** Consumers install via GitHub-tag pins with
  no build-on-install step — any `src/` change must be followed by `pnpm build` and the
  resulting `dist/` committed, or the tag ships stale code.
- Pre-commit: `pnpm -r build && pnpm -r typecheck`. shadcn-admin's build runs
  `check:internals` (verifies the pinned Payload-internal symbols still resolve).
  There is no CI — this checklist is manual.
- Develop against a real consumer: clone `cf-payload-astro-starter` as a **sibling** and
  run `pnpm mode dev` there (never hand-link node_modules — see that repo's docs app,
  `guides/dev-mode.md`).
- Git tags are repo-wide (`v0.0.1`), not per-package; all install pins reference one tag.
- All prose documentation lives in the starter repo's docs app
  (`cf-payload-astro-starter/apps/docs/src/content/docs/plugins/` and `contributing/`) —
  update those pages, not the package READMEs (which are intentionally thin stubs).
