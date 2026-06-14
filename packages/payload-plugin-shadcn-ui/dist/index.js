/* Public surface for `payload-plugin-shadcn-ui`.
   Consumed by `payload-plugin-shadcn-admin` (which re-exports for backcompat
   on `payload-plugin-shadcn-admin/client`) and directly by feature plugins
   (menus, products, seo) that need shadcn primitives without taking a runtime
   dep on the admin replacement.

   This file is `'use client'`-free on purpose: the underlying component files
   carry their own directives. Re-export chains stay valid in either RSC or
   client trees.

   What's deliberately NOT here:
   - `FieldInput`, `SearchableSelect`, `UploadFieldInput` — these are the
     admin plugin's bridge-coupled inputs (drawer hooks, multipart upload,
     server-function rebuild). They stay in `payload-plugin-shadcn-admin` and
     are exported from `payload-plugin-shadcn-admin/client` for consumers that
     need them. */ // --- utility ---
export { cn } from './shared/utils.js';
export { useIsMobile } from './shared/use-mobile.js';
// --- shells ---
export { ViewShell } from './shared/ViewShell.js';
export { ViewHeader } from './shared/ViewHeader.js';
export { AuthShell } from './shared/AuthShell.js';
// --- doc-form extension contexts (providers + hooks).
//     The admin plugin's bridge mounts the providers; consumer-authored
//     `.input` overrides read the hooks. Hooks fall back to safe defaults
//     when no provider is mounted, so overrides stay null-check-free. ---
export { DocFormValuesProvider, useDocFormValues, useDocFormFieldValue, useDocFormSetValue } from './contexts/DocFormValuesContext.js';
export { DocIdentityProvider, useDocIdentity } from './contexts/DocIdentityContext.js';
export { LocaleProvider, useActiveLocale } from './contexts/LocaleContext.js';
// --- serializable collection/global extraction (RSC → client boundary) ---
export { extractCollection, extractField, extractVersionsConfig, stringifyLabel } from './extractCollection.js';
export { extractGlobal } from './extractGlobal.js';
// --- shadcn primitives (vendored). Each primitive's named exports mirror
//     the official shadcn/ui defaults; rebuilt via `shadcn@latest` to refresh. ---
export { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.js';
export { Badge, badgeVariants } from './ui/badge.js';
export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from './ui/breadcrumb.js';
export { Button, buttonVariants } from './ui/button.js';
export { Calendar } from './ui/calendar.js';
export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card.js';
export { Checkbox } from './ui/checkbox.js';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible.js';
export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from './ui/command.js';
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from './ui/dialog.js';
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './ui/dropdown-menu.js';
export { Input } from './ui/input.js';
export { Label } from './ui/label.js';
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './ui/popover.js';
export { RadioGroup, RadioGroupItem } from './ui/radio-group.js';
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue } from './ui/select.js';
export { Separator } from './ui/separator.js';
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet.js';
export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar } from './ui/sidebar.js';
export { Skeleton } from './ui/skeleton.js';
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './ui/table.js';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs.js';
export { Textarea } from './ui/textarea.js';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip.js';
