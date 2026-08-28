import { readFile } from "node:fs/promises";
import { isRecord } from "../src/isRecord.js";

export const readJsonObject = async (
    path: string
): Promise<Record<string, unknown>> => {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    if (!isRecord(parsed)) {
        throw new Error(`${path} does not contain a JSON object`);
    }
    return parsed;
};

export const readRecordField = (
    record: Record<string, unknown>,
    key: string
): Record<string, unknown> => {
    const value = record[key];
    if (!isRecord(value)) {
        throw new Error(`"${key}" is not a JSON object`);
    }
    return value;
};
