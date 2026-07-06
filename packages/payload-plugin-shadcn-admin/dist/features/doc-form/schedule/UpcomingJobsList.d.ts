import * as React from 'react';
import type { UpcomingJob } from './SchedulePublishPopover.js';
export declare function UpcomingJobsList({ upcoming, processing, onCancel, }: {
    upcoming: UpcomingJob[] | null;
    processing: boolean;
    onCancel: (jobId: number | string) => void;
}): React.ReactElement;
