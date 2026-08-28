import { spawn } from "node:child_process";

export type ProcessResult = {
    code: number;
    stdout: string;
    stderr: string;
};

export const runProcess = (
    command: string,
    args: string[],
    cwd: string,
    extraEnv: Record<string, string> = {}
): Promise<ProcessResult> =>
    new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(command, args, {
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
                code: code ?? 1,
                stdout: Buffer.concat(stdoutChunks).toString("utf8"),
                stderr: Buffer.concat(stderrChunks).toString("utf8"),
            });
        });
    });
