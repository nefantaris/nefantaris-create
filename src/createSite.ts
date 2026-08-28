import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { ensureSibling, readThemeRequires } from "./ensureSiblings.js";
import { type CreateOptions, usage } from "./parseArgs.js";
import { promptSiteDir, promptTheme } from "./prompts.js";
import { resolveCore, type ResolvedCore } from "./resolveCore.js";
import { runCommand } from "./run.js";
import { classifyTheme, type ThemeChoice } from "./themeChoice.js";

const defaultThemeName = "nefantaris-theme-base";

type MaterializedTheme = {
    themeDir: string;
    themeSource: string;
    themeName: string;
};

const resolveSiteDirArg = async (
    siteDirArg: string | undefined,
    isInteractive: boolean
): Promise<string> => {
    if (siteDirArg !== undefined) {
        return siteDirArg;
    }
    if (isInteractive) {
        return promptSiteDir();
    }
    throw new CreateNefantarisError(usage);
};

const resolveThemeArg = async (
    themeArg: string | undefined,
    isInteractive: boolean
): Promise<string> => {
    if (themeArg !== undefined) {
        return themeArg;
    }
    if (isInteractive) {
        return promptTheme();
    }
    return defaultThemeName;
};

const assertGitAvailable = async (): Promise<void> => {
    const gitMissing = new CreateNefantarisError(
        "git is required to create a Nefantaris site — install it from https://git-scm.com"
    );
    let exitCode: number;
    try {
        exitCode = await runCommand(
            "git",
            ["--version"],
            process.cwd(),
            "ignore"
        );
    } catch {
        throw gitMissing;
    }
    if (exitCode !== 0) {
        throw gitMissing;
    }
};

const materializeTheme = async (
    choice: ThemeChoice,
    parentDir: string,
    siteDir: string
): Promise<MaterializedTheme> => {
    if (choice.kind === "localPath") {
        return {
            themeDir: choice.themeDir,
            themeSource: relative(siteDir, choice.themeDir),
            themeName: basename(choice.themeDir),
        };
    }
    const themeDir = await ensureSibling(
        choice.name,
        parentDir,
        choice.cloneUrl
    );
    return {
        themeDir,
        themeSource: `../${choice.name}`,
        themeName: choice.name,
    };
};

const gitInitSite = async (
    siteDir: string,
    parentDir: string
): Promise<void> => {
    const isInsideRepository =
        (await runCommand(
            "git",
            ["rev-parse", "--git-dir"],
            parentDir,
            "ignore"
        )) === 0;
    if (isInsideRepository) {
        console.log(
            `Skipped "git init" — ${parentDir} is already inside a git repository`
        );
        return;
    }
    const exitCode = await runCommand("git", ["init"], siteDir);
    if (exitCode !== 0) {
        throw new CreateNefantarisError(`"git init" failed in ${siteDir}`);
    }
};

const printNextSteps = (
    siteDirArg: string,
    themeName: string,
    core: ResolvedCore
): void => {
    console.log(`Created ${siteDirArg} (${themeName}).`);
    console.log("");
    console.log("Next steps:");
    console.log(`    cd ${siteDirArg}`);
    console.log(`    node ${core.binPath} dev .`);
    console.log("");
    console.log(
        "Nefantaris core is not published to npm yet, so the dev command runs a local checkout directly; once core is published this becomes a plain npx command."
    );
};

export const createSite = async (options: CreateOptions): Promise<void> => {
    const isInteractive =
        Boolean(process.stdin.isTTY) &&
        Boolean(process.stdout.isTTY) &&
        !options.skipPrompts;
    const siteDirArg = await resolveSiteDirArg(
        options.siteDirArg,
        isInteractive
    );
    const siteDir = resolve(process.cwd(), siteDirArg);
    const parentDir = dirname(siteDir);
    if (existsSync(siteDir) && readdirSync(siteDir).length > 0) {
        throw new CreateNefantarisError(
            `${siteDir} already exists and is not empty`
        );
    }
    const themeArg = await resolveThemeArg(options.themeArg, isInteractive);
    const choice = classifyTheme(themeArg, options.cloneBase);
    await assertGitAvailable();
    const core = resolveCore(parentDir);
    console.log(`Using Nefantaris core at ${core.coreDir}`);
    const theme = await materializeTheme(choice, parentDir, siteDir);
    for (const pluginName of readThemeRequires(theme.themeDir)) {
        await ensureSibling(
            pluginName,
            parentDir,
            `${options.cloneBase}/${pluginName}`
        );
    }
    const initExitCode = await runCommand(
        process.execPath,
        [core.binPath, "init", siteDir, "--theme", theme.themeSource],
        process.cwd()
    );
    if (initExitCode !== 0) {
        process.exit(initExitCode);
    }
    await gitInitSite(siteDir, parentDir);
    printNextSteps(siteDirArg, theme.themeName, core);
};
