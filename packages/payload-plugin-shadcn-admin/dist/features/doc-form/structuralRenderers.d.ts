import * as React from 'react';
import type { ExtractedField } from 'payload-plugin-shadcn-ui';
import { type Perms } from './access-control/fieldPermissions.js';
export type RenderChild = (child: ExtractedField, pathPrefix: string, parentPerms?: Perms) => React.ReactNode;
export declare function GroupSection({ field, pathPrefix, parentPerms, renderChild, }: {
    field: ExtractedField;
    /** The prefix already includes the group's own name (e.g. `myGroup.`). */
    pathPrefix: string;
    /** The PARENT's perms map — the group's own perms are derived inside. */
    parentPerms?: Perms;
    renderChild: RenderChild;
}): React.ReactElement | null;
export declare function TabsSection({ field, pathPrefix, parentPerms, renderChild, }: {
    field: ExtractedField;
    /** Prefix at the field-level (the tabs container has no name).
     *  Each named tab adds its own segment via renderChild. */
    pathPrefix: string;
    parentPerms?: Perms;
    renderChild: RenderChild;
}): React.ReactElement | null;
