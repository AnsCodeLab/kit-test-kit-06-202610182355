# Release

A release is a tagged commit on `main` that builds the same way every time and can be deployed to Cloudflare Pages and rolled back by redeploying an earlier tag.

## Reproducible build

`npm run release:build` runs `npm ci`, `npm run check:sync` and `npm run build` with `TZ=UTC`, `LC_ALL=C` and `SOURCE_DATE_EPOCH` pinned to the time of the HEAD commit (an explicit `SOURCE_DATE_EPOCH` in the environment wins). It then writes:

- `dist/release.json`: package name, version (the exact tag when HEAD is tagged), commit, `builtAt` derived from `SOURCE_DATE_EPOCH`, the content checksum from `content/.sync-manifest.json`, and the file count. It holds no wall-clock time.
- `release/SHA256SUMS`: `sha256sum` style lines for every file in `dist/`, sorted by path.

Two builds of the same commit give an identical `release/SHA256SUMS`. Compare a rebuild against a published one with `diff release/SHA256SUMS <previous SHA256SUMS>`, or check a build in place with `cd dist && sha256sum -c ../release/SHA256SUMS`.

Set `KIT_SOURCE` to the kit source directory and `SITE_URL` to the public origin before building a release (see the README). The same two values must be used again to reproduce a release: `SITE_URL` ends up in `sitemap.xml` and `robots.txt`, and `check:sync` compares the committed `content/` with `KIT_SOURCE`. The version in `release.json` is the `vMAJOR.MINOR.PATCH` tag on HEAD, so build after tagging. The working tree should be clean when a release is built.

## Tagging

Versions are `vMAJOR.MINOR.PATCH`. Tag a commit that is on `main`, CI is green for, and that you built:

```sh
git checkout main
git pull --ff-only
git tag -a v1.2.3 -m "v1.2.3"
git push origin v1.2.3
npm run release:build
```

Use `git tag --list "v*" --sort=-v:refname` to list tags, newest first.

## Deploy

The deploy script reads its settings from the environment only: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `CF_PAGES_PROJECT`. `CF_PAGES_BRANCH` is optional and publishes a preview deployment instead of production. Without it the upload goes to the production branch, `main` unless `CF_PAGES_PRODUCTION_BRANCH` says otherwise (set it if the Pages project uses another production branch); the branch is always passed to wrangler explicitly, so a rollback from a detached tag checkout still replaces production. Never write the token into a file in the repository. The script names any missing variable and stops, and it never prints the token.

```sh
npm run deploy -- --dry-run
npm run deploy
```

`--dry-run` checks the variables and `dist/`, prints the target project and the file count, and uploads nothing. The real run uploads `dist/` with `wrangler pages deploy` (fetched on demand through `npx`) and prints the resulting URL. CI only ever runs the dry run.

## Rollback

To put the previous release back, redeploy the build of the previous tag. The deploy replaces what production serves, so nothing is edited in place.

```sh
git tag --list "v*" --sort=-v:refname
git checkout v1.2.2
npm run release:build
npm run deploy
git checkout main
```

Replace `v1.2.2` with the tag to restore. Use the same `SITE_URL` as the original release and a `KIT_SOURCE` that matches that tag's `content/`. Only tags that already contain `release:build` and `deploy` can be restored this way; for an older tag, run the scripts from `main` against it. Because the build is reproducible, `release/SHA256SUMS` from this run matches the one produced when that tag was first released. Run the health check below afterwards, then decide whether to fix forward with a new tag.

## Health check

After every deploy, and after every rollback, check the live site. Pass the deployed URL printed by the deploy script:

```sh
npm run healthcheck -- https://your-project.pages.dev
```

It fetches every sitemap page, `/robots.txt` and an unknown path, and on a non-local target also requires the security headers from `public/_headers`. It exits 1 and names the first failure class when something is wrong. The target can also come from `HEALTH_URL`. Without a URL it serves the local `dist/` and checks that instead, which is a useful check right after `npm run release:build`.
