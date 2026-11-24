# Script releases for GitHub Pages

**Decided by Jo Yee, 24 Nov 2026: A**, in two steps.

1. **Publish from a workflow (done).** `.github/workflows/pages.yml` stages the site with `tests/support/stage-site.js`: index.html, 404.html, js/ and audio/, with each script tag stamped from the copied file's bytes. Today that copy is byte for byte what the branch publishes. The workflow runs by hand until Settings → Pages → Source is **GitHub Actions**.
2. **Unstamped source (done).** index.html in the repository keeps fixed `?v=dev` tags: lint fails on a stamped one, `npm run stamp` puts them back to `?v=dev`, and the Pages workflow runs on every push to main.

Later, if needed: the immutable `releases/<digest>/` folders below, so a page loading during a deploy still gets matching scripts. Step 1 keeps today's cache behaviour: query stamps only.

The proposal as written by Codex follows.

**Proposed decision for Jo Yee:** choose A if you are willing to change Settings → Pages → Source to **GitHub Actions**. It removes generated stamp edits from every feature branch and keeps the public game URL. B keeps the current branch publishing setting at the cost of a manual, generated release commit. Neither option changes gameplay.

| | A. Build the deployed copy | B. Publish a generated copy from main |
| --- | --- | --- |
| Source and release | Keep the editable root index with fixed `?v=dev` tags. A Pages workflow on main stages the site, builds and verifies it, then uploads and deploys the complete artifact. Serialise deployments. | Keep the public root index and existing Pages source on main. Move the editable template to a development path. Feature PRs edit the template and source JS. A maintainer runs a release command on the merged main and commits the generated root index and scripts together. Until then the root index still points at the previous release. |
| URLs and cache | In the staged index give each script its content stamp. For both options publish the bytes at an immutable relative path such as `releases/<digest>/core.js?v=<digest>`. | Commit the immutable files alongside the generated index. Put generated files outside the editable js/ directory. Only release commits change public script tags. |
| Local development and tests | Serve the source index with caching disabled locally. Teach tests/support/source.js to recognise the literal dev stamp, preserve script order, and keep reading editable files for instrumentation. | The local test/dev server maps /index.html to the editable template. A separate release smoke test serves the actual root index. Relative URLs must also work under /Port-Meridien/. |
| Lint and rollback | Lint requires dev tags on source, then checks the staged index against every file hash and rejects missing, duplicate or reordered scripts. Roll back by redeploying the last known-good release, including retained immutable files. | Lint checks template structure and consistency of the committed release with its own immutable bytes. A release check also compares the new release with current source. Roll back by restoring the known-good index and preserving assets referenced by newer tabs. |

**A player loading during deployment.** Already executed classic scripts stay in memory. An older HTML response or an interrupted load can still request scripts after a deployment. A query string alone can return today's bytes from yesterday's path. Retain previous immutable script files in every published tree, including rollbacks. For A, seed staging with the retained release assets from a durable versioned archive. Test by fetching the old index, publishing, then fetching every old script and checking its hash. Retain historic unversioned paths during migration; old query-only clients cannot get this guarantee retroactively.

**Firebase and scope.** Keep the existing browser Firebase configuration in the shipped screens script and preserve the origin, CSP, SDK URLs and relative asset paths. Publish a site-file allowlist. Database rules, backend deployments and credentials are outside this change. Verify anonymous multiplayer and cloud sign-in on the project URL before switching players over. Under B, independently mutable assets still need backward compatibility with scripts used by the live release.

[GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
