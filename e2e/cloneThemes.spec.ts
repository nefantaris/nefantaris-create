import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { createLocalGitFixtures } from "./localGitFixtures.js";
import { runCli } from "./runCli.js";
import { withTempDir } from "./withTempDir.js";

test("clones the theme and its required plugins from the clone base", async () =>
    withTempDir(async (tempDir) => {
        const fixturesDir = join(tempDir, "remotes");
        await createLocalGitFixtures(
            ["nefantaris-theme-base", "nefantaris-plugin-date-fns"],
            fixturesDir
        );
        const workDir = join(tempDir, "work");
        await mkdir(workDir, { recursive: true });
        const result = await runCli(
            ["my-site", "--clone-base", fixturesDir],
            workDir
        );
        assert.equal(result.code, 0, result.stderr);
        assert.ok(
            existsSync(join(workDir, "nefantaris-theme-base/theme.json"))
        );
        assert.ok(
            existsSync(join(workDir, "nefantaris-plugin-date-fns/plugin.json"))
        );
        assert.ok(existsSync(join(workDir, "my-site/nefantaris.json")));
        assert.ok(existsSync(join(workDir, "my-site/.git")));
    }));
