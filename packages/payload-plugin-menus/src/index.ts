export { menusPlugin } from './plugin.js'
export type { MenusPluginConfig, MenuUrlResolver } from './types.js'

// Node-safe menu-tree model + pure helpers, shared with the frontend.
export {
  normalizeMenuItem,
  normalizeMenuTree,
  stripResolved,
  mapMenuTree,
  newMenuItem,
  type MenuItem,
  type MenuItemLinkType,
  type MenuItemDocRef,
  type MenuItemResolved,
  type MenuTree,
} from './menuTree.js'
