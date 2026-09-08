export const defaultCloneBase = "https://github.com/nefantaris";

export const usage = [
    "Usage:",
    "    npx create-nef [siteDir] [options]",
    "    npx create-nefantaris [siteDir] [options]",
    "",
    "Options:",
    "    --theme <name|git-url|path>   Theme to install (default: nefantaris-theme-base)",
    "    --yes                         Skip all questions and use defaults",
    "    --no-install                  Skip running npm install in the new site",
    "    --clone-base <url-or-path>    Where first-party repositories are cloned from",
    "                                  (default: https://github.com/nefantaris)",
    "    --help                        Show this message",
    "    --version                     Print the version",
].join("\n");

export type CreateOptions = {
    kind: "create";
    siteDirArg: string | undefined;
    themeArg: string | undefined;
    cloneBase: string;
    skipPrompts: boolean;
    skipInstall: boolean;
};

export type ParsedArgs =
    { kind: "help" } | { kind: "version" } | { kind: "usage" } | CreateOptions;

const readFlagValue = (
    argv: string[],
    index: number,
    previous: string | undefined
): string | undefined => {
    const value = argv[index + 1];
    if (
        previous !== undefined ||
        value === undefined ||
        value.startsWith("-")
    ) {
        return undefined;
    }
    return value;
};

export const parseArgs = (argv: string[]): ParsedArgs => {
    let siteDirArg: string | undefined;
    let themeArg: string | undefined;
    let cloneBase: string | undefined;
    let skipPrompts = false;
    let skipInstall = false;
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--help") {
            return { kind: "help" };
        }
        if (arg === "--version") {
            return { kind: "version" };
        }
        if (arg === "--yes") {
            if (skipPrompts) {
                return { kind: "usage" };
            }
            skipPrompts = true;
        } else if (arg === "--no-install") {
            if (skipInstall) {
                return { kind: "usage" };
            }
            skipInstall = true;
        } else if (arg === "--theme") {
            const value = readFlagValue(argv, index, themeArg);
            if (value === undefined) {
                return { kind: "usage" };
            }
            themeArg = value;
            index += 1;
        } else if (arg === "--clone-base") {
            const value = readFlagValue(argv, index, cloneBase);
            if (value === undefined) {
                return { kind: "usage" };
            }
            cloneBase = value;
            index += 1;
        } else if (arg.startsWith("-")) {
            return { kind: "usage" };
        } else if (siteDirArg === undefined) {
            siteDirArg = arg;
        } else {
            return { kind: "usage" };
        }
    }
    return {
        kind: "create",
        siteDirArg,
        themeArg,
        cloneBase: cloneBase ?? defaultCloneBase,
        skipPrompts,
        skipInstall,
    };
};
