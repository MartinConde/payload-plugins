# `payload-plugin-shadcn-admin` — Features & Gaps

Living high-level overview of what the plugin handles and what it deliberately doesn't (yet). See [SETUP.md](./SETUP.md) for install and wire-shape details, and [MEMORY.md notes] for the load-bearing architecture patterns.

---

## Overview

### `defaultListView` — auto list per collection

- Server-driven DataTable with pagination + sort
- Filter chip bar (operator UI per field type) + saved filter presets per user
- Column reorder + visibility persisted via Payload user preferences (drag-and-drop)
- **Bulk-edit drawer** (v3.17): full field-type coverage. A field-picker drawer that edits any type the doc form supports — scalars, point/code/json, relationship (incl. hasMany + polymorphic), `type:'upload'` (pick existing **or** upload a new file → media id), array/blocks (whole-value replace), richText (Lexical, fetched standalone via `getFormState`), and leaves inside group/tabs/row/collapsible (flattened to per-leaf). Reuses the doc form's own renderers (`makeFieldTreeRenderer`) — no second field-editor matrix — and scopes the batch `PATCH …?where[id][in]=…&locale=<active>` to the active locale
- CSV export
- Per-field `.cell` override via `field.custom['plugin-shadcn-admin'].cell`
- Cell renderers shipped for richText, array, blocks, group/tabs, point, polymorphic relationship
- **Trash bin** (v3.12): for collections with `trash: true`, the `/collections/:slug/trash` route reuses the same auto list view. Payload's `TrashView` calls `renderListView({ trash: true, viewType: 'trash' })`, which renders our `views.list.Component` — so **no separate view slot is needed**; the view branches on `viewType`. Lists only soft-deleted docs (the depth:1 refetch path adds `trash: true` + `deletedAt exists`); **Restore** and **Permanently delete** (single + bulk) with confirm dialogs and a **restore-as-published/draft** toggle for drafts-enabled collections; trash-specific empty state; a **Trash** entry button on the normal list toolbar; rows open Payload's read-only trash doc view at `/trash/:id`. On the **normal list**, delete becomes a **soft delete** for trash-enabled collections (`PATCH …{ deletedAt: <ISO> }`) so docs land in the bin instead of being destroyed; non-trash collections still hard-delete. Request shapes mirror Payload's `RestoreMany` / `DeleteMany` (soft: `PATCH { deletedAt }`; restore: `PATCH …?trash=true&locale=<active> { deletedAt: null, _status? }`; permanent: `DELETE …?trash=true`). Restore is **locale-scoped** so restore-as-published only publishes the active locale (required localized fields empty in other locales don't block the restore).

### `defaultDocView` — auto doc form

