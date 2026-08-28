import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { isRecord } from "./isRecord.js";

export type ResolvedCore = {
    binPath: string;
    coreDir: string;
    how: "environment" | "dependency" | "sibling";
};

const coreBinRelativePath = "dist/cli/index.js";

const resolveEnvironmentCore = (): ResolvedCore | undefined => {
    const coreDir = process.env.NEFANTARIS_CORE_DIR;
    if (coreDir === undefined || coreDir === "") {
        return undefined;
    }
    const binPath = join(coreDir, coreBinRelativePath);
    if (!existsSync(binPath)) {
        throw new CreateNefantarisError(
            `NEFANTARIS_CORE_DIR points at ${coreDir} but ${binPath} does not exist — run "npm run build" in that Nefantaris core checkout`
        );
    }
    return { binPath, coreDir, how: "environment" };
};

const readNefBinPath = (manifestPath: string): string | undefined => {
    const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (!isRecord(manifest) || !isRecord(manifest.bin)) {
        return undefined;
    }
    const nefBin = manifest.bin.nef;
    return typeof nefBin === "string" ? nefBin : undefined;
};

const resolveDependencyCore = (): ResolvedCore | undefined => {
    try {
        const requireFromHere = createRequire(import.meta.url);
        const manifestPath = requireFromHere.resolve(
            "@nefantaris/core/package.json"
        );
        const binRelativePath = readNefBinPath(manifestPath);
        if (binRelativePath === undefined) {
            return undefined;
        }
        const coreDir = dirname(manifestPath);
        return {
            binPath: join(coreDir, binRelativePath),
            coreDir,
            how: "dependency",
        };
    } catch {
        return undefined;
    }
};

const resolveSiblingCore = (parentDir: string): ResolvedCore | undefined => {
    const coreDir = join(parentDir, "nefantaris-core");
    const binPath = join(coreDir, coreBinRelativePath);
    if (!existsSync(binPath)) {
        return undefined;
    }
    return { binPath, coreDir, how: "sibling" };
};

export const resolveCore = (parentDir: string): ResolvedCore => {
    const core =
        resolveEnvironmentCore() ??
        resolveDependencyCore() ??
        resolveSiblingCore(parentDir);
    if (core !== undefined) {
        return core;
    }
    throw new CreateNefantarisError(
        [
            "Could not find Nefantaris core. Tried:",
            "    the NEFANTARIS_CORE_DIR environment variable (not set)",
            "    the @nefantaris/core dependency (not installed)",
            `    ${join(parentDir, "nefantaris-core", coreBinRelativePath)} (not found)`,
            'Point NEFANTARIS_CORE_DIR at a built Nefantaris core checkout, or clone nefantaris-core next to the new site and run "npm install && npm run build" inside it.',
        ].join("\n")
    );
};
