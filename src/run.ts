import { spawn, type StdioOptions } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { CreateNefantarisError } from "./CreateNefantarisError.js";

type SpawnPlan = { command: string; args: string[] };

export type CommandResult = {
    exitCode: number;
    stdout: string;
    stderr: string;
};

const npmCliEntries = { npm: "npm-cli.js", npx: "npx-cli.js" };

type NpmCommand = keyof typeof npmCliEntries;

const isNpmCommand = (command: string): command is NpmCommand =>
    Object.hasOwn(npmCliEntries, command);

const npmCliDirs = (): string[] => {
    const npmExecPath = process.env.npm_execpath;
    const fromNpmExecPath = npmExecPath ? [dirname(npmExecPath)] : [];
    const besideNode = join(
        dirname(process.execPath),
        "node_modules",
        "npm",
        "bin"
    );
    return [...fromNpmExecPath, besideNode];
};

const locateNpmCli = (command: NpmCommand): string => {
    const entry = npmCliDirs()
        .map((dir) => join(dir, npmCliEntries[command]))
        .find((candidate) => existsSync(candidate));
    if (entry === undefined) {
        throw new CreateNefantarisError(
            `Could not find ${command} next to ${process.execPath}`
        );
    }
    return entry;
};

const windowsSafe = (command: string, args: string[]): SpawnPlan => {
    if (process.platform !== "win32" || !isNpmCommand(command)) {
        return { command, args };
    }
    return {
        command: process.execPath,
        args: [locateNpmCli(command), ...args],
    };
};

export const runCommand = (
    command: string,
    args: string[],
    cwd: string,
    stdio: StdioOptions = "inherit"
): Promise<number> =>
    new Promise((resolvePromise, rejectPromise) => {
        const plan = windowsSafe(command, args);
        const child = spawn(plan.command, plan.args, { cwd, stdio });
        child.on("error", rejectPromise);
        child.on("exit", (code) => {
            resolvePromise(code ?? 1);
        });
    });

export const captureCommand = (
    command: string,
    args: string[],
    cwd: string,
    extraEnv: Record<string, string> = {}
): Promise<CommandResult> =>
    new Promise((resolvePromise, rejectPromise) => {
        const plan = windowsSafe(command, args);
        const child = spawn(plan.command, plan.args, {
            cwd,
            env: { ...process.env, ...extraEnv },
            stdio: ["ignore", "pipe", "pipe"],
        });
        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];
        child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
        child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
        child.on("error", rejectPromise);
        child.on("close", (code) => {
            resolvePromise({
                exitCode: code ?? 1,
                stdout: Buffer.concat(stdoutChunks).toString("utf8"),
                stderr: Buffer.concat(stderrChunks).toString("utf8"),
            });
        });
    });
