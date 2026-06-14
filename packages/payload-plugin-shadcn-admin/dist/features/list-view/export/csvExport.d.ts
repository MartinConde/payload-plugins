import type { FieldMeta } from '../columns/fieldPicker.js';
export declare const csvEscape: (value: string) => string;
export declare const coerceCellValue: (_field: FieldMeta | undefined, raw: unknown) => string;
export declare const rowsToCsv: (headers: string[], rows: string[][]) => string;
export declare const downloadCsv: (filename: string, text: string) => void;
