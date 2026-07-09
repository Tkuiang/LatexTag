# LaTeX Tag

LaTeX Tag is a SiYuan plugin that automatically numbers display math blocks in
the current document.

## Features

- Scans display math blocks only.
- Adds missing `\tag{x}` values.
- Fixes incorrect or duplicate tags according to document order.
- Re-numbers after formula insertion, deletion, edits, and document switches.
- Provides a top bar toggle.
- Removes generated tags when disabled.

## Development

```bash
pnpm i
pnpm run dev
```

For convenient debugging, place this folder under:

```text
{SiYuan workspace}/data/plugins/LatexTag
```

## Build

```bash
pnpm run package
```

The package command creates `package.zip` for release.
