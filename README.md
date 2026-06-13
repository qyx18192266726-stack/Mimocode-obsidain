# MiMo Code plugin for Obsidian

Give your notes AI capability by embedding [MiMo Code](https://mimocode.ai) AI assistant directly in Obsidian.

## Use cases

- Summarize and distill long-form content
- Draft, edit, and refine your writing
- Query and explore your knowledge base
- Generate outlines and structured notes

## Requirements

- Desktop only (uses Node.js child processes)
- [MiMo Code CLI](https://mimocode.ai) installed
- [Bun](https://bun.sh) installed

## Installation

### For Users (BRAT - Recommended for Beta Testing)

The easiest way to install this plugin during beta is via [BRAT](https://github.com/TfTHacker/obsidian42-brat) (Beta Reviewer's Auto-update Tool):

1. Install the BRAT plugin from Obsidian Community Plugins
2. Open BRAT settings and click "Add Beta plugin"
3. Enter: `your-username/obsidian-mimocode`
4. Click "Add Plugin" - BRAT will install the latest release automatically
5. Enable the MiMo Code plugin in Obsidian Settings > Community Plugins

BRAT will automatically check for updates and notify you when new versions are available.

### For Developers

If you want to contribute or develop the plugin:

1. Clone to `.obsidian/plugins/obsidian-mimocode` subdirectory under your vault's root:

```bash
git clone https://github.com/your-username/obsidian-mimocode.git .obsidian/plugins/obsidian-mimocode
```

2. Install dependencies and build:

```bash
bun install && bun run build
```

3. Enable in Obsidian Settings > Community Plugins
4. Add AGENTS.md to your workspace root to guide the AI assistant

## Usage

- Click the terminal icon in the ribbon, or
- `Cmd/Ctrl+Shift+M` to toggle the panel
- Server starts automatically when you open the panel

## Settings

### Custom Command Mode

Enable "Use custom command" when you need more control over how MiMo Code starts—for example, to add extra CLI flags, use a custom wrapper script, or run MiMo Code through a container or virtual environment.

When using custom command:

- **Hostname and port must match** the values set in the Port and Hostname fields above
- **You must include `--cors app://obsidian.md`** to allow Obsidian to embed the MiMo Code interface

Example:

```
mimocode serve --port 14096 --hostname 127.0.0.1 --cors app://obsidian.md
```

Other settings (port, hostname, auto-start, view location, context injection) are available through the settings UI and are self-explanatory.

### Context injection (experimental)

This plugin can automatically inject context to the running MiMo Code instance: list of open notes and currently selected text.

Currently, this is work-in-progress feature with some limitations - it won't work when creating new session from MiMo Code interface.

## Windows Troubleshooting

If you see "Executable not found at 'mimocode'" despite mimocode being installed:

1. Find your mimocode.cmd path:

```
where mimocode.cmd
```

2. Configure the full path in plugin settings:

```
C:\Users\{username}\AppData\Roaming\npm\mimocode.cmd
```

This is due to Electron/Obsidian not fully inheriting PATH on Windows.

## About

Embed MiMo Code AI assistant directly in Obsidian's sidebar.

### License

MIT license
