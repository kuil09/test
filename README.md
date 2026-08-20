# Orbit Mindmap

A local-first mind-map web app with WebMCP support.

## Features

- Add, edit, delete, drag, and reparent mind-map nodes
- Pan, zoom, fit-to-view, and deterministic auto layout
- Automatic browser `localStorage` persistence
- JSON import/export
- GitHub Pages deployment
- Chrome WebMCP imperative API integration

## WebMCP tools

When `document.modelContext` is available the app registers:

- `get_map`
- `create_map`
- `add_node`
- `update_node`
- `reparent_node`
- `delete_node`
- `focus_node`

The implementation intentionally uses the current `document.modelContext` API rather than the deprecated `navigator.modelContext` entry point.

WebMCP is experimental. For local testing, use Chrome 149+ and enable `chrome://flags/#enable-webmcp-testing`. Public availability follows the Chrome WebMCP origin-trial requirements while the API remains experimental.

## Development

Requires Node.js 22 or newer and has no runtime dependencies.

```bash
npm test
npm run build
npm run check
```

`dist/` is generated output and is not committed.

## Deployment

Pushes to `main` run the Pages workflow, which tests, builds, and deploys the app.

Live URL: `https://kuil09.github.io/test/`
