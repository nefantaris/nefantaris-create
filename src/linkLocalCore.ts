import { join, relative } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { isRecord } from "./isRecord.js";
import { readJsonFile, writeJsonFile } from "./jsonFile.js";

const corePackageName = "@nefantaris/core";

const toForwardSlashes = (path: string): string => path.replaceAll("\\", "/");

export const linkLocalCore = (siteDir: string, coreDir: string): void => {
    const manifestPath = join(siteDir, "package.json");
    const manifest = readJsonFile(manifestPath);
    if (!isRecord(manifest) || !isRecord(manifest.devDependencies)) {
        throw new CreateNefantarisError(
            `${manifestPath} does not contain a "devDependencies" object`
        );
    }
    const corePath = toForwardSlashes(relative(siteDir, coreDir));
    manifest.devDependencies[corePackageName] = `file:${corePath}`;
    writeJsonFile(manifestPath, manifest);
};
