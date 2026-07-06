import * as React from 'react';
import type { AutoField } from './autoColumns.js';
export declare const renderCellForField: (field: AutoField, value: unknown, context: {
    isUseAsTitle: boolean;
    useAsTitleBySlug?: Record<string, string | undefined>;
}) => React.ReactNode;
