/* Type-only re-exports of the doc-form override contract. Routed through
   `payload-plugin-shadcn-ui` so this surface has zero runtime coupling to
   the admin plugin — the SEO plugin can install in a vanilla Payload project
   without `payload-plugin-shadcn-admin` (the wizard view will simply not
   mount, since SEO's plugin only registers it when the admin shell is
   present). Fully erased by SWC / tsc. */ export { };
