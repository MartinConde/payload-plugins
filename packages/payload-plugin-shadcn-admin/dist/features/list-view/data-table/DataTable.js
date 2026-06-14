'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Server-driven DataTable.
   Contract:
   - Controlled (URL-synced upstream): pagination, sorting, columnFilters, search
   - Uncontrolled (ephemeral UI state): columnVisibility, rowSelection
   List views must pass `pageCount` from the server. Pass `rowCount` to show
   "X of Y" totals. Set `pageSize` to the value used in the server query. */ import * as React from 'react';
import { SearchIcon } from 'lucide-react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DataTablePagination } from './DataTablePagination.js';
import { DataTableViewOptions } from './DataTableViewOptions.js';
import { Input } from 'payload-plugin-shadcn-ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'payload-plugin-shadcn-ui';
import { cn } from 'payload-plugin-shadcn-ui';
export const SortableHandleContext = /*#__PURE__*/ React.createContext(null);
function SortableHead({ id, width, children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id
    });
    const style = {
        width,
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : undefined
    };
    const ctx = React.useMemo(()=>({
            attributes,
            listeners,
            isDragging
        }), [
        attributes,
        listeners,
        isDragging
    ]);
    return /*#__PURE__*/ _jsx(TableHead, {
        ref: setNodeRef,
        style: style,
        children: /*#__PURE__*/ _jsx(SortableHandleContext.Provider, {
            value: ctx,
            children: children
        })
    });
}
export function DataTable({ columns, data, pageCount, rowCount, pagination, onPaginationChange, sorting, onSortingChange, columnFilters, onColumnFiltersChange, columnOrder, onColumnOrderChange, columnVisibility: columnVisibilityProp, onColumnVisibilityChange, lockedColumnIds = [
    'select'
], onResetColumns, enableSorting = false, enableFiltering = false, enableColumnVisibility = false, enableColumnReorder = false, enableRowSelection = false, searchValue, onSearchChange, searchPlaceholder = 'Search…', searchDebounceMs = 300, filterColumnId, filterPlaceholder = 'Filter…', toolbarLeft, toolbarRight, filterBar, bulkActions, exportMenu, onRowClick, showSelectedCount, emptyMessage = 'No results.', className }) {
    const [internalVisibility, setInternalVisibility] = React.useState({});
    const columnVisibility = columnVisibilityProp ?? internalVisibility;
    const handleVisibilityChange = onColumnVisibilityChange ?? setInternalVisibility;
    const [rowSelection, setRowSelection] = React.useState({});
    const lockedSet = React.useMemo(()=>new Set(lockedColumnIds), [
        lockedColumnIds
    ]);
    // Local input value so typing stays instant. URL writes are debounced via
    // an effect below; external changes to `searchValue` (back/forward nav)
    // re-seed local state.
    const [localSearch, setLocalSearch] = React.useState(searchValue ?? '');
    React.useEffect(()=>{
        setLocalSearch(searchValue ?? '');
    }, [
        searchValue
    ]);
    React.useEffect(()=>{
        if (onSearchChange === undefined) return;
        if (localSearch === (searchValue ?? '')) return;
        const t = setTimeout(()=>onSearchChange(localSearch), searchDebounceMs);
        return ()=>clearTimeout(t);
    }, [
        localSearch,
        searchValue,
        onSearchChange,
        searchDebounceMs
    ]);
    const table = useReactTable({
        data,
        columns,
        pageCount,
        rowCount,
        state: {
            pagination,
            ...enableSorting && sorting ? {
                sorting
            } : {},
            ...enableFiltering && columnFilters ? {
                columnFilters
            } : {},
            ...columnOrder ? {
                columnOrder
            } : {},
            columnVisibility,
            rowSelection
        },
        onPaginationChange,
        ...enableSorting && onSortingChange ? {
            onSortingChange
        } : {},
        ...enableFiltering && onColumnFiltersChange ? {
            onColumnFiltersChange
        } : {},
        ...onColumnOrderChange ? {
            onColumnOrderChange
        } : {},
        onColumnVisibilityChange: handleVisibilityChange,
        onRowSelectionChange: setRowSelection,
        enableRowSelection,
        enableSorting,
        enableFilters: enableFiltering,
        manualPagination: true,
        manualSorting: enableSorting,
        manualFiltering: enableFiltering,
        getCoreRowModel: getCoreRowModel(),
        getRowId: (row, index)=>{
            const candidate = row?.id;
            return candidate !== undefined ? String(candidate) : String(index);
        }
    });
    const sensors = useSensors(// distance:4 activation lets the inner sort button absorb plain clicks.
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 4
        }
    }), useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates
    }));
    // Stable id prevents the SSR vs client mismatch on dnd-kit's internal
    // `DndDescribedBy-N` counter, which otherwise breaks hydration and event
    // wiring (drag stops working entirely).
    const dndContextId = React.useId();
    const onDragEnd = React.useCallback((event)=>{
        if (!onColumnOrderChange) return;
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const currentOrder = table.getAllLeafColumns().map((c)=>c.id);
        const fromId = String(active.id);
        const toId = String(over.id);
        if (lockedSet.has(fromId) || lockedSet.has(toId)) return;
        const next = [
            ...currentOrder
        ];
        const fromIdx = next.indexOf(fromId);
        const toIdx = next.indexOf(toId);
        if (fromIdx === -1 || toIdx === -1) return;
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, fromId);
        onColumnOrderChange(next);
    }, [
        onColumnOrderChange,
        table,
        lockedSet
    ]);
    const showSearch = onSearchChange !== undefined;
    const showPerColumnFilter = enableFiltering && filterColumnId;
    const showToolbar = showSearch || showPerColumnFilter || toolbarLeft || toolbarRight || enableColumnVisibility || Boolean(exportMenu);
    const filterValue = showPerColumnFilter && filterColumnId ? table.getColumn(filterColumnId)?.getFilterValue() ?? '' : '';
    const selectedCount = table.getSelectedRowModel().rows.length;
    return /*#__PURE__*/ _jsxs("div", {
        className: cn('space-y-4', className),
        children: [
            filterBar !== undefined && filterBar !== null && /*#__PURE__*/ _jsx("div", {
                "data-slot": "data-table-filter-bar",
                children: filterBar
            }),
            showToolbar && /*#__PURE__*/ _jsxs("div", {
                className: "flex items-center gap-2",
                children: [
                    showSearch && /*#__PURE__*/ _jsxs("div", {
                        className: "relative w-full max-w-sm",
                        children: [
                            /*#__PURE__*/ _jsx(SearchIcon, {
                                className: "pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                            }),
                            /*#__PURE__*/ _jsx(Input, {
                                placeholder: searchPlaceholder,
                                value: localSearch,
                                onChange: (event)=>setLocalSearch(event.target.value),
                                className: "h-8 pl-8"
                            })
                        ]
                    }),
                    showPerColumnFilter && /*#__PURE__*/ _jsx(Input, {
                        placeholder: filterPlaceholder,
                        value: filterValue,
                        onChange: (event)=>table.getColumn(filterColumnId)?.setFilterValue(event.target.value),
                        className: "h-8 max-w-sm"
                    }),
                    toolbarLeft,
                    /*#__PURE__*/ _jsxs("div", {
                        className: "ml-auto flex items-center gap-2",
                        children: [
                            toolbarRight,
                            exportMenu ? exportMenu(table) : null,
                            enableColumnVisibility && /*#__PURE__*/ _jsx(DataTableViewOptions, {
                                table: table,
                                onReset: onResetColumns
                            })
                        ]
                    })
                ]
            }),
            bulkActions && selectedCount > 0 && /*#__PURE__*/ _jsxs("div", {
                className: "flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2",
                children: [
                    /*#__PURE__*/ _jsxs("span", {
                        className: "inline-flex items-center gap-2 text-sm font-medium",
                        children: [
                            /*#__PURE__*/ _jsx("span", {
                                className: "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums",
                                children: selectedCount
                            }),
                            "row",
                            selectedCount === 1 ? '' : 's',
                            " selected"
                        ]
                    }),
                    /*#__PURE__*/ _jsx("div", {
                        className: "ml-auto flex items-center gap-2",
                        children: bulkActions(table)
                    })
                ]
            }),
            /*#__PURE__*/ _jsx("div", {
                className: "overflow-hidden rounded-lg border border-border",
                children: /*#__PURE__*/ _jsx(DndContext, {
                    id: dndContextId,
                    sensors: sensors,
                    collisionDetection: closestCenter,
                    modifiers: [
                        restrictToHorizontalAxis
                    ],
                    onDragEnd: onDragEnd,
                    children: /*#__PURE__*/ _jsxs(Table, {
                        children: [
                            /*#__PURE__*/ _jsx(TableHeader, {
                                children: table.getHeaderGroups().map((headerGroup)=>{
                                    const orderableIds = headerGroup.headers.map((h)=>h.column.id).filter((id)=>!lockedSet.has(id));
                                    const renderHead = (header)=>{
                                        const content = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
                                        if (enableColumnReorder && !lockedSet.has(header.column.id)) {
                                            return /*#__PURE__*/ _jsx(SortableHead, {
                                                id: header.column.id,
                                                width: header.getSize(),
                                                children: content
                                            }, header.id);
                                        }
                                        return /*#__PURE__*/ _jsx(TableHead, {
                                            style: {
                                                width: header.getSize()
                                            },
                                            children: content
                                        }, header.id);
                                    };
                                    return /*#__PURE__*/ _jsx(TableRow, {
                                        children: enableColumnReorder ? /*#__PURE__*/ _jsx(SortableContext, {
                                            items: orderableIds,
                                            strategy: horizontalListSortingStrategy,
                                            children: headerGroup.headers.map(renderHead)
                                        }) : headerGroup.headers.map(renderHead)
                                    }, headerGroup.id);
                                })
                            }),
                            /*#__PURE__*/ _jsx(TableBody, {
                                children: table.getRowModel().rows.length ? table.getRowModel().rows.map((row)=>/*#__PURE__*/ _jsx(TableRow, {
                                        "data-state": row.getIsSelected() && 'selected',
                                        className: onRowClick ? 'cursor-pointer' : undefined,
                                        onClick: onRowClick ? ()=>onRowClick(row) : undefined,
                                        children: row.getVisibleCells().map((cell)=>/*#__PURE__*/ _jsx(TableCell, {
                                                children: flexRender(cell.column.columnDef.cell, cell.getContext())
                                            }, cell.id))
                                    }, row.id)) : /*#__PURE__*/ _jsx(TableRow, {
                                    children: /*#__PURE__*/ _jsx(TableCell, {
                                        colSpan: columns.length,
                                        className: "h-24 text-center",
                                        children: emptyMessage
                                    })
                                })
                            })
                        ]
                    })
                })
            }),
            /*#__PURE__*/ _jsx(DataTablePagination, {
                table: table,
                showSelectedCount: showSelectedCount ?? enableRowSelection
            })
        ]
    });
}
