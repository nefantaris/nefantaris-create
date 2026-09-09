import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { createLocalGitFixtures } from "./localGitFixtures.js";
import { readJsonObject } from "./readJsonObject.js";
import { runCli } from "./runCli.js";
import {
    copyTreeWithoutArtifacts,
    workspaceRoot,
} from "./workspaceSiblings.js";
import { withTempDir } from "./withTempDir.js";

const themeName = "nefantaris-theme-base";
const pluginName = "nefantaris-plugin-date-fns";

const makeWorkDir = async (tempDir: string): Promise<string> => {
    const workDir = join(tempDir, "work");
    await mkdir(workDir, { recursive: true });
    return workDir;
};

test("pins the theme to its newest release tag and its plugins to their latest commit without cloning siblings", async () =>
    withTempDir(async (tempDir) => {
        const remotesDir = join(tempDir, "remotes");
        const remotes = await createLocalGitFixtures(remotesDir, [
            { name: themeName, tags: ["v1.2.0", "v1.10.0"] },
            { name: pluginName },
        ]);
        const workDir = await makeWorkDir(tempDir);
        const result = await runCli(
            ["my-site", "--clone-base", remotesDir, "--no-install"],
            workDir
        );
        assert.equal(result.code, 0, result.stderr);
        assert.ok(!existsSync(join(workDir, themeName)));
        assert.ok(!existsSync(join(workDir, pluginName)));
        assert.match(
            result.stdout,
            /Pinned theme nefantaris-theme-base .* at v1\.10\.0/
        );
        assert.match(
            result.stdout,
            /Pinned plugin nefantaris-plugin-date-fns /
        );
        const config = await readJsonObject(
            join(workDir, "my-site/nefantaris.json")
        );
        assert.deepEqual(config.theme, {
            source: remotes[themeName].url,
            version: "v1.10.0",
        });
        assert.deepEqual(config.plugins, [
            {
                name: pluginName,
                source: remotes[pluginName].url,
                version: remotes[pluginName].headSha,
            },
        ]);
        assert.ok(existsSync(join(workDir, "my-site/.git")));
    }));

test("--theme-version overrides the newest release tag", async () =>
    withTempDir(async (tempDir) => {
        const remotesDir = join(tempDir, "remotes");
        const remotes = await createLocalGitFixtures(remotesDir, [
            { name: themeName, tags: ["v1.0.0"] },
            { name: pluginName },
        ]);
        const workDir = await makeWorkDir(tempDir);
        const result = await runCli(
            [
                "my-site",
                "--clone-base",
                remotesDir,
                "--theme-version",
                remotes[themeName].headSha,
                "--no-install",
            ],
            workDir
        );
        assert.equal(result.code, 0, result.stderr);
        const config = await readJsonObject(
            join(workDir, "my-site/nefantaris.json")
        );
        assert.deepEqual(config.theme, {
            source: remotes[themeName].url,
            version: remotes[themeName].headSha,
        });
    }));

test("removes the half-created site when a required plugin is not at the clone base", async () =>
    withTempDir(async (tempDir) => {
        const remotesDir = join(tempDir, "remotes");
        await createLocalGitFixtures(remotesDir, [
            { name: themeName, tags: ["v1.0.0"] },
        ]);
        const workDir = await makeWorkDir(tempDir);
        const result = await runCli(
            ["my-site", "--clone-base", remotesDir, "--no-install"],
            workDir
        );
        assert.equal(result.code, 1);
        assert.match(
            result.stderr,
            /Could not reach plugin "nefantaris-plugin-date-fns"/
        );
        assert.ok(!existsSync(join(workDir, "my-site")));
    }));

test("rejects --theme-version for a local theme path", async () =>
    withTempDir(async (tempDir) => {
        const themeCopyDir = join(tempDir, "theme-copies", themeName);
        await copyTreeWithoutArtifacts(
            join(workspaceRoot, themeName),
            themeCopyDir
        );
        const workDir = await makeWorkDir(tempDir);
        const result = await runCli(
            ["my-site", "--theme", themeCopyDir, "--theme-version", "v1.0.0"],
            workDir
        );
        assert.equal(result.code, 1);
        assert.match(result.stderr, /--theme-version pins a git theme/);
        assert.ok(!existsSync(join(workDir, "my-site")));
    }));
