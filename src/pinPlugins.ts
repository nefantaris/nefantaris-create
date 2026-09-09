import { join } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { isRecord } from "./isRecord.js";
import { readJsonFile, writeJsonFile } from "./jsonFile.js";
import { resolvePinnedVersion } from "./pinnedVersion.js";
import { repositoryUrl } from "./repositoryUrl.js";

type PinnedPlugin = { name: string; source: string; version: string };

const pinPlugin = async (
    name: string,
    cloneBase: string
): Promise<PinnedPlugin> => {
    const source = repositoryUrl(cloneBase, name);
    const version = await resolvePinnedVersion(`plugin "${name}" at`, source);
    console.log(`Pinned plugin ${name} to ${source} at ${version}`);
    return { name, source, version };
};

export const pinNamedPlugins = async (
    siteDir: string,
    cloneBase: string
): Promise<void> => {
    const configPath = join(siteDir, "nefantaris.json");
    const config = readJsonFile(configPath);
    if (!isRecord(config) || !Array.isArray(config.plugins)) {
        throw new CreateNefantarisError(
            `${configPath} does not contain a "plugins" array`
        );
    }
    const entries: unknown[] = config.plugins;
    const names = entries.filter((entry) => typeof entry === "string");
    if (names.length === 0) {
        return;
    }
    const plugins: unknown[] = [];
    for (const entry of entries) {
        plugins.push(
            typeof entry === "string"
                ? await pinPlugin(entry, cloneBase)
                : entry
        );
    }
    writeJsonFile(configPath, { ...config, plugins });
};
