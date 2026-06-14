'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { usePathname } from 'next/navigation';
const STORAGE_KEY = 'shadcn-admin-ui-theme';
const Context = /*#__PURE__*/ React.createContext(null);
function readStored() {
    if (typeof window === 'undefined') return 'minimal';
    return window.localStorage.getItem(STORAGE_KEY) === 'vibrant' ? 'vibrant' : 'minimal';
}
export function UiFlavorProvider({ children }) {
    const [flavor, setFlavorState] = React.useState(readStored);
    const pathname = usePathname();
    // Re-apply on flavor change AND after navigation (pathname dep) — a soft nav
    // re-renders <html> and drops our attribute, so we restore it each time.
    React.useEffect(()=>{
        document.documentElement.dataset.uiTheme = flavor;
    }, [
        flavor,
        pathname
    ]);
    const setFlavor = React.useCallback((next)=>{
        setFlavorState(next);
        try {
            window.localStorage.setItem(STORAGE_KEY, next);
        } catch  {
        /* private mode / storage disabled — keep in-memory only */ }
    }, []);
    const value = React.useMemo(()=>({
            flavor,
            setFlavor
        }), [
        flavor,
        setFlavor
    ]);
    return /*#__PURE__*/ _jsx(Context.Provider, {
        value: value,
        children: children
    });
}
export function useUiFlavor() {
    const ctx = React.useContext(Context);
    if (!ctx) {
        throw new Error('useUiFlavor must be used within a UiFlavorProvider');
    }
    return ctx;
}
