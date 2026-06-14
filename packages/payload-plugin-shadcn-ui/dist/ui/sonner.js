'use client';
import { jsx as _jsx } from "react/jsx-runtime";
/* Shadcn-styled sonner Toaster. Pairs with two things to work correctly under
   Turbopack:

   1. `next.config.ts` aliases `sonner` to a single resolved path
      (`turbopack.resolveAlias.sonner`). Without that, Turbopack chunks can
      bundle separate sonner module instances for our chunk vs `@payloadcms/ui`'s
      chunk, splitting the toast queue — `toast()` calls made from Payload's
      internals (form save success, etc.) never reach our `<Toaster />`.
   2. `styles.css` hides `.payload-toast-container` (Payload's own `<Toaster />`)
      so the two mounts don't both render the same toast at the same position.

   With (1) in place, the single global sonner queue routes every `toast()` call
   to OUR Toaster, where sonner's native default styling renders. We then nudge
   the look toward shadcn via `--normal-*` CSS variables and the `classNames`
   map — leaving sonner's animations, stacking, swipe-to-dismiss, and exit
   transitions intact. */ import * as React from 'react';
import { Toaster as Sonner } from 'sonner';
export function Toaster(props) {
    return /*#__PURE__*/ _jsx(Sonner, {
        className: "shadcn-admin-toaster",
        // Map sonner's CSS vars to shadcn tokens so light/dark tracks our theme.
        style: {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
            '--success-bg': 'var(--popover)',
            '--success-text': 'var(--popover-foreground)',
            '--success-border': 'var(--border)',
            '--error-bg': 'var(--popover)',
            '--error-text': 'var(--popover-foreground)',
            '--error-border': 'var(--destructive)',
            '--border-radius': 'var(--radius)',
            fontFamily: 'var(--font-sans)'
        },
        toastOptions: {
            classNames: {
                toast: 'shadcn-admin-toast border border-border bg-popover text-popover-foreground shadow-lg',
                title: 'font-medium text-sm',
                description: 'text-muted-foreground text-sm',
                actionButton: 'bg-primary text-primary-foreground',
                cancelButton: 'bg-muted text-muted-foreground',
                closeButton: 'shadcn-admin-toast-close'
            }
        },
        closeButton: true,
        ...props
    });
}
