# Releasing

These packages aren't published to npm — consumers install a single package straight
from this repo, pinned to a git tag, using pnpm's `path:` git syntax (see the root
[`README.md`](README.md)). That makes two things different from a normal npm release:

- **Each package's built `dist/` is committed to git.** There is no `prepare`/build-on-
  install step — a git install just fetches the tag's tree as-is. If `dist/` is stale
  relative to `src/` when you tag, that stale code is exactly what ships.
- **Tags are repo-wide**, not per-package. One `payload-plugins` repo holds five
  packages; a single tag (e.g. `v0.0.1`) is what every package's install pin references,
  regardless of which package(s) actually changed.

## Cutting a release

```bash
cd payload-plugins
pnpm -r build                                    # rebuild all dist — see the dist-commit rule below
git diff --stat -- 'packages/*/dist'             # sanity-check what actually changed
# bump version in the relevant package's package.json
git add -A && git commit -m "release payload-plugin-seo 0.1.0"
git tag v0.1.0
git push origin main --tags
```

Then update the pins in the consuming app(s) — e.g. in `cf-payload-astro-starter`,
`apps/cms/package.json` and `apps/web/package.json` — changing `#v0.0.1` to `#v0.1.0` in
each affected `github:` URL, then `pnpm install` and commit the pin bump there.

Notes:
- Bump the version of the package(s) you actually changed; the tag covers the whole
  repo regardless.
- For a bulletproof pin (no risk of a tag being moved out from under you later), pin a
  commit SHA instead: `#<sha>&path:/packages/<name>`.
- If you haven't released to any external consumer yet, moving the existing tag instead
  of cutting a new one is fine: `git tag -d v0.0.1 && git tag v0.0.1 && git push origin
  v0.0.1 --force`. Once a consumer outside this workspace has pinned a tag, stop moving
  it — force-moving a tag someone else has already resolved silently changes what their
  existing pin points to.

## The dist-commit rule

`pnpm -r build` must run — and the resulting `dist/` diff must be committed — before
every tag. There is currently **no CI or pre-tag hook enforcing this**; it's a manual
discipline. The check to eventually automate, so a stale-dist release becomes
impossible rather than just unlikely:

```bash
pnpm -r build && git diff --exit-code -- packages/*/dist
```

A non-zero exit means some package's `src/` changed since its `dist/` was last built —
fix that (rebuild + commit) before tagging, not after.

## `check:internals`

`payload-plugin-shadcn-admin` pins its Payload peer range tightly (`>=3.84 <3.90`) and
reaches into a few Payload internals (`payloadAdapter.ts`) that aren't part of Payload's
public API. `scripts/check-payload-internals.mjs` verifies those 21 runtime symbols
still resolve against whatever Payload version is actually installed; it runs as the
last step of that package's own `build` script, so it's exercised on every `pnpm -r
build`. There's no CI to also run it standalone — if you're releasing without a fresh
`pnpm -r build` in your local history for some reason, run it explicitly first:

```bash
pnpm --filter payload-plugin-shadcn-admin run check:internals
```

A failure here means an upstream Payload release (within the pinned range) changed
something this plugin depends on that isn't guaranteed by semver — narrow the peer
range or fix the adapter before releasing.

## Working across repos while releasing

If you're releasing a change that was developed against `cf-payload-astro-starter`'s
dev mode (`pnpm mode dev`, symlinking this repo in via `workspace:*`), switch that repo
back to `pnpm mode standalone` after bumping the tag so it picks up the new GitHub pin
rather than continuing to read your local working tree. See that repo's README ("Dev
mode: editing plugins") and [`CONTRIBUTING.md`](CONTRIBUTING.md) here for the local
dev-loop.
