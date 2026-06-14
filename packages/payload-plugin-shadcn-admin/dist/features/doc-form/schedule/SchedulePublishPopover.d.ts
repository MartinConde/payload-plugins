import * as React from 'react';
import type { ExtractedLocale } from '../localization/LocaleSwitcher.js';
export type SchedulePublishPopoverProps = {
    /** Set for collection docs. */
    collectionSlug?: string;
    /** Set for global (singleton) docs. */
    globalSlug?: string;
    docId?: string | number;
    isGlobal: boolean;
    locales?: ExtractedLocale[];
    /** Time-picker hints from `versions.drafts.schedulePublish`. */
    timeIntervals?: number;
    disabled?: boolean;
};
export declare function SchedulePublishPopover({ collectionSlug, globalSlug, docId, isGlobal, locales, timeIntervals, disabled, }: SchedulePublishPopoverProps): React.ReactElement;
