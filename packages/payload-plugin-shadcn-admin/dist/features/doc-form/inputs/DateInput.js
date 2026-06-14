'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* shadcn date picker (Popover + Calendar) replacing the native
   <input type=date>. Value contract matches the rest of the doc form: reads
   an ISO string (or Date) and emits an ISO string, or null when cleared.
   When `withTime` is set (datetime fields whose displayFormat includes a time
   token) a <input type=time> sits below the calendar — shadcn ships no time
   primitive, so a styled native time input is the simplest correct control. */ import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from '../../../internal/payloadAdapter.js';
import { Button } from 'payload-plugin-shadcn-ui';
import { Calendar } from 'payload-plugin-shadcn-ui';
import { Input } from 'payload-plugin-shadcn-ui';
import { Popover, PopoverContent, PopoverTrigger } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
function toDate(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' && value) {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}
/* Local "HH:mm" for the time input — built from local hours/minutes so it
   round-trips with what the user sees in the formatted trigger. */ function toTimeString(d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}
export function DateInput({ id, value, onChange, withTime, invalid, disabled }) {
    const { t } = useTranslation();
    const [open, setOpen] = React.useState(false);
    const selected = toDate(value);
    const label = selected ? selected.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...withTime ? {
            hour: '2-digit',
            minute: '2-digit'
        } : {}
    }) : null;
    const emit = (d)=>onChange(d ? d.toISOString() : null);
    const handleDaySelect = (day)=>{
        if (!day) {
            emit(null);
            return;
        }
        const next = new Date(day);
        if (withTime) {
            // Preserve the existing time-of-day; default new picks to midnight.
            const base = selected ?? new Date(0);
            next.setHours(base.getHours(), base.getMinutes(), 0, 0);
        } else {
            next.setHours(0, 0, 0, 0);
        }
        emit(next);
        if (!withTime) setOpen(false);
    };
    const handleTimeChange = (raw)=>{
        if (!raw) return;
        const [h, m] = raw.split(':').map((n)=>Number(n));
        const base = selected ? new Date(selected) : new Date();
        base.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
        emit(base);
    };
    return /*#__PURE__*/ _jsxs(Popover, {
        open: open,
        onOpenChange: setOpen,
        children: [
            /*#__PURE__*/ _jsx(PopoverTrigger, {
                asChild: true,
                children: /*#__PURE__*/ _jsxs(Button, {
                    id: id,
                    type: "button",
                    variant: "outline",
                    disabled: disabled,
                    "aria-invalid": invalid ? true : undefined,
                    className: cn('w-full justify-start text-left font-normal', !selected && 'text-muted-foreground', 'aria-invalid:border-destructive aria-invalid:ring-destructive/40'),
                    children: [
                        /*#__PURE__*/ _jsx(CalendarIcon, {
                            className: "size-4"
                        }),
                        label ?? /*#__PURE__*/ _jsx("span", {
                            children: withTime ? t('shadcnAdmin:pickDateTime') : `${t('shadcnAdmin:pickDate')}…`
                        })
                    ]
                })
            }),
            /*#__PURE__*/ _jsxs(PopoverContent, {
                className: "w-auto p-0",
                align: "start",
                children: [
                    /*#__PURE__*/ _jsx(Calendar, {
                        mode: "single",
                        selected: selected ?? undefined,
                        onSelect: handleDaySelect,
                        autoFocus: true
                    }),
                    withTime && /*#__PURE__*/ _jsxs("div", {
                        className: "flex items-center gap-2 border-t p-3",
                        children: [
                            /*#__PURE__*/ _jsx("span", {
                                className: "text-sm text-muted-foreground",
                                children: "Time"
                            }),
                            /*#__PURE__*/ _jsx(Input, {
                                type: "time",
                                className: "h-9 w-auto",
                                value: selected ? toTimeString(selected) : '',
                                onChange: (e)=>handleTimeChange(e.target.value),
                                disabled: disabled
                            })
                        ]
                    })
                ]
            })
        ]
    });
}
