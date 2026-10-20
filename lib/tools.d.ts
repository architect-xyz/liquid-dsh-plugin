import type { LiquidClient } from './client.ts';
type Json = string | number | boolean | null | Json[] | {
    [key: string]: Json;
};
type Row = Record<string, Json>;
/** Case-insensitive substring match against one field. */
export declare function filterRows(rows: Row[], field: string, needle: string | undefined, limit: number | undefined): Row[];
export declare function createTools(client: LiquidClient): import("@deepseek-ai/dsh-tools").ToolDefinition[];
export {};
