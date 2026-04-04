# pi-agent-team

A [pi](https://github.com/mariozechner/pi) extension that enables multi-agent workflows with distinct personas, models, and capabilities.

## Overview

pi-agent-team extends pi's single-agent interface into a collaborative multi-agent environment. Define specialized agents—each with their own model, system prompt, tool permissions, and thinking level—and switch between them on the fly using the `&` prefix.

This is useful for:
- **Code reviews** – Have a dedicated reviewer agent with security focus
- **Documentation** – Switch to a technical writer agent for READMEs
- **Architecture discussions** – Bring in an architect agent for design decisions
- **Tool-constrained advisors** – Create agents with no tool access for pure consultation

## What's Included

| File | Description |
|------|-------------|
| `pi-agent-team.ts` | Main extension source (TypeScript) – implements agent switching, session management, and prompt customization |
| `agent-team.json` | Example project-level configuration with 5 agents (architect, designer, qa, librarian, assistant) |
| `example-config.json` | Sample global configuration demonstrating 3 agents (tom, mike, sarah) with different providers and capabilities |
| `requirement.txt` | Requirements specification documenting the feature set and expected behavior |

### Key Features

- **Agent Switching**: Call agents with `&agentName[, message]` syntax
- **Per-Agent Configuration**: Each agent has independent model, provider, tools, and thinking level
- **Session Persistence**: Agent sessions are suspended and restored when switching; each agent maintains isolated conversation history
- **Dual Config Support**: Global config at `~/.pi/agent-team.json` and project-level config at `.pi/agent-team.json`
- **Prompt Discovery**: Agent prompts loaded from `.pi/prompts/{agent}.md` or `~/.pi/agent/prompts/{agent}.md`
- **Visual Prompt**: Current agent name displayed as a terminal-style prefix (`agent $`)
- **Built-in Commands**: `/agents` to list agents, `/agent <name>` to switch

### Repository Structure

```
pi-agent-team/
├── pi-agent-team.ts      # Extension implementation
├── agent-team.json       # Example project config (5 agents)
├── example-config.json   # Example global config (3 agents)
├── requirement.txt       # Feature requirements
└── README.md             # Documentation
```

## Quick Start

1. Copy `pi-agent-team.ts` to your pi extensions directory:
   ```bash
   mkdir -p ~/.pi/agent/extensions
   cp pi-agent-team.ts ~/.pi/agent/extensions/
   ```

2. Create a configuration file at `~/.pi/agent-team.json` (use `example-config.json` as a template)

3. Create agent prompt files at `~/.pi/agent/prompts/{agent-name}.md`

4. Restart pi or run `/reload`

5. Switch agents with `&agentName` or `&agentName, your message here`

## License

MIT
