import * as React from 'react';
export declare function OpenPanelAnalyticsWidget({ apiUrl, clientId, clientSecret, description, labels, projectId, title, }: {
    apiUrl: string;
    clientId: string;
    clientSecret: string;
    description: string;
    labels: {
        avgSessionDuration: string;
        bounceRate: string;
        pageviews: string;
        visitors: string;
    };
    projectId: string;
    title: string;
}): Promise<React.ReactElement | null>;
