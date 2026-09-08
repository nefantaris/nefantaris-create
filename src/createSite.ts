import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { ensureSibling, readThemeRequires } from "./ensureSiblings.js";
import { linkLocalCore } from "./linkLocalCore.js";
import { type CreateOptions, usage } from "./parseArgs.js";
import { promptSiteDir, promptTheme } from "./prompts.js";
import { resolveCore } from "./resolveCore.js";
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

const installDependencies = async (
    siteDir: string,
    siteDirArg: string
): Promise<boolean> => {
    let exitCode: number;
    try {
        exitCode = await runCommand(
            "npm",
            ["install", "--no-audit", "--no-fund"],
            siteDir
        );
    } catch {
        exitCode = 1;
    }
    if (exitCode === 0) {
        return true;
    }
    console.error(
        `npm install failed in ${siteDirArg} — run it yourself, then "npm run dev".`
    );
    return false;
};

const quoteIfWhitespace = (value: string): string =>
    /\s/.test(value) ? `"${value}"` : value;

const printNextSteps = (
    siteDirArg: string,
    themeName: string,
    hasInstalledDependencies: boolean
): void => {
    console.log(`Created ${siteDirArg} (${themeName}).`);
    console.log("");
    console.log("Next steps:");
    console.log(`    cd ${quoteIfWhitespace(siteDirArg)}`);
    if (!hasInstalledDependencies) {
        console.log("    npm install");
    }
    console.log("    npm run dev");
    console.log("");
    console.log("npm run build writes the deployable site to dist/.");
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
    console.log(`Using Nefantaris core: ${core.describe}`);
    const theme = await materializeTheme(choice, parentDir, siteDir);
    for (const pluginName of readThemeRequires(theme.themeDir)) {
        await ensureSibling(
            pluginName,
            parentDir,
            `${options.cloneBase}/${pluginName}`
        );
    }
    const initExitCode = await runCommand(
        core.command,
        [...core.args, "init", siteDir, "--theme", theme.themeSource],
        process.cwd(),
        ["ignore", "ignore", "inherit"]
    );
    if (initExitCode !== 0) {
        process.exit(initExitCode);
    }
    if (core.how !== "registry") {
        linkLocalCore(siteDir, core.coreDir);
    }
    await gitInitSite(siteDir, parentDir);
    const hasInstalledDependencies = options.skipInstall
        ? false
        : await installDependencies(siteDir, siteDirArg);
    printNextSteps(siteDirArg, theme.themeName, hasInstalledDependencies);
};
