import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { newestReleaseTag } from "../src/pinnedVersion.js";
import { isGitUrl, repositoryUrl } from "../src/repositoryUrl.js";

test("newestReleaseTag orders release tags numerically and ignores everything else", () => {
    assert.equal(
        newestReleaseTag([
            "v1.2.0",
            "1.3.0",
            "v1.10.0",
            "v2.0.0-beta.1",
            "latest",
            "nightly",
        ]),
        "v1.10.0"
    );
    assert.equal(newestReleaseTag(["0.9.0", "v0.10.0"]), "v0.10.0");
    assert.equal(newestReleaseTag(["nightly"]), undefined);
    assert.equal(newestReleaseTag([]), undefined);
});

test("isGitUrl accepts URL schemes and scp-style remotes only", () => {
    assert.ok(isGitUrl("https://github.com/nefantaris"));
    assert.ok(isGitUrl("ssh://git@example.test/x"));
    assert.ok(isGitUrl("file:///repos"));
    assert.ok(isGitUrl("git@github.com:nefantaris/x.git"));
    assert.ok(!isGitUrl("/repos"));
    assert.ok(!isGitUrl("./repos"));
    assert.ok(!isGitUrl("C:\\repos"));
});

test("repositoryUrl joins a URL clone base and turns a path clone base into a file URL", () => {
    assert.equal(
        repositoryUrl("https://github.com/nefantaris", "nefantaris-theme-base"),
        "https://github.com/nefantaris/nefantaris-theme-base"
    );
    assert.equal(
        repositoryUrl("https://github.com/nefantaris/", "x"),
        "https://github.com/nefantaris/x"
    );
    assert.equal(
        repositoryUrl("git@github.com:nefantaris", "x"),
        "git@github.com:nefantaris/x"
    );
    assert.equal(
        repositoryUrl("/repos", "x"),
        pathToFileURL(resolve("/repos", "x")).href
    );
    assert.equal(
        repositoryUrl("./repos", "x"),
        pathToFileURL(resolve("repos", "x")).href
    );
});
