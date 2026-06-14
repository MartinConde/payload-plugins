import * as React from 'react';
import type { GroupableField } from '../columns/groupable.js';
export declare function GroupByMenu({ fields, current, }: {
    fields: GroupableField[];
    /** Active groupBy field name (server-parsed), or null when not grouped. */
    current: string | null;
}): React.ReactElement | null;
