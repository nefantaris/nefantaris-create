import { readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { isRecord } from "./isRecord.js";

const corePackageName = "@nefantaris/core";

const toForwardSlashes = (path: string): string => path.replaceAll("\\", "/");

const parseManifest = (manifestPath: string): unknown => {
    try {
        return JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
        throw new CreateNefantarisError(
            `Could not read ${manifestPath} as JSON`
        );
    }
};

export const linkLocalCore = (siteDir: string, coreDir: string): void => {
    const manifestPath = join(siteDir, "package.json");
    const manifest = parseManifest(manifestPath);
    if (!isRecord(manifest) || !isRecord(manifest.devDependencies)) {
        throw new CreateNefantarisError(
            `${manifestPath} does not contain a "devDependencies" object`
        );
    }
    const corePath = toForwardSlashes(relative(siteDir, coreDir));
    manifest.devDependencies[corePackageName] = `file:${corePath}`;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`);
};
