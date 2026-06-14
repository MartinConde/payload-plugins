import * as React from 'react';
import type { FieldInputProps } from './adminTypes.js';
/** The override receives the full FieldInputProps; this presentational launcher
   only reads `t`. The hosting group carries no data (a single `ui` child), so
   there's nothing to render or write. */
export declare function SeoWizardLaunch({ t }: FieldInputProps): React.ReactElement;
