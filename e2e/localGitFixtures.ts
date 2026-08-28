import { mkdir } from "node:fs/promises";
import { runProcess } from "./runProcess.js";
import { copyWorkspaceSibling } from "./workspaceSiblings.js";

const runGit = async (args: string[], cwd: string): Promise<void> => {
    const result = await runProcess("git", args, cwd);
    if (result.code !== 0) {
        throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
    }
};

export const createLocalGitFixtures = async (
    names: string[],
    fixturesDir: string
): Promise<void> => {
    await mkdir(fixturesDir, { recursive: true });
    for (const name of names) {
        const repoDir = await copyWorkspaceSibling(name, fixturesDir);
        await runGit(["init"], repoDir);
        await runGit(["add", "."], repoDir);
        await runGit(
            [
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@t",
                "commit",
                "-m",
                "fixture",
            ],
            repoDir
        );
    }
};
