import { spawn } from "node:child_process";

export const runCommand = (
    command: string,
    args: string[],
    cwd: string,
    stdio: "inherit" | "ignore" = "inherit"
): Promise<number> =>
    new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(command, args, { cwd, stdio });
        child.on("error", rejectPromise);
        child.on("exit", (code) => {
            resolvePromise(code ?? 1);
        });
    });
