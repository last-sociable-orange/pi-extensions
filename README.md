# CircuitPilot — Agent Team for Hardware Design

**CircuitPilot** is a [pi](https://pi.dev/) extension that enables multi-agent workflows for hardware/PCB design. A lead agent orchestrates a team of specialized sub-agents — each with their own system prompt, model, and tool permissions — to handle document processing, library management, and circuit design.

## Architecture

```
User → Lead Agent (AGENTS.md)
         │
         ├── subagent "doc"       → Process datasheets, convert PDF → Markdown
         ├── subagent "lib"       → Manage KiCad symbols, footprints, 3D models
         └── subagent "designer"  → Research products, write design documents
```

The lead agent delegates tasks to sub-agents via the `subagent` tool, which spawns isolated `pi` processes. Each sub-agent has its own context window, so large tasks don't pollute the main conversation.

## Repository Structure

```
pi-extensions/
├── pi-agent-team/
│   ├── AGENTS.md                         # Lead agent system prompt
│   ├── SYSTEM.md                         # File conventions, naming rules, workflow stages
│   ├── agents/                           # Sub-agent definitions
│   │   ├── doc.md                        # Document agent (PDF → Markdown, OCR)
│   │   ├── designer.md                   # Hardware designer (research, design docs)
│   │   └── lib.md                        # Library agent (symbols, footprints, 3D steps)
│   └── extensions/
│       └── subagents/
│           ├── index.ts                  # Subagent tool (single, parallel, chain modes)
│           └── agents.ts                 # Agent discovery and config parsing
├── setup.fish                            # One-command project bootstrap
└── README.md
```

## Sub-Agent Team

| Agent | Model | Description |
|-------|-------|-------------|
| **doc** | `opencode-go/qwen3.6-plus:medium` | Extracts PDF datasheets, converts to Markdown via `pdf-to-markdown`, OCRs equations, organizes project documents |
| **lib** | `deepseek/deepseek-v4-flash:high` | Processes downloaded KiCad libraries — renames, cleans, and quality-checks symbols, footprints, and 3D step files |
| **designer** | `deepseek/deepseek-v4-pro:high` | Researches product datasheets, performs circuit design calculations, writes design documents with traceable references |

Each agent is defined as a Markdown file with YAML frontmatter for metadata (name, model, tools, description) and a body containing the system prompt.

## Subagent Tool Modes

The extension supports three execution modes:

- **Single** — Delegate one task to one agent
- **Parallel** — Run multiple agents concurrently (up to 8 tasks, 4 at a time)
- **Chain** — Run agents sequentially, with `{previous}` placeholder to pass output between steps

## Project Setup

### Quick Start

```bash
./setup.fish
```

This creates the project skeleton and clones the subagents extension into `.pi/`.

### Manual Setup

1. Copy the extension into your project:
   ```bash
   mkdir -p .pi/extensions/subagents
   cp pi-agent-team/extensions/subagents/index.ts .pi/extensions/subagents/
   cp pi-agent-team/extensions/subagents/agents.ts .pi/extensions/subagents/
   ```

2. Copy agent definitions:
   ```bash
   mkdir -p .pi/agents
   cp pi-agent-team/agents/*.md .pi/agents/
   ```

3. Copy the lead agent prompt and system conventions:
   ```bash
   cp pi-agent-team/AGENTS.md .
   cp pi-agent-team/SYSTEM.md .pi/
   ```

4. Create the project directory structure:
   ```bash
   mkdir -p CAD WIP Knowledge Document kicad_lib/{Symbol/Symbol,Footprint/Footprint.pretty,Step} Datasheet
   ```

5. Run pi with `--system .pi/SYSTEM.md` (or however your pi configuration picks up `SYSTEM.md`).

### For Global Use

Agent definitions can also be placed at `~/.pi/agent/agents/` for use across all projects. Use `agentScope: "user"` in the subagent tool call to load only global agents, or `agentScope: "both"` to merge project and user agents (project agents take precedence on name collision).

## File Processing Workflow

The project follows a staged file workflow for all artifacts:

```
  WIP/          → Unprocessed downloads
    ↓
  <dir>/.wip/   → Agent is actively processing
    ↓
  <dir>/.review/ → Agent finished; awaiting user review
    ↓
  <dir>/        → User approved
```

Agents never delete files — they move unwanted files to `<dir>/.trash/` instead.

### Project Directory Layout

```
Project/
├── CAD/                    # KiCad project files (schematics, PCB)
├── Document/               # Design documents (Myst format)
├── Knowledge/              # Product datasheets in Markdown
│   └── IC-TPS62870-DS/    # One folder per document
├── Datasheet/              # Original PDF datasheets
├── kicad_lib/              # KiCad libraries
│   ├── Symbol/Symbol/      # Non-standard symbols
│   │   └── Standard.kicad_sym
│   ├── Footprint/Footprint.pretty/
│   └── Step/               # 3D models
└── WIP/                    # Incoming unprocessed files
```

## Naming Conventions

### Documents
```
<ProductType>-<ProductNumber>-<DocType>.pdf
```
Examples: `IC-TPS62870-DS.pdf`, `IC-MIMXRT1170-UM.pdf`

### Library Files
```
<ProductType>_<FullProductNumber>.<ext>
```
Examples: `XTAL_830108160801.kicad_sym`, `D_BAT54L2-TP.stp`

Product types follow reference designator conventions: `R`, `C`, `IC`, `D`, `L`, `Q`, `CON`, `SW`, `XTAL`, `FB`, `F`, etc. Full product number includes the package suffix (e.g., `TJA1051TK/3` not just `TJA1051T`).

## Dependencies

- **pi** — The coding agent harness
- **Required skills** (for doc agent): `pdf-to-markdown`, `pdf-utils`
- **KiCad** (for lib agent) — Symbol and footprint tools

## License

MIT
