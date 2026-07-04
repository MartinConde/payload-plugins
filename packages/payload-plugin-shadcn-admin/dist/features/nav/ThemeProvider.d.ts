import * as React from 'react';
export type UiFlavor = 'minimal' | 'vibrant';
type FlavorContext = {
    flavor: UiFlavor;
    setFlavor: (flavor: UiFlavor) => void;
};
export declare function UiFlavorProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
export declare function useUiFlavor(): FlavorContext;
export {};
