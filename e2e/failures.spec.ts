import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { runCli } from "./runCli.js";
import { withTempDir } from "./withTempDir.js";

test("refuses a non-empty target directory", async () =>
    withTempDir(async (tempDir) => {
        const siteDir = join(tempDir, "my-site");
        await mkdir(siteDir, { recursive: true });
        await writeFile(join(siteDir, "keep.txt"), "keep\n");
        const result = await runCli(["my-site"], tempDir);
        assert.equal(result.code, 1);
        assert.match(result.stderr, /already exists and is not empty/);
    }));

test("prints usage when no site directory is given without a terminal", async () =>
    withTempDir(async (tempDir) => {
        const result = await runCli([], tempDir);
        assert.equal(result.code, 1);
        assert.match(result.stderr, /Usage:/);
    }));

test("rejects an unknown bare theme name and lists the valid ones", async () =>
    withTempDir(async (tempDir) => {
        const result = await runCli(
            ["my-site", "--theme", "nefantaris-theme-unknown"],
            tempDir
        );
        assert.equal(result.code, 1);
        assert.match(result.stderr, /nefantaris-theme-base/);
        assert.match(result.stderr, /nefantaris-theme-docs/);
    }));

test("rejects a duplicated --no-install flag with usage", async () =>
    withTempDir(async (tempDir) => {
        const result = await runCli(
            ["my-site", "--no-install", "--no-install"],
            tempDir
        );
        assert.equal(result.code, 1);
        assert.match(result.stderr, /Usage:/);
    }));