- **Field type coverage**: text, textarea, email, number, date, checkbox, select (single + hasMany), radio, point, code, json, relationship (poly + hasMany), upload (collection-level dropzone + field-level + polymorphic), richText (Lexical via lifted `customComponents.Field`), array, blocks (drag reorder), group, tabs (named + unnamed), row, collapsible
- **Sidebar layout** (v3.25): top-level fields carrying Payload's `admin.position: 'sidebar'` are partitioned into a right-hand sidebar column (`lg:w-72`, left border), the rest stay in the main column — mirroring Payload's `DocumentFields` split (`fieldIsSidebar` = `admin.position === 'sidebar'`, top-level only; nested fields are never pulled out). Collections with no sidebar fields render the unchanged single column (no empty gutter); the column wrapper stacks below the main column on narrow viewports. The sticky toolbar stays full-width above both. Any field type can sit in the sidebar (a top-level group/tabs/array routes through the same `renderChild`). Tabs are unaffected — they render wherever they sit in the field array, including as a top-level/primary tab bar.
- **Drafts**: Save-draft / Publish buttons, autosave with single-flight + path→value snapshot for correct dirty cleanup
- **Versions workflow** (v3.9): full shadcn replacement for Payload's native versions views, installed at the `edit.versions` / `edit.version` route slots so the header **Versions** tab lands on the plugin's own chrome. Paginated versions list (DataTable, no 20-cap; excludes per-locale publish snapshots like Payload's native list, shows all locales); single-version **field-by-field From→To diff** (built on `@payloadcms/ui` diff primitives — `FieldDiffContainer` / `getHTMLDiffComponents`); **compare-against** selector (previous / any prior version) and **locale pills** to scope the diff; **Restore** + **Restore as draft**. Diff walk recurses group/tabs/row/collapsible/array/blocks and expands localized leaves per selected locale (including the per-locale `_status` change under `localizeStatus`); only changed fields render. richText diffs structurally as HTML (block + inline tags via `getHTMLDiffComponents`) as of v3.24 — see gap below for the remaining moved-block limitation.
- **API view** (v3.10): full shadcn replacement for Payload's native document API view, installed at the `edit.api` route slot so the header **API** tab lands on the plugin's own chrome. Two-column layout (controls left, JSON right); live re-fetch on `depth` / `draft` / `locale` / `authenticated` change with the same query params (`depth`, `draft`, `locale`, `trash`) and `credentials` toggle as Payload; copyable API URL + new-tab link; custom collapsible JSON tree (shadcn-tokenized). Gated the same as the default edit view, so collections that fall back to Payload's edit view keep Payload's API view (no mixed chrome).
- **Schedule-publish** (v3.15): opt in with `versions.drafts.schedulePublish` on the collection/global (which is what registers Payload's `schedulePublish` jobs task). A **Schedule** popover next to the Publish button (edit-mode only — a scheduled job needs an existing doc) with shadcn date+time picker, **timezone picker** (from `admin.timezones`), publish/unpublish toggle, and a single-locale picker for any localized collection/global with multiple locales (maps to `publishSpecificLocale`). Lists **upcoming** scheduled events for the doc and **cancels** them. Queues/lists/cancels through Payload's `schedulePublish` server function (same `useServerFunctions()` seam the bridge uses for `getFormState`) — wall-clock→instant conversion via `@date-fns/tz`'s `TZDate`; upcoming list mirrors the native REST query (`POST /api/payload-jobs` with `X-Payload-HTTP-Method-Override: GET`). Works for collections (`doc`) and versioned globals (`global`). **Execution caveat**: the UI only *queues* jobs — the consuming app must run the jobs queue (`jobs.autoRun` / external cron) for scheduled events to actually fire. See [SETUP.md].
- **Access control**: field-level `access.read` / `access.update` hiding with lock icon; structural containers hide when every child is read-denied (v3.7)
- **Localization**: locale switcher, per-locale dirty tracking, hybrid `?locale=all` initial fetch with `draft: true`, publish-per-locale + publish-all-locales matching Payload's `PublishButton` wire shape, per-locale `_status` pills (v3.8 / v3.8.1)
- **Escape hatches**: per-field `.input` override; **group/tabs-level `.input` override** (v3.19 — a `group`/`tabs` field carrying `custom['plugin-shadcn-admin'].input` is routed through `FieldInput` instead of the structural renderer; the override receives the whole container value live plus `renderChild`, so it can render its own chrome and delegate the real subfield inputs back through the bridge — used by `payload-plugin-seo` for the SERP preview); static `defaultValue` seeding; discard + beforeunload guard

### `defaultGlobalView` — auto doc form for globals (v3.14)

- Opt in with `defaultGlobalView: 'all' | string[] | false` (default `false`), mirroring `defaultDocView`'s shape (`'all'` = every eligible global; `string[]` = listed slugs). Consumer-defined `views.edit` wins; the same field-type eligibility skip applies.
- **Reuses the entire doc-form stack** against `globalConfig` — same field renderers, drafts + autosave, localization (locale switcher, per-locale dirty, per-locale `_status` pills + `[Publish all locales]`), field-level access gating, versions diff/restore, and API view. The only differences are at three layers: the **RSC entry** (reads `initPageResult.globalConfig`, no `docID`, `/admin/globals/{slug}` breadcrumbs), the **submit wire** (always `POST /api/globals/{slug}` — singleton upsert, never PATCH, no create mode, no post-save navigation), and **registration** (`installAutoGlobalDocView` walks `config.globals`).
- **Versions** use the global Local API (`findGlobalVersions`, `findGlobalVersionByID`, `restoreGlobalVersion` → `POST /api/globals/{slug}/versions/{id}`); the version slots install only when the global has `versions` enabled, so a **non-versioned global shows no Versions tab**.
- Globals appear in the sidebar via `NavItem.globalSlug` (`/admin/globals/{slug}`).
- **Deferred**: global Live Preview (same as collections).
- **Upstream bug worked around via patch** (`experimental.localizeStatus` + globals + D1): Payload 3.84.1's `countGlobalVersionsOperation` omits `locale` (the collection `countVersionsOperation` passes it), so its own `getVersions` runs a global version-count whose localized `version._status` join binds an undefined locale — D1 rejects it once a published version exists. Fixed by `patches/payload@3.84.1.patch` (one line: `locale: req.locale` in that operation), so the test `Homepage` global runs with `localizeStatus: true` and exercises per-locale pills on a singleton. Not a plugin issue (the failing query is Payload's `Document` view); re-check the patch on Payload upgrade and report upstream.

### `defaultNav` — auto sidebar Nav

- Branding (name, subtitle)
- Sidebar groups + items: collection links (with auto count badges), custom items, nested item trees, separators

### Chrome

- `ViewShell` (breadcrumbs + content frame), optional custom dashboard, shadcn theme + Tailwind CSS surface

### `defaultAuthViews` — Account + auth views (v3.11)

- Opt in with `defaultAuthViews: true`. Installs shadcn replacements at the root-level
  `admin.components.views.<key>` slots (resolved by key via Payload's `getCustomViewByKey`), consumer-wins per key.
- **Account** (`/account`): post-auth, rendered inside the sidebar shell via `ViewShell` (reuses the
  `.shadcn-auto-doc-view` chrome-hiding marker). Profile fields render through the shared `FieldList`
  (same per-field-type inputs + field-level `read`/`update` access gating as the doc view); separate
  change-password card; API-key panel (enable / show + copy / regenerate) when `auth.useAPIKey`;
  email-verification badge when `auth.verify`. Each concern PATCHes `/api/{userSlug}/{id}` and refreshes.
- **Pre-auth views** (`/login`, `/create-first-user`, `/forgot`, `/logout`, `/logout-inactivity`,
  `/unauthorized`): centered-card `AuthShell` (no sidebar; the passive `MinimalTemplate` wrapper is
  neutralized via a `.shadcn-auth-view` `:has()` rule). Login posts to `/{userSlug}/login` and
  `setUser`s + redirects (honoring `?redirect` + `beforeLogin`/`afterLogin` slots); create-first-user
  posts to `/first-register` rendering the collection's fields (so the first user can set `roles`);
  forgot posts to `/forgot-password` with email/username + success state; logout calls `useAuth().logOut()`.
- **Deferred**: reset-password (`/reset/:token`) and verify (`/:collection/verify/:token`) are NOT
  overridable in Payload 3.84.1 and fall through to Payload's default views.

### `defaultFolderView` — shadcn folder browser (v3.13)

- Opt in with `defaultFolderView: true` (requires root `folders` enabled). Replaces Payload's
  **Browse by Folder** with a full shadcn browser, and surfaces the **per-collection** folder view
  through the auto list view.
- **Override mechanism (load-bearing):** the cross-collection view installs at
  `admin.components.views.browseByFolder`. The router's case-1 custom-view lookup
  (`getCustomViewByKey`) resolves this **before** Payload's `buildBrowseByFolderView` ever runs — the
  same proven path the `account` override uses. The disabled `folders.components.views` slot is a
  red herring; this works regardless. **Folder navigation uses a `?folderID=` query param**, NOT the
  `/browse-by-folder/:folderID` path segment (that path is hardcoded to Payload's component), so our
  view always renders.
- **Per-collection folder view:** `/collections/:slug/:folderSlug` is hardcoded (not router-overridable),
  so instead the auto list view renders **our own** folder browser at `/collections/:slug?view=folders`
  via a List ⇄ Folders toggle in the header. The toggle deliberately **never sets Payload's
  `listViewType: 'folders'` preference** (which would route to Payload's hardcoded folder view).
- **Data:** cross-collection RSC uses Payload's `getFolderData({ folderID, req })`; the per-collection
  RSC (no `req` in `ListViewServerProps`) uses direct `payload.find` (`getCollectionFolderData`) scoped
  to the collection. Folders are the shared `payload-folders` tree; documents are scoped per view.
- **Interactions (`FolderBrowserClient`):** breadcrumb navigation; **create / rename / delete** folder
  (`POST`/`PATCH`/`DELETE /api/payload-folders`); **multi-select + drag-and-drop move** (`@dnd-kit`) —
  a **Select** toggle switches clicks from open-item to select-item (click toggles, shift-click selects the
  range); then drag any selected item (or a single unselected one) onto a
  folder card or breadcrumb crumb (incl. root) to re-file the batch. Moves are grouped by collection and
  bulk-`PATCH`ed (`where[id][in]`), scoped to the active locale (so required localized fields in empty
  locales don't fail validation). Cascade-delete + re-parent are handled by Payload's own collection hooks.
- **v1 limitations:** create omits `folderType` (folders accept all collections — always passes
  Payload's subset validation, but the per-collection view isn't `folderType`-filtered); no client-side
  permission gating on create/rename/delete (failures surface as a toast; Payload still enforces
  server-side); folder contents are fetched unbounded (`limit: 0`); the browse-root shows only folders
  (mirrors `getFolderData`). Drag is keyboard-inaccessible (pointer only).

### `defaultDashboard` — shadcn root dashboard (v3.16)

- Opt in with `defaultDashboard: true` (default `false`). Installs a polished, zero-config shadcn dashboard
  at the root `/admin` landing. Consumer-defined dashboard wins.
- **Override mechanism (load-bearing, differs from the auth/folder overrides):** the root route is
  **hardcoded** in Payload's router (`getRouteData` `case 0` always returns Payload's `DashboardView` — it is
  NOT resolved via `getCustomViewByKey`). But `DashboardView` itself renders
  `config.admin.components.views.dashboard?.Component` with its own `DefaultDashboard` as the **fallback**
  (`RenderServerComponent({ Component: …views.dashboard.Component, Fallback: DefaultDashboard })`). So
  installing at `admin.components.views.dashboard` replaces the landing page, and a consumer-defined
  dashboard wins automatically (same `if (!existingViews.dashboard)` guard as `browseByFolder`). Payload's
  import-map generator iterates all `views` keys generically, so the path resolves like every other view.
- **Grouping:** reuses the **access-controlled, `admin.group`-grouped `navGroups`** prop Payload's
  `DashboardView` already passes the component (built by `@payloadcms/ui` `getNavGroups` → `groupNavItems`,
  pre-filtered to entities the user can `read`). No count mechanism exists in the sidebar Nav to reuse, so
  per-collection counts come from `payload.count({ overrideAccess: false })` run in parallel from the RSC.
- **Cards:** collection cards show a live count `Badge` + **New** (`/admin/collections/{slug}/create`) and
  **View all** (`/admin/collections/{slug}`); globals render as cards linking to `/admin/globals/{slug}`
  (no count, no New). Sections match the nav groups.
- **Recently updated strip:** capped cross-collection — samples the first ~5 readable collections that keep
  `timestamps`, `find`s each `sort: '-updatedAt' limit: 5` (access-scoped, each in try/catch), merges, and
  shows the top ~8 with relative time. Payload has no single-query recent-across-collections, hence the cap.
- **Chrome:** renders through `ViewShell` with a single "Dashboard" breadcrumb. No `.shadcn-auto-doc-view`
  marker (that hides the doc-header, a doc-view artifact absent here; `.app-header` is already hidden globally).
- **v1 limitations:** counts are point-in-time (no live refresh); the recent strip is capped, not exhaustive;
  no per-card create-access gating (server still enforces).

---

## Feature gaps (deferred — to be tackled one by one)

### Doc form

- **richText diff — moved-block detection** — v3.24 upgraded the version diff from a flattened-text word diff to a **structural HTML diff** (block + inline tags fed through `getHTMLDiffComponents`), so paragraph↔heading, list, link, and formatting changes now show granularly. Remaining gap: the HTML differ shows a *reordered* block as delete+add rather than a move, and void nodes (upload/relationship/block) diff as typed placeholders, not rendered content. A full Lexical tree-diff with node alignment would close this; niche — revisit only if a content team needs move-aware richText diffs.
- **Container-denied subfield propagation** — when an `array` / `blocks` field's own `update` is denied, its subfields can still render editable (per-subfield gating recomputes from `docPermissions` independently of the container's denied state; the container's `disabled` does not propagate into the subfield recursion). Pre-existing v3.7 limitation surfaced while building v3.18. Niche — the server rejects the writes either way; revisit if a real case needs the subfields visibly locked.
- **Live preview pane** integration (`@payloadcms/live-preview`).
- **Mid-keystroke locale-switch race** in Lexical richText — final keystrokes during a switch may land in the previous locale's slot. Lexical's `onChange` is async-committed; not solved in v3.8. Wait until someone hits it in practice.
- **Cloud-storage client-side direct upload** — wired (v3.23, capability-detected via `useUploadHandlers`) but **blocked on R2 in Payload 3.84.1**: `@payloadcms/storage-r2`'s `initClientUploads` omits `extraClientHandlerProps`, so the client handler crashes on `extra.chunkSize`. Disabled (`clientUploads` off → server multipart). Re-enable on an R2 fix or via a pnpm patch defaulting `extra = {}`.

### Localization / multi-tenancy

- **Locale-specific access control intersection** — access predicates that vary by locale aren't reflected in UI gating.
- **Multi-tenant scoping** integration (plugin not installed in this project; revisit when added).

---

## Remaining views to replace

Inventory of Payload's admin views (from `@payloadcms/next/dist/views/`) and the plugin's coverage. Each unchecked item is a candidate for a fresh session. Views not yet replaced render in Payload's default chrome inside our sidebar shell.

### Document-level (collections) — the tab row

- ✅ **Edit / Create** (`edit.default`)
- ✅ **Versions** list (`edit.versions`) + **Version** diff (`edit.version`) — v3.9
- ✅ **API** (`edit.api`) — v3.10
- ⬜ **Live Preview** (`edit.livePreview`) — needs `@payloadcms/live-preview`; only meaningful with a frontend wired for it. (Tracked under Doc form gaps.)

### Collection-level (list area)

- ✅ **List** (`defaultListView`)
- ✅ **Trash** (`CollectionTrash`) — v3.12. Soft-deleted-docs bin, restyled by reusing the auto list view (`renderListView` renders our `views.list.Component` for the trash route too; we branch on `viewType`). Restore + permanent-delete (single + bulk), restore-as-published toggle, entry-point button, read-only trash doc view, empty state. See the `defaultListView` Trash bin entry above.
- ✅ **Browse by Folder** (`BrowseByFolder`) — v3.13. Full shadcn cross-collection folder browser, opt in with `defaultFolderView: true`. See the `defaultFolderView` feature subsection below.
- ✅ **Per-collection folder view** (`CollectionFolders`) — v3.13. Surfaced through the auto list view via a List ⇄ Folders toggle + `?view=folders` (our own view; NOT Payload's hardcoded `CollectionFolders` route).

### Account & auth views

Opt in with `defaultAuthViews: true` (see the feature subsection above). Full-page, form-driven views:

- ✅ **Account** (`Account`) — v3.11. Logged-in user's profile (fields + change-password + API key + verification state).
- ✅ **Login** (`Login`) — v3.11
- ✅ **Create First User** (`CreateFirstUser`) — v3.11
- ✅ **Forgot Password** (`ForgotPassword`) — v3.11
- ⬜ **Reset Password** (`ResetPassword`) — **deferred**: not cleanly overridable in Payload 3.84.1 (the `/reset/:token` view is hardcoded before any custom-view lookup; the only workaround desyncs the reset-link email). Falls through to Payload's default.
- ⬜ **Verify** email (`Verify`) — **deferred**: not overridable in Payload 3.84.1 (`/:collection/verify/:token` matches a literal string with no component slot). Falls through to Payload's default.
- ✅ **Logout** (`Logout`) + **Unauthorized** (`Unauthorized`) — v3.11

### Root & misc

- ✅ **Dashboard** (`Dashboard`) — v3.16. The root `/admin` landing. Opt in with `defaultDashboard: true`. Grouped collection cards with live counts + New/View-all, a Globals section, and a "Recently updated" strip. See the `defaultDashboard` feature subsection below.
- ⬜ **Not Found** (`NotFound`) — 404 page.

### Globals

- ✅ **Global document views** (global `edit.default` / `versions` / `version` / `api`) — v3.14. Opt in with `defaultGlobalView` (see the feature subsection below). The collection doc-form + versions + API machinery is reused wholesale against `globalConfig` — the RSC entry points branch on `globalConfig`, the bridge upserts via `POST /api/globals/{slug}`, and the version views use `findGlobalVersions` / `findGlobalVersionByID` / `restoreGlobalVersion`. Non-versioned globals get no Versions tab.
- ⬜ **Global Live Preview** (`edit.livePreview`) — **deferred**, same as collections (needs `@payloadcms/live-preview`). Tracked under Doc form gaps.

---

## How to pick the next one

Roughly descending impact for content-workflow projects:

1. **Live preview pane** — only meaningful if the project has a frontend wired for `@payloadcms/live-preview`.
2. The rest are niche; revisit if/when a real project hits them.
