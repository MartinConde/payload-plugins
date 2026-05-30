import * as React from 'react'

/* Public RSC the consumer wraps around their project-specific sidebar.
   .twp scopes Tailwind preflight to this subtree; display:contents keeps the
   Sidebar a direct flex child of .template-default. The SidebarProvider lives
   in admin.components.providers (AdminProviders) so SidebarTrigger works
   inside views. */
export function NavShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="twp" style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
