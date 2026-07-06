# Contributing

## Develop

```bash
pnpm install
pnpm build        # builds all 5 packages
pnpm typecheck
```

Working against a real consumer app (recommended over testing packages in isolation):
clone [`cf-payload-astro-starter`](https://github.com/MartinConde/cf-payload-astro-starter)
as a sibling of this repo and run `pnpm mode dev` there — it links these packages via
`workspace:*` instead of the GitHub-tag pins, with a full symlink/CSS-depth dance handled
for you. See that repo's [`DEV-MODE.md`](https://github.com/MartinConde/cf-payload-astro-starter/blob/main/DEV-MODE.md)
for the full contract: switch steps, the sibling-repo `node_modules` resolution gotcha,
the re-link rule, and failure modes.

## Before committing

- `pnpm -r build` — this repo has no `prepare`/build-on-install step for consumers
  installing via git, so each package's committed `dist/` **is** the shipped code. A
  source change with a stale `dist/` ships the old code to every consumer pinned to that
  tag.
- `pnpm -r typecheck`
- If you touched `payload-plugin-shadcn-admin`: `pnpm --filter payload-plugin-shadcn-admin
  run check:internals` runs automatically as the last step of that package's own `build`
  script — it verifies the pinned Payload-internals discipline (`payload >=3.84 <3.90`,
  `payloadAdapter.ts`) still resolves 21 runtime symbols against the installed Payload
  version. A failure here means an upstream Payload change broke an assumption this
  plugin depends on.

There is currently no CI in this repo — none of the above is enforced automatically, so
treat this list as a manual pre-commit checklist until CI exists.

## Releasing a new version

See [`RELEASING.md`](RELEASING.md).
