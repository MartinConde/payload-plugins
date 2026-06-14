'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from 'react';
import { Moon, Palette, Sun } from 'lucide-react';
import { DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from 'payload-plugin-shadcn-ui';
import { useUiFlavor } from './ThemeProvider.js';
const THEME_COOKIE = 'payload-theme';
function readMode() {
    if (typeof window === 'undefined') return 'light';
    const fromCookie = window.document.cookie.split('; ').find((row)=>row.startsWith(`${THEME_COOKIE}=`))?.split('=')[1];
    if (fromCookie === 'light' || fromCookie === 'dark') return fromCookie;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyMode(mode) {
    const d = new Date();
    d.setTime(d.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `${THEME_COOKIE}=${mode};expires=${d.toUTCString()};path=/`;
    document.documentElement.setAttribute('data-theme', mode);
}
export function ThemeSwitcher() {
    const [mode, setModeState] = React.useState(readMode);
    const setMode = React.useCallback((next)=>{
        setModeState(next);
        applyMode(next);
    }, []);
    const { flavor, setFlavor } = useUiFlavor();
    return /*#__PURE__*/ _jsxs(_Fragment, {
        children: [
            /*#__PURE__*/ _jsxs(DropdownMenuLabel, {
                className: "flex items-center gap-2 text-xs font-normal text-muted-foreground",
                children: [
                    /*#__PURE__*/ _jsx(Sun, {
                        className: "size-3.5"
                    }),
                    "Appearance"
                ]
            }),
            /*#__PURE__*/ _jsxs(DropdownMenuRadioGroup, {
                value: mode,
                onValueChange: (v)=>setMode(v === 'dark' ? 'dark' : 'light'),
                children: [
                    /*#__PURE__*/ _jsxs(DropdownMenuRadioItem, {
                        value: "light",
                        children: [
                            /*#__PURE__*/ _jsx(Sun, {
                                className: "size-4"
                            }),
                            "Light"
                        ]
                    }),
                    /*#__PURE__*/ _jsxs(DropdownMenuRadioItem, {
                        value: "dark",
                        children: [
                            /*#__PURE__*/ _jsx(Moon, {
                                className: "size-4"
                            }),
                            "Dark"
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ _jsxs(DropdownMenuLabel, {
                className: "flex items-center gap-2 text-xs font-normal text-muted-foreground",
                children: [
                    /*#__PURE__*/ _jsx(Palette, {
                        className: "size-3.5"
                    }),
                    "Theme"
                ]
            }),
            /*#__PURE__*/ _jsxs(DropdownMenuRadioGroup, {
                value: flavor,
                onValueChange: (v)=>setFlavor(v === 'vibrant' ? 'vibrant' : 'minimal'),
                children: [
                    /*#__PURE__*/ _jsx(DropdownMenuRadioItem, {
                        value: "minimal",
                        children: "Minimal"
                    }),
                    /*#__PURE__*/ _jsx(DropdownMenuRadioItem, {
                        value: "vibrant",
                        children: "Vibrant"
                    })
                ]
            })
        ]
    });
}
