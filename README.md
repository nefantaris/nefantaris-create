# create-nefantaris

One npx command that bootstraps a working, content-only Nefantaris site. It
asks where the site should live and which theme it should use, clones what is
needed, and hands the rest to Nefantaris core.

## Usage

```
npx create-nef [siteDir] [options]
npx create-nefantaris [siteDir] [options]
```

Both names run the same tool. Without flags it asks two questions: the site
directory and the theme. Every question can be skipped with a flag.

## Options

| Option                          | Description                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| `--theme <name\|git-url\|path>` | Theme to install (default: `nefantaris-theme-base`)                                       |
| `--yes`                         | Skip all questions and use defaults                                                       |
| `--clone-base <url-or-path>`    | Where first-party repositories are cloned from (default: `https://github.com/nefantaris`) |
| `--help`                        | Show usage                                                                                |
| `--version`                     | Print the version                                                                         |

## How it works

1. Clones the chosen theme as a sibling of the new site directory (skipped
   when the sibling already exists, or when `--theme` is a local path).
2. Reads the theme's `theme.json` and clones each plugin in its `requires`
   array as a sibling too.
3. Runs Nefantaris core's `nef init <siteDir> --theme <source>` to scaffold
   `nefantaris.json`, starter pages, a first post, and the site `.gitignore`.
4. Runs `git init` in the new site, unless the parent directory is already
   inside a git repository.

## Finding Nefantaris core

Nefantaris core is resolved in this order, first hit wins:

1. The `NEFANTARIS_CORE_DIR` environment variable, pointing at a built
   checkout of `nefantaris-core`.
2. An installed `@nefantaris/core` dependency (once core is published).
3. A `nefantaris-core` checkout sitting next to the new site directory.

## Publishing

Publishing is deferred until Nefantaris core is on npm; core is published
first. Each release ships under both unscoped names:

```
npm publish
npm pkg set name=create-nef && npm publish && git checkout package.json
```

The first command publishes `create-nefantaris`, the second temporarily
renames the package to publish `create-nef`, then restores the manifest. Both
names must be published for every release.
