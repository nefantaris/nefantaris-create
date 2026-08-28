import { runProcess, type ProcessResult } from "./runProcess.js";
import { builtCliPath, workspaceCoreDir } from "./workspaceSiblings.js";

export const runCli = (args: string[], cwd: string): Promise<ProcessResult> =>
    runProcess(process.execPath, [builtCliPath, ...args], cwd, {
        NEFANTARIS_CORE_DIR: workspaceCoreDir,
    });
