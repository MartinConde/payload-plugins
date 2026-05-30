'use client'

/* Tabbed sidebar: Print Areas (default) | Image | Sync. */

import * as React from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from 'payload-plugin-shadcn-ui'

import { SyncActionsPanel } from '../designer/SyncActionsPanel.js'
import { useEditor } from './EditorContext.js'
import { ImageTab } from './tabs/ImageTab.js'
import { PrintAreasTab } from './tabs/PrintAreasTab.js'

export function EditorSidebar(): React.ReactElement {
  const { tr } = useEditor()
  return (
    <Tabs defaultValue="areas" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="areas">{tr('pluginProducts:printAreasTab')}</TabsTrigger>
        <TabsTrigger value="image">{tr('pluginProducts:imageTab')}</TabsTrigger>
        <TabsTrigger value="sync">{tr('pluginProducts:syncTab')}</TabsTrigger>
      </TabsList>
      <TabsContent value="areas">
        <PrintAreasTab />
      </TabsContent>
      <TabsContent value="image">
        <ImageTab />
      </TabsContent>
      <TabsContent value="sync">
        <SyncActionsPanel />
      </TabsContent>
    </Tabs>
  )
}
