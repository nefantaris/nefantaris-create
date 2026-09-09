import { readFileSync, writeFileSync } from "node:fs";
import { CreateNefantarisError } from "./CreateNefantarisError.js";

export const readJsonFile = (path: string): unknown => {
    try {
        return JSON.parse(readFileSync(path, "utf8"));
    } catch {
        throw new CreateNefantarisError(`Could not read ${path} as JSON`);
    }
};

export const writeJsonFile = (path: string, value: unknown): void => {
    writeFileSync(path, `${JSON.stringify(value, null, 4)}\n`);
};
