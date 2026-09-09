# create-nefantaris

One npx command that bootstraps a working, content-only Nefantaris site. It
asks where the site should live and which theme it should use, pins that theme
and its plugins to released git versions, and hands the rest to Nefantaris
core. The result builds anywhere the repo is checked out — a laptop, CI, or
Cloudflare Pages — with nothing beside it.

## Usage

```
npx create-nef [siteDir] [options]
npx create-nefantaris [siteDir] [options]
```

Both names run the same tool. Without flags it asks two questions: the site
directory and the theme. Every question can be skipped with a flag.

## Options

| Option                          | Description                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `--theme <name\|git-url\|path>` | Theme to install (default: `nefantaris-theme-base`)                                              |
| `--theme-version <ref>`         | Tag or commit to pin a git theme at (default: newest release tag, else latest commit)            |
| `--yes`                         | Skip all questions and use defaults                                                              |
| `--no-install`                  | Skip running `npm install` in the new site                                                       |
| `--clone-base <url-or-path>`    | Where first-party themes and plugins are fetched from (default: `https://github.com/nefantaris`) |
| `--help`                        | Show usage                                                                                       |
| `--version`                     | Print the version                                                                                |

## How it works

1. Resolves the theme to a git URL and a pinned version. A first-party name
   becomes `<clone-base>/<name>`; a git URL is used as given. The version is
   `--theme-version` when passed, otherwise the newest release tag on the
   remote (`v1.2.3` or `1.2.3`, prereleases ignored), otherwise the commit at
   the tip of its default branch. A local path in `--theme` is used in place,
   relative to the site, and is never pinned.
2. Runs Nefantaris core's `nef init <siteDir> --theme <url> --theme-version
<ref>` to scaffold `nefantaris.json`, starter pages, a first post, the site
   `.gitignore`, and a `package.json` whose `dev` and `build` scripts call
   `nef` and whose only devDependency is `@nefantaris/core` at the version
   that ran init. Init fetches the theme into the site's `.nefantaris/` and
   copies the theme's `requires` into the site's `plugins`.
3. Pins every plugin the theme required by plain name to
   `<clone-base>/<name>` at its newest release tag, or its latest commit when
   it has none. Plugins the theme already pinned are left as they are. A
   plugin that cannot be reached at the clone base fails the run and removes
   the half-created site so a retry is not blocked.
4. When `NEFANTARIS_CORE_DIR` pointed at a core checkout, rewrites the
   `@nefantaris/core` devDependency to a `file:` path to that checkout.
5. Runs `git init` in the new site, unless the parent directory is already
   inside a git repository.
6. Runs `npm install` in the new site (skipped with `--no-install`). If the
   install fails, the site is still created and the next steps tell you to run
   it yourself.

Nothing is cloned beside the site. A theme or plugin checkout that happens to
sit next to the new directory is ignored — pass it as a path in `--theme`, or
edit `nefantaris.json`, to develop against it.

The next steps are then just `cd <siteDir>` and `npm run dev`. `npm run build`
writes the deployable site to `dist/`, so on Cloudflare Pages the build command
is `npm run build` and the output directory is `dist`.

## Finding Nefantaris core

Nefantaris core is resolved in this order, first hit wins:

1. The `NEFANTARIS_CORE_DIR` environment variable, pointing at a built
   checkout of `nefantaris-core`.
2. A `nefantaris-core` checkout sitting next to the new site directory.
3. `@nefantaris/core@latest`, run straight from the registry with npx.

There is deliberately no `@nefantaris/core` dependency in this package. A
pinned dependency would freeze every new site at whichever core version was
current when this package was last released, and a floating range would still
be resolved once at install time and then cached. Resolving the dist-tag at
run time instead means a core release reaches new sites immediately, and this
package never needs a release just to keep up. The two local tiers come first
so a checkout you are working in always wins over the registry for running
`nef init`. Only the explicit `NEFANTARIS_CORE_DIR` tier also rewrites the new
site's `@nefantaris/core` devDependency to a `file:` path, so `npm run dev`
runs that checkout. A sibling checkout runs init but leaves the exact version
number it wrote, so the site installs core from the registry and deploys as it
is; if that version is not published yet, `npm install` says so and
`NEFANTARIS_CORE_DIR` is the way to link the checkout on purpose.

## Publishing

Releases happen in CI only — nobody publishes from a laptop. Bump the version,
merge to `main`, then push a matching tag:

```
npm version minor
git push --follow-tags
```

`.github/workflows/publish.yml` refuses to run if the tag and the manifest
version disagree, then publishes the same tarball under both unscoped names:
`create-nefantaris` first, then `create-nef`, restoring the manifest name
afterwards. Both names ship on every release. A name whose version is already
on the registry is skipped, so a re-run after a partial failure is safe.

Authentication is npm trusted publishing (OIDC) — there is no npm token in
this repository. Both names must have a trusted publisher on npmjs.com
pointing at `nefantaris/nefantaris-create` and the workflow filename
`publish.yml`; the fields are case-sensitive and must match exactly.
Provenance attestations are generated automatically.
