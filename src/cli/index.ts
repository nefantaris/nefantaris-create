#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { CreateNefantarisError } from "../CreateNefantarisError.js";
import { createSite } from "../createSite.js";
import { isRecord } from "../isRecord.js";
import { parseArgs, usage } from "../parseArgs.js";

const readOwnVersion = (): string => {
    const manifestUrl = new URL("../../package.json", import.meta.url);
    const manifest: unknown = JSON.parse(readFileSync(manifestUrl, "utf8"));
    return isRecord(manifest) && typeof manifest.version === "string"
        ? manifest.version
        : "unknown";
};

const parsed = parseArgs(process.argv.slice(2));

try {
    if (parsed.kind === "help") {
        console.log(usage);
    } else if (parsed.kind === "version") {
        console.log(readOwnVersion());
    } else if (parsed.kind === "usage") {
        console.error(usage);
        process.exit(1);
    } else {
        await createSite(parsed);
    }
} catch (error) {
    if (error instanceof CreateNefantarisError) {
        console.error(error.message);
        process.exit(1);
    }
    throw error;
}
