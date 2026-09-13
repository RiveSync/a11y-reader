# Changesets

Every user-facing change needs a changeset. Run:

```bash
npx changeset
```

Pick a bump type and describe the change as a *consumer* would read it in the
changelog — what changed for them, not which file you edited.

- **patch** — bug fixes, docs, internal refactors
- **minor** — new props, new features, anything additive
- **major** — removing or renaming a prop, changing a default, changing the shape
  of `AccessibilitySettings`

CI fails a PR with no changeset unless it is labelled `no-changeset`. Merging to
`main` opens a release PR; merging *that* publishes to npm.
