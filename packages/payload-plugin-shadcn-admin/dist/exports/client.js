'use client';
export { default as AdminProviders } from '../shared/AdminProviders.js';
export { ViewHeader } from 'payload-plugin-shadcn-ui';
export { ViewShell } from 'payload-plugin-shadcn-ui';
export { AuthShell } from 'payload-plugin-shadcn-ui';
export { NavUser } from '../features/nav/NavUser.js';
export { CollectionsSidebarGroup } from '../features/nav/CollectionsSidebarGroup.js';
export { DefaultAdminSidebar } from '../features/nav/DefaultAdminSidebar.js';
/* shadcn primitives (vendored). Re-exported so consumers don't need to copy
   their own. */ export { Button, buttonVariants } from 'payload-plugin-shadcn-ui';
export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from 'payload-plugin-shadcn-ui';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from 'payload-plugin-shadcn-ui';
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from 'payload-plugin-shadcn-ui';
export { Input } from 'payload-plugin-shadcn-ui';
export { Label } from 'payload-plugin-shadcn-ui';
export { Textarea } from 'payload-plugin-shadcn-ui';
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from 'payload-plugin-shadcn-ui';
export { RadioGroup, RadioGroupItem } from 'payload-plugin-shadcn-ui';
export { Separator } from 'payload-plugin-shadcn-ui';
export { Badge, badgeVariants } from 'payload-plugin-shadcn-ui';
export { Calendar } from 'payload-plugin-shadcn-ui';
export { Checkbox } from 'payload-plugin-shadcn-ui';
export { Tabs, TabsContent, TabsList, TabsTrigger } from 'payload-plugin-shadcn-ui';
export { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from 'payload-plugin-shadcn-ui';
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from 'payload-plugin-shadcn-ui';
/* Sidebar primitives re-exported from the plugin so the consumer's sidebar
   content (AppSidebar etc.) shares the same React context as the plugin's
   AdminProviders/SidebarProvider and ViewHeader/SidebarTrigger. */ export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar } from 'payload-plugin-shadcn-ui';
export { DataTable } from '../features/list-view/data-table/DataTable.js';
export { DataTableColumnHeader } from '../features/list-view/data-table/DataTableColumnHeader.js';
export { DataTablePagination } from '../features/list-view/data-table/DataTablePagination.js';
export { DataTableViewOptions } from '../features/list-view/data-table/DataTableViewOptions.js';
export { selectColumn } from '../features/list-view/data-table/selectColumn.js';
export { useDataTableUrlState, DEFAULT_PAGE_SIZE } from '../features/list-view/prefs/useDataTableUrlState.js';
export { useFilterUrlState } from '../features/list-view/filters/useFilterUrlState.js';
export { usePreferencesSync } from '../features/list-view/prefs/usePreferencesSync.js';
export { useColumnPrefs } from '../features/list-view/prefs/useColumnPrefs.js';
export { resolveColumnOrder } from '../features/list-view/columns/resolveColumnOrder.js';
export { CollectionListViewClient } from '../features/list-view/CollectionListViewClient.js';
/* Filter chip bar */ export { FilterBar } from '../features/list-view/filters/FilterBar.js';
export { FilterChip } from '../features/list-view/filters/FilterChip.js';
export { FilterChipEditor } from '../features/list-view/filters/FilterChipEditor.js';
export { FilterValueInput } from '../features/list-view/filters/FilterValueInput.js';
export { AddFilterMenu } from '../features/list-view/filters/AddFilterMenu.js';
export { RelationshipPicker } from '../shared/RelationshipPicker.js';
export { OrGroupWrapper } from '../features/list-view/filters/OrGroupWrapper.js';
export { PresetsMenu } from '../features/list-view/filters/PresetsMenu.js';
export { usePresets, PresetError, PRESET_ERROR } from '../features/list-view/filters/usePresets.js';
/* CSV export */ export { ExportMenu } from '../features/list-view/export/ExportMenu.js';
export { FieldPickerSheet } from '../features/list-view/export/FieldPickerSheet.js';
/* Versions / diff workflow */ export { VersionsList } from '../features/doc-form/versions/VersionsList.js';
export { SelectComparison } from '../features/doc-form/versions/SelectComparison.js';
export { SelectLocales } from '../features/doc-form/versions/SelectLocales.js';
export { RestoreVersion } from '../features/doc-form/versions/RestoreVersion.js';
/* Bulk-edit */ export { BulkEditSheet } from '../features/list-view/bulk/BulkEditSheet.js';
export { BulkEditFieldInput, isBulkEditable } from '../features/list-view/bulk/BulkEditFieldInput.js';
/* Doc-form extension surface. `FieldInputProps` is the prop shape every
   `custom['plugin-shadcn-admin'].input` override receives (leaf and, since
   v3.19, group/tabs). `useActiveLocale` lets an override read the bridge's
   active locale to slice individually-localized subfield values. */ export { FieldInput, SearchableSelect } from '../features/doc-form/inputs/FieldInput.js';
export { UploadFieldInput } from '../features/doc-form/inputs/UploadFieldInput.js';
/* Doc-form access for `.input` overrides. These hooks (and the active-locale /
   doc-identity hooks) now live in `payload-plugin-shadcn-ui` so consumer
   plugins can author overrides without taking a runtime dep on the admin
   replacement. The admin bridge mounts the corresponding Providers. */ export { useActiveLocale, useDocFormFieldValue, useDocFormSetValue, useDocFormValues, useDocIdentity } from 'payload-plugin-shadcn-ui';
