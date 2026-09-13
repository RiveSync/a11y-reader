# Releasing

## One-time setup

1. **npm** — the `rivesync` org exists; the package publishes as
   `@rivesync/a11y-reader` with `publishConfig.access: "public"` already set, so
   no `--access public` flag is needed.

2. **First publish must be manual.** npm's trusted publishing (and any
   package-scoped token) can only be configured for a package that already
   exists. So publish the first version (`0.1.0`) from your machine once:

   ```bash
   npm login
   npm run verify      # everything CI runs
   npm publish         # provenance needs CI, so the first one goes without it
   ```

3. **Then add the repository secret** `NPM_TOKEN` — a *granular access token*
   scoped to this package with read/write, not a classic automation token.
   Settings → Secrets and variables → Actions.

4. **Optional but recommended: switch to trusted publishing.** On npmjs.com,
   under the package's Settings → Trusted Publisher, point at
   `RiveSync/a11y-reader` and the `release.yml` workflow. Then delete the
   `NPM_TOKEN` secret and remove `NODE_AUTH_TOKEN` from `release.yml` — there is
   no long-lived credential left to leak or rotate. Confirm the current setup
   steps in npm's docs; this mechanism changed fairly recently.

## Every release after that

1. Open a PR. Add a changeset describing the change for consumers:

   ```bash
   npx changeset
   ```

   CI fails the PR without one, unless it carries the `no-changeset` label.

2. Merge the PR. The release workflow opens a **"chore: version packages"** PR
   that bumps the version and writes `CHANGELOG.md`.

3. Merge *that* PR. The same workflow then publishes to npm with provenance.

## Version policy

The package starts at `0.1.0` deliberately: the API can still move while real
consumers try it. Cut `1.0.0` once it has been in production somewhere for a
while and the prop surface has stopped changing. Until then, treat a breaking
change as a **minor** bump and say so loudly in the changeset.

After 1.0.0, any of these is a **major**: removing or renaming a prop, changing a default,
or changing the shape of `AccessibilitySettings`. The settings object is
persisted in visitors' browsers and passed through host code in controlled mode,
so its shape is a public contract in two directions — `storage.ts` discards
entries whose `version` it does not recognise, so a breaking change there also
means bumping `STORAGE_VERSION` and silently resetting returning visitors.
