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
    coreBinPath,
    workspaceRoot,
} from "./workspaceSiblings.js";
import { withTempDir } from "./withTempDir.js";

test("creates a buildable site next to existing workspace siblings", async () =>
    withTempDir(async (tempDir) => {
        await copyWorkspaceSibling("nefantaris-theme-base", tempDir);
        await copyWorkspaceSibling("nefantaris-plugin-date-fns", tempDir);
        const result = await runCli(["my-site"], tempDir);
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stdout, /Using existing/);
        const siteDir = join(tempDir, "my-site");
        const config = await readJsonObject(join(siteDir, "nefantaris.json"));
        assert.deepEqual(config.plugins, ["nefantaris-plugin-date-fns"]);
        assert.ok(existsSync(join(siteDir, "content/pages/index.md")));
        assert.ok(existsSync(join(siteDir, ".git")));
        const buildResult = await runProcess(
            process.execPath,
            [coreBinPath, "build", siteDir],
            tempDir
        );
        assert.equal(buildResult.code, 0, buildResult.stderr);
        assert.ok(existsSync(join(siteDir, "dist/index.html")));
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
