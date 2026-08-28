import assert from "node:assert/strict";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import { CreateNefantarisError } from "../src/CreateNefantarisError.js";
import { defaultCloneBase, parseArgs } from "../src/parseArgs.js";
import { classifyTheme } from "../src/themeChoice.js";

const cloneBase = "https://example.test/themes";

test("parseArgs defaults to interactive creation", () => {
    assert.deepEqual(parseArgs([]), {
        kind: "create",
        siteDirArg: undefined,
        themeArg: undefined,
        cloneBase: defaultCloneBase,
        skipPrompts: false,
    });
});

test("parseArgs reads the positional and every flag", () => {
    assert.deepEqual(
        parseArgs([
            "my-site",
            "--yes",
            "--theme",
            "nefantaris-theme-docs",
            "--clone-base",
            "/repos",
        ]),
        {
            kind: "create",
            siteDirArg: "my-site",
            themeArg: "nefantaris-theme-docs",
            cloneBase: "/repos",
            skipPrompts: true,
        }
    );
});

test("parseArgs recognizes help and version", () => {
    assert.deepEqual(parseArgs(["--help"]), { kind: "help" });
    assert.deepEqual(parseArgs(["--version"]), { kind: "version" });
});

test("parseArgs rejects malformed invocations", () => {
    const malformedInvocations = [
        ["--theme"],
        ["--theme", "--yes"],
        ["--theme", "a", "--theme", "b"],
        ["--clone-base"],
        ["--clone-base", "a", "--clone-base", "b"],
        ["--yes", "--yes"],
        ["--unknown"],
        ["site-a", "site-b"],
    ];
    for (const argv of malformedInvocations) {
        assert.deepEqual(parseArgs(argv), { kind: "usage" });
    }
});

test("classifyTheme treats URLs as clones named after the repository", () => {
    assert.deepEqual(
        classifyTheme("https://example.test/x/my-theme.git", cloneBase),
        {
            kind: "clone",
            name: "my-theme",
            cloneUrl: "https://example.test/x/my-theme.git",
        }
    );
    assert.deepEqual(
        classifyTheme("git@example.test:x/my-theme.git", cloneBase),
        {
            kind: "clone",
            name: "my-theme",
            cloneUrl: "git@example.test:x/my-theme.git",
        }
    );
});

test("classifyTheme resolves local paths without cloning", () => {
    assert.deepEqual(classifyTheme("./themes/mine", cloneBase), {
        kind: "localPath",
        themeDir: resolve("themes/mine"),
    });
    assert.deepEqual(classifyTheme("../themes/mine", cloneBase), {
        kind: "localPath",
        themeDir: resolve("../themes/mine"),
    });
    assert.deepEqual(classifyTheme("/absolute/theme", cloneBase), {
        kind: "localPath",
        themeDir: "/absolute/theme",
    });
    assert.deepEqual(classifyTheme("~/themes/mine", cloneBase), {
        kind: "localPath",
        themeDir: resolve(homedir(), "themes/mine"),
    });
});

test("classifyTheme clones first-party names from the clone base", () => {
    assert.deepEqual(classifyTheme("nefantaris-theme-base", cloneBase), {
        kind: "clone",
        name: "nefantaris-theme-base",
        cloneUrl: `${cloneBase}/nefantaris-theme-base`,
    });
    assert.deepEqual(classifyTheme("nefantaris-theme-docs", cloneBase), {
        kind: "clone",
        name: "nefantaris-theme-docs",
        cloneUrl: `${cloneBase}/nefantaris-theme-docs`,
    });
});

test("classifyTheme rejects unknown bare names and lists the valid ones", () => {
    assert.throws(
        () => classifyTheme("mystery-theme", cloneBase),
        (error: unknown) =>
            error instanceof CreateNefantarisError &&
            error.message.includes("nefantaris-theme-base") &&
            error.message.includes("nefantaris-theme-docs")
    );
});
