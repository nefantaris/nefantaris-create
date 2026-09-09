import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { runProcess } from "./runProcess.js";
import { copyWorkspaceSibling } from "./workspaceSiblings.js";

export type FixtureRepo = { url: string; headSha: string };

export type FixtureSpec = { name: string; tags?: string[] };

const identity = ["-c", "user.name=t", "-c", "user.email=t@t"];

const runGit = async (args: string[], cwd: string): Promise<string> => {
    const result = await runProcess("git", [...identity, ...args], cwd);
    if (result.code !== 0) {
        throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
    }
    return result.stdout.trim();
};

export const createLocalGitFixtures = async (
    fixturesDir: string,
    specs: FixtureSpec[]
): Promise<Record<string, FixtureRepo>> => {
    await mkdir(fixturesDir, { recursive: true });
    const repos: Record<string, FixtureRepo> = {};
    for (const { name, tags = [] } of specs) {
        const repoDir = await copyWorkspaceSibling(name, fixturesDir);
        await runGit(["init", "--quiet"], repoDir);
        await runGit(["add", "."], repoDir);
        await runGit(["commit", "--quiet", "-m", "fixture"], repoDir);
        for (const tag of tags) {
            await runGit(["tag", "-a", tag, "-m", tag], repoDir);
        }
        repos[name] = {
            url: pathToFileURL(repoDir).href,
            headSha: await runGit(["rev-parse", "HEAD"], repoDir),
        };
    }
    return repos;
};
