import { existsSync, readdirSync, rmSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";
import { linkLocalCore } from "./linkLocalCore.js";
import { type CreateOptions, usage } from "./parseArgs.js";
import { pinNamedPlugins } from "./pinPlugins.js";
import { resolvePinnedVersion } from "./pinnedVersion.js";
import { promptSiteDir, promptTheme } from "./prompts.js";
import { resolveCore } from "./resolveCore.js";
import { runCommand } from "./run.js";
import { classifyTheme, type ThemeChoice } from "./themeChoice.js";

const defaultThemeName = "nefantaris-theme-base";

type ThemeSelection = {
    themeName: string;
    initArgs: string[];
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

const selectTheme = async (
    choice: ThemeChoice,
    siteDir: string,
    themeVersionArg: string | undefined
): Promise<ThemeSelection> => {
    if (choice.kind === "localPath") {
        if (themeVersionArg !== undefined) {
            throw new CreateNefantarisError(
                "--theme-version pins a git theme — pass a git URL or a first-party theme name in --theme, or drop --theme-version to use the local path as it is"
            );
        }
        return {
            themeName: basename(choice.themeDir),
            initArgs: ["--theme", relative(siteDir, choice.themeDir)],
        };
    }
    const version =
        themeVersionArg ?? (await resolvePinnedVersion("theme", choice.url));
    console.log(`Pinned theme ${choice.name} to ${choice.url} at ${version}`);
    return {
        themeName: choice.name,
        initArgs: ["--theme", choice.url, "--theme-version", version],
    };
};

const discardNewSite = (siteDir: string, isNewDir: boolean): void => {
    if (isNewDir) {
        rmSync(siteDir, { recursive: true, force: true });
    }
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
    const isNewDir = !existsSync(siteDir);
    if (!isNewDir && readdirSync(siteDir).length > 0) {
        throw new CreateNefantarisError(
            `${siteDir} already exists and is not empty`
        );
    }
    const themeArg = await resolveThemeArg(options.themeArg, isInteractive);
    const choice = classifyTheme(themeArg, options.cloneBase);
    await assertGitAvailable();
    const core = resolveCore(parentDir);
    console.log(`Using Nefantaris core: ${core.describe}`);
    const theme = await selectTheme(choice, siteDir, options.themeVersionArg);
    const initExitCode = await runCommand(
        core.command,
        [...core.args, "init", siteDir, ...theme.initArgs],
        process.cwd(),
        ["ignore", "ignore", "inherit"]
    );
    if (initExitCode !== 0) {
        process.exit(initExitCode);
    }
    try {
        await pinNamedPlugins(siteDir, options.cloneBase);
    } catch (error) {
        discardNewSite(siteDir, isNewDir);
        throw error;
    }
    if (core.how === "environment") {
        linkLocalCore(siteDir, core.coreDir);
    }
    await gitInitSite(siteDir, parentDir);
    const hasInstalledDependencies = options.skipInstall
        ? false
        : await installDependencies(siteDir, siteDirArg);
    printNextSteps(siteDirArg, theme.themeName, hasInstalledDependencies);
};
