import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { firstPartyThemes } from "./firstPartyThemes.js";

export type ThemeChoice =
    | { kind: "clone"; name: string; cloneUrl: string }
    | { kind: "localPath"; themeDir: string };

const isGitUrl = (themeArg: string): boolean =>
    themeArg.includes("://") || themeArg.startsWith("git@");

const isLocalPath = (themeArg: string): boolean =>
    themeArg.startsWith("/") ||
    themeArg.startsWith("./") ||
    themeArg.startsWith("../") ||
    themeArg.startsWith("~");

const repositoryName = (url: string): string => {
    const base = basename(url);
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
        return {
            kind: "clone",
            name: repositoryName(themeArg),
            cloneUrl: themeArg,
        };
    }
    if (isLocalPath(themeArg)) {
        return { kind: "localPath", themeDir: expandLocalPath(themeArg) };
    }
    if (firstPartyThemes.some((theme) => theme.name === themeArg)) {
        return {
            kind: "clone",
            name: themeArg,
            cloneUrl: `${cloneBase}/${themeArg}`,
        };
    }
    const validNames = firstPartyThemes.map((theme) => theme.name).join(", ");
    throw new CreateNefantarisError(
        `Unknown theme "${themeArg}". First-party themes: ${validNames}. Pass a git URL or a local path to use another theme.`
    );
};
