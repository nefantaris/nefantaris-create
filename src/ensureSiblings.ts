import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { isRecord } from "./isRecord.js";
import { runCommand } from "./run.js";

export const ensureSibling = async (
    name: string,
    parentDir: string,
    cloneUrl: string
): Promise<string> => {
    const destination = join(parentDir, name);
    if (existsSync(destination)) {
        console.log(`Using existing ${destination}`);
        return destination;
    }
    const exitCode = await runCommand(
        "git",
        ["clone", "--depth", "1", cloneUrl, destination],
        process.cwd()
    );
    if (exitCode !== 0) {
        throw new CreateNefantarisError(
            `Could not clone ${cloneUrl} into ${destination}`
        );
    }
    return destination;
};

const parseManifest = (manifestPath: string): unknown => {
    try {
        return JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
        throw new CreateNefantarisError(
            `Could not read ${manifestPath} as JSON`
        );
    }
};

export const readThemeRequires = (themeDir: string): string[] => {
    const manifestPath = join(themeDir, "theme.json");
    if (!existsSync(manifestPath)) {
        return [];
    }
    const manifest = parseManifest(manifestPath);
    if (!isRecord(manifest) || !Array.isArray(manifest.requires)) {
        return [];
    }
    return manifest.requires.filter(
        (entry): entry is string => typeof entry === "string"
    );
};
