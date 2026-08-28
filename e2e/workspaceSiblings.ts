import { cp } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    ".."
);
export const workspaceRoot = resolve(packageRoot, "..");
export const builtCliPath = join(packageRoot, "dist/cli/index.js");
export const workspaceCoreDir = join(workspaceRoot, "nefantaris-core");
export const coreBinPath = join(workspaceCoreDir, "dist/cli/index.js");

const excludedNames = new Set([".git", ".nefantaris", "node_modules", "dist"]);

export const copyTreeWithoutArtifacts = async (
    source: string,
    destination: string
): Promise<void> => {
    await cp(source, destination, {
        recursive: true,
        filter: (sourcePath) => !excludedNames.has(basename(sourcePath)),
    });
};

export const copyWorkspaceSibling = async (
    name: string,
    destinationParent: string
): Promise<string> => {
    const destination = join(destinationParent, name);
    await copyTreeWithoutArtifacts(join(workspaceRoot, name), destination);
    return destination;
};
