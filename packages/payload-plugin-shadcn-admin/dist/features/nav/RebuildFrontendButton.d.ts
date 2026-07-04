import * as React from 'react';
export type RebuildFrontendButtonProps = {
    /** Consumer override label. When absent the translation key is used. */
    label?: string;
    endpointPath: string;
};
export declare function RebuildFrontendButton({ label: labelProp, endpointPath, }: RebuildFrontendButtonProps): React.JSX.Element;
