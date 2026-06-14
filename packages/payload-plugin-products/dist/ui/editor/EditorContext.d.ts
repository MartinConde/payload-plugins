import * as React from 'react';
import { type MockupTransform, type PrintAreaPreset, type PrintAreasValue } from '../printArea.js';
import { type CanvasSize } from './fabric/coords.js';
import { type AreaMeta } from './fabric/rect.js';
import { type LoadState, type MediaInfo } from './hooks/useMediaFetch.js';
export type SelectedArea = {
    id: string;
} & AreaMeta;
export type AlignDir = 'left' | 'centerH' | 'right' | 'top' | 'middle' | 'bottom';
export type EditorContextValue = {
    containerRef: React.RefObject<HTMLDivElement | null>;
    canvasElRef: React.RefObject<HTMLCanvasElement | null>;
    loadState: LoadState;
    media: MediaInfo | null;
    selected: SelectedArea | null;
    mockupTransform: MockupTransform;
    /** Current canvas viewport in pixels. Drives the Image tab's px-size inputs
     *  (`renderedWidth = canvasSize.width * mockupTransform.scale`) and the
     *  mockup-alignment math. Mirrors `canvasSizeRef` for use in render. */
    canvasSize: CanvasSize;
    areaCount: number;
    presets: PrintAreaPreset[];
    addArea: (preset: PrintAreaPreset) => void;
    deleteSelected: () => void;
    align: (dir: AlignDir) => void;
    updateSelectedName: (name: string) => void;
    updateSelectedMm: (dim: 'widthMm' | 'heightMm', raw: number) => void;
    setMockupTransform: (next: MockupTransform | ((prev: MockupTransform) => MockupTransform)) => void;
    resetMockupTransform: () => void;
    toggleMockupLock: () => void;
    alignMockup: (dir: AlignDir) => void;
    tr: (key: string) => string;
    disabled: boolean | undefined;
    /** When true, the sidebar's per-area mm inputs are read-only and
     *  `updateSelectedMm` is a no-op. Set by the Designer (Phase 2+) because
     *  physical mm now live on the view, not per-area. The legacy single-mockup
     *  adapter leaves this false so the original UX is preserved. */
    lockPerAreaMm: boolean;
};
export declare const useEditor: () => EditorContextValue;
/** What the Designer (or any other host) hands the editor. Replaces the old
 *  FieldInputProps coupling so the editor can run inside an array row / against
 *  view-indexed sub-fields, not only on a top-level JSON field. */
export type EditorBindings = {
    value: PrintAreasValue;
    onChange: (next: PrintAreasValue) => void;
    media: {
        slug: string;
        fieldPath: string;
    };
    disabled?: boolean;
    /** Phase 2+: physical mm are owned by the view, not per-area. */
    lockPerAreaMm?: boolean;
};
type EditorProviderProps = {
    bindings: EditorBindings;
    children: React.ReactNode;
};
export declare function EditorProvider({ bindings, children }: EditorProviderProps): React.ReactElement;
export {};
