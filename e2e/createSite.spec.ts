import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { readJsonObject, readRecordField } from "./readJsonObject.js";
import { runCli } from "./runCli.js";
import { runProcess } from "./runProcess.js";
import {
    copyTreeWithoutArtifacts,
    copyWorkspaceSibling,
    workspaceRoot,
} from "./workspaceSiblings.js";
import { withTempDir } from "./withTempDir.js";

const nextStepsBlock = (stdout: string): string =>
    stdout.slice(stdout.indexOf("Next steps:"));

test("creates a buildable site next to existing workspace siblings", async () =>
    withTempDir(async (tempDir) => {
        await copyWorkspaceSibling("nefantaris-theme-base", tempDir);
        await copyWorkspaceSibling("nefantaris-plugin-date-fns", tempDir);
        const result = await runCli(["my-site"], tempDir);
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stdout, /Using existing/);
        const nextSteps = nextStepsBlock(result.stdout);
        assert.match(nextSteps, /npm run dev/);
        assert.doesNotMatch(nextSteps, /npm install/);
        const siteDir = join(tempDir, "my-site");
        const config = await readJsonObject(join(siteDir, "nefantaris.json"));
        assert.deepEqual(config.plugins, ["nefantaris-plugin-date-fns"]);
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
        await copyWorkspaceSibling("nefantaris-theme-base", tempDir);
        await copyWorkspaceSibling("nefantaris-plugin-date-fns", tempDir);
        const result = await runCli(["my-site", "--no-install"], tempDir);
        assert.equal(result.code, 0, result.stderr);
        const siteDir = join(tempDir, "my-site");
        assert.ok(existsSync(join(siteDir, "package.json")));
        assert.ok(!existsSync(join(siteDir, "node_modules")));
        const nextSteps = nextStepsBlock(result.stdout);
        assert.match(nextSteps, /npm install/);
        assert.match(nextSteps, /npm run dev/);
    }));

test("creates a site with the docs theme and no plugins", async () =>
    withTempDir(async (tempDir) => {
        await copyWorkspaceSibling("nefantaris-theme-docs", tempDir);
        const result = await runCli(
            ["my-site", "--theme", "nefantaris-theme-docs"],
            tempDir
        );
        assert.equal(result.code, 0, result.stderr);
        const config = await readJsonObject(
            join(tempDir, "my-site/nefantaris.json")
        );
        const theme = readRecordField(config, "theme");
        assert.equal(theme.source, "../nefantaris-theme-docs");
        assert.deepEqual(config.plugins, []);
    }));

test("uses a local theme path without creating a theme sibling", async () =>
    withTempDir(async (tempDir) => {
        await copyWorkspaceSibling("nefantaris-plugin-date-fns", tempDir);
        const themeCopyDir = join(
            tempDir,
            "theme-copies/nefantaris-theme-base"
        );
        await copyTreeWithoutArtifacts(
            join(workspaceRoot, "nefantaris-theme-base"),
            themeCopyDir
        );
        const result = await runCli(
            ["my-site", "--theme", themeCopyDir],
            tempDir
        );
        assert.equal(result.code, 0, result.stderr);
        assert.ok(!existsSync(join(tempDir, "nefantaris-theme-base")));
        const config = await readJsonObject(
            join(tempDir, "my-site/nefantaris.json")
        );
        const theme = readRecordField(config, "theme");
        assert.equal(theme.source, "../theme-copies/nefantaris-theme-base");
    }));
