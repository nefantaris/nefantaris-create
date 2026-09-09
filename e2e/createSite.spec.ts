import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createLocalGitFixtures } from "./localGitFixtures.js";
import { readJsonObject, readRecordField } from "./readJsonObject.js";
import { runCli } from "./runCli.js";
import { runProcess } from "./runProcess.js";
import {
    copyTreeWithoutArtifacts,
    workspaceRoot,
} from "./workspaceSiblings.js";
import { withTempDir } from "./withTempDir.js";

const themeName = "nefantaris-theme-base";
const pluginName = "nefantaris-plugin-date-fns";

const nextStepsBlock = (stdout: string): string =>
    stdout.slice(stdout.indexOf("Next steps:"));

test("creates a buildable site pinned to the clone base", async () =>
    withTempDir(async (tempDir) => {
        const remotesDir = join(tempDir, "remotes");
        const remotes = await createLocalGitFixtures(remotesDir, [
            { name: themeName, tags: ["v1.0.0"] },
            { name: pluginName },
        ]);
        const result = await runCli(
            ["my-site", "--clone-base", remotesDir],
            tempDir
        );
        assert.equal(result.code, 0, result.stderr);
        const nextSteps = nextStepsBlock(result.stdout);
        assert.match(nextSteps, /npm run dev/);
        assert.doesNotMatch(nextSteps, /npm install/);
        const siteDir = join(tempDir, "my-site");
        const config = await readJsonObject(join(siteDir, "nefantaris.json"));
        assert.deepEqual(config.theme, {
            source: remotes[themeName].url,
            version: "v1.0.0",
        });
        assert.deepEqual(config.plugins, [
            {
                name: pluginName,
                source: remotes[pluginName].url,
                version: remotes[pluginName].headSha,
            },
        ]);
        assert.ok(existsSync(join(siteDir, "content/pages/index.md")));
        assert.ok(existsSync(join(siteDir, ".git")));
        const manifest = await readJsonObject(join(siteDir, "package.json"));
        const scripts = readRecordField(manifest, "scripts");
        assert.equal(scripts.dev, "nef dev");
        assert.equal(scripts.build, "nef build");
        const devDependencies = readRecordField(manifest, "devDependencies");
        const coreSpec = devDependencies["@nefantaris/core"];
        assert.ok(typeof coreSpec === "string", String(coreSpec));
        assert.ok(coreSpec.startsWith("file:"), coreSpec);
        assert.ok(
            existsSync(
                join(siteDir, "node_modules/@nefantaris/core/package.json")
            )
        );
        const buildResult = await runProcess("npm", ["run", "build"], siteDir);
        assert.equal(buildResult.code, 0, buildResult.stderr);
        assert.ok(existsSync(join(siteDir, "dist/index.html")));
    }));

test("--no-install leaves the dependency install to the user", async () =>
    withTempDir(async (tempDir) => {
        const remotesDir = join(tempDir, "remotes");
        await createLocalGitFixtures(remotesDir, [
            { name: themeName, tags: ["v1.0.0"] },
            { name: pluginName },
        ]);
        const result = await runCli(
            ["my-site", "--clone-base", remotesDir, "--no-install"],
            tempDir
        );
        assert.equal(result.code, 0, result.stderr);
        const siteDir = join(tempDir, "my-site");
        assert.ok(existsSync(join(siteDir, "package.json")));
        assert.ok(!existsSync(join(siteDir, "node_modules")));
        const nextSteps = nextStepsBlock(result.stdout);
        assert.match(nextSteps, /npm install/);
        assert.match(nextSteps, /npm run dev/);
    }));

test("creates a site with the docs theme pinned to its latest commit and no plugins", async () =>
    withTempDir(async (tempDir) => {
        const remotesDir = join(tempDir, "remotes");
        const remotes = await createLocalGitFixtures(remotesDir, [
            { name: "nefantaris-theme-docs" },
        ]);
        const result = await runCli(
            [
                "my-site",
                "--theme",
                "nefantaris-theme-docs",
                "--clone-base",
                remotesDir,
                "--no-install",
            ],
            tempDir
        );
        assert.equal(result.code, 0, result.stderr);
        const config = await readJsonObject(
            join(tempDir, "my-site/nefantaris.json")
        );
        assert.deepEqual(config.theme, {
            source: remotes["nefantaris-theme-docs"].url,
            version: remotes["nefantaris-theme-docs"].headSha,
        });
        assert.deepEqual(config.plugins, []);
    }));

test("uses a local theme path as it is and still pins its plugins", async () =>
    withTempDir(async (tempDir) => {
        const remotesDir = join(tempDir, "remotes");
        const remotes = await createLocalGitFixtures(remotesDir, [
            { name: pluginName },
        ]);
        const themeCopyDir = join(tempDir, "theme-copies", themeName);
        await copyTreeWithoutArtifacts(
            join(workspaceRoot, themeName),
            themeCopyDir
        );
        const result = await runCli(
            [
                "my-site",
                "--theme",
                themeCopyDir,
                "--clone-base",
                remotesDir,
                "--no-install",
            ],
            tempDir
        );
        assert.equal(result.code, 0, result.stderr);
        assert.ok(!existsSync(join(tempDir, themeName)));
        const config = await readJsonObject(
            join(tempDir, "my-site/nefantaris.json")
        );
        assert.deepEqual(config.theme, {
            source: "../theme-copies/nefantaris-theme-base",
            version: "local",
        });
        assert.deepEqual(config.plugins, [
            {
                name: pluginName,
                source: remotes[pluginName].url,
                version: remotes[pluginName].headSha,
            },
        ]);
    }));
