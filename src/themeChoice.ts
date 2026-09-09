import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { firstPartyThemes } from "./firstPartyThemes.js";
import { isGitUrl, repositoryUrl } from "./repositoryUrl.js";

export type ThemeChoice =
    | { kind: "git"; name: string; url: string }
    | { kind: "localPath"; themeDir: string };

const isLocalPath = (themeArg: string): boolean =>
    themeArg.startsWith("/") ||
    themeArg.startsWith("./") ||
    themeArg.startsWith("../") ||
    themeArg.startsWith("~");

const repositoryName = (url: string): string => {
    const base = basename(url.replace(/\/+$/, ""));
    return base.endsWith(".git") ? base.slice(0, -".git".length) : base;
};

const expandLocalPath = (themeArg: string): string => {
    if (themeArg === "~") {
        return homedir();
    }
    if (themeArg.startsWith("~/")) {
        return resolve(homedir(), themeArg.slice(2));
    }
    return resolve(themeArg);
};

export const classifyTheme = (
    themeArg: string,
    cloneBase: string
): ThemeChoice => {
    if (isGitUrl(themeArg)) {
        return { kind: "git", name: repositoryName(themeArg), url: themeArg };
    }
    if (isLocalPath(themeArg)) {
        return { kind: "localPath", themeDir: expandLocalPath(themeArg) };
    }
    if (firstPartyThemes.some((theme) => theme.name === themeArg)) {
        return {
            kind: "git",
            name: themeArg,
            url: repositoryUrl(cloneBase, themeArg),
        };
    }
    const validNames = firstPartyThemes.map((theme) => theme.name).join(", ");
    throw new CreateNefantarisError(
        `Unknown theme "${themeArg}". First-party themes: ${validNames}. Pass a git URL or a local path to use another theme.`
    );
};
