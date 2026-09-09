export const defaultCloneBase = "https://github.com/nefantaris";

export const usage = [
    "Usage:",
    "    npx create-nef [siteDir] [options]",
    "    npx create-nefantaris [siteDir] [options]",
    "",
    "Options:",
    "    --theme <name|git-url|path>   Theme to install (default: nefantaris-theme-base)",
    "    --theme-version <ref>         Tag or commit to pin a git theme at (default: its newest",
    "                                  release tag, or its latest commit when it has no tags)",
    "    --yes                         Skip all questions and use defaults",
    "    --no-install                  Skip running npm install in the new site",
    "    --clone-base <url-or-path>    Where first-party themes and plugins are fetched from",
    "                                  (default: https://github.com/nefantaris)",
    "    --help                        Show this message",
    "    --version                     Print the version",
].join("\n");

export type CreateOptions = {
    kind: "create";
    siteDirArg: string | undefined;
    themeArg: string | undefined;
    themeVersionArg: string | undefined;
    cloneBase: string;
    skipPrompts: boolean;
    skipInstall: boolean;
};

export type ParsedArgs =
    { kind: "help" } | { kind: "version" } | { kind: "usage" } | CreateOptions;

const valueFlags = ["--theme", "--theme-version", "--clone-base"] as const;
const switchFlags = ["--yes", "--no-install"] as const;

type ValueFlag = (typeof valueFlags)[number];
type SwitchFlag = (typeof switchFlags)[number];

const isValueFlag = (arg: string): arg is ValueFlag =>
    (valueFlags as readonly string[]).includes(arg);

const isSwitchFlag = (arg: string): arg is SwitchFlag =>
    (switchFlags as readonly string[]).includes(arg);

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
    const values: Partial<Record<ValueFlag, string>> = {};
    const switches = new Set<SwitchFlag>();
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--help") {
            return { kind: "help" };
        }
        if (arg === "--version") {
            return { kind: "version" };
        }
        if (isSwitchFlag(arg)) {
            if (switches.has(arg)) {
                return { kind: "usage" };
            }
            switches.add(arg);
        } else if (isValueFlag(arg)) {
            const value = readFlagValue(argv, index, values[arg]);
            if (value === undefined) {
                return { kind: "usage" };
            }
            values[arg] = value;
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
        themeArg: values["--theme"],
        themeVersionArg: values["--theme-version"],
        cloneBase: values["--clone-base"] ?? defaultCloneBase,
        skipPrompts: switches.has("--yes"),
        skipInstall: switches.has("--no-install"),
    };
};
