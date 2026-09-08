import { existsSync } from "node:fs";
import { join } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";

export type ResolvedCore = {
    command: string;
    args: string[];
    describe: string;
    how: "environment" | "sibling" | "registry";
};

const coreBinRelativePath = "dist/cli/index.js";
const corePackageSpec = "@nefantaris/core@latest";

const localCore = (
    coreDir: string,
    how: "environment" | "sibling"
): ResolvedCore => ({
    command: process.execPath,
    args: [join(coreDir, coreBinRelativePath)],
    describe: coreDir,
    how,
});

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
    return localCore(coreDir, "environment");
};

const resolveSiblingCore = (parentDir: string): ResolvedCore | undefined => {
    const coreDir = join(parentDir, "nefantaris-core");
    if (!existsSync(join(coreDir, coreBinRelativePath))) {
        return undefined;
    }
    return localCore(coreDir, "sibling");
};

const resolveRegistryCore = (): ResolvedCore => ({
    command: "npx",
    args: ["--yes", `--package=${corePackageSpec}`, "nef"],
    describe: `${corePackageSpec} (fetched from npm)`,
    how: "registry",
});

export const resolveCore = (parentDir: string): ResolvedCore =>
    resolveEnvironmentCore() ??
    resolveSiblingCore(parentDir) ??
    resolveRegistryCore();
