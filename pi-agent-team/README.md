# pi-agent-team Extension

A pi extension that enables multi-agent workflows with distinct personas, models, and capabilities.

## Features

- **Agent Switching**: Call different agents using `&` prefix (e.g., `&tom, review this code`)
- **Per-Agent Configuration**: Each agent has its own model, system prompt, tools, and thinking level
- **Session Persistence**: Agent sessions are saved and restored when switching between agents
- **Project/Global Config**: Configure agents globally in `~/.pi/agent-team.json` or per-project in `.pi/agent-team.json`
- **Custom Prompt**: Shows `<agent-name> $` prefix in the input area like a terminal prompt

## Installation

1. Copy `pi-agent-team.ts` to your extensions directory:
   ```bash
   # Global (all projects)
   mkdir -p ~/.pi/agent/extensions
   cp pi-agent-team.ts ~/.pi/agent/extensions/

   # Or project-local
   mkdir -p .pi/extensions
   cp pi-agent-team.ts .pi/extensions/
   ```

2. Create your agent configuration (see Configuration section)

3. Restart pi or run `/reload`

## Configuration

Create a configuration file at either:
- **Global**: `~/.pi/agent-team.json`
- **Project**: `.pi/agent-team.json` (overrides global settings)

### Example Configuration

```json
{
  "agents": [
    {
      "name": "tom",
      "provider": "anthropic",
      "model": "claude-sonnet-4-5",
      "tools": ["read", "edit", "bash", "grep", "find"],
      "thinkingLevel": "medium"
    },
    {
      "name": "mike",
      "provider": "anthropic",
      "model": "claude-sonnet-4-5",
      "tools": ["read", "write", "edit"],
      "thinkingLevel": "low"
    },
    {
      "name": "sarah",
      "provider": "openai",
      "model": "gpt-4.1",
      "tools": [],
      "thinkingLevel": "high"
    }
  ]
}
```

### Agent Configuration Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique agent identifier (letters, numbers, underscore, hyphen only) |
| `provider` | string | Model provider (e.g., "anthropic", "openai") |
| `model` | string | Model ID (e.g., "claude-sonnet-4-5") |
| `tools` | string[] | List of tool names this agent can use. Use `[]` to disable all tools. |
| `thinkingLevel` | string | Thinking level: "off", "minimal", "low", "medium", "high", "xhigh" |

### Agent Prompt Discovery

Agent prompts **must** be placed in the standard pi prompt template locations:

1. **Project prompt**: `.pi/prompts/{agent-name}.md`
2. **Global prompt**: `~/.pi/agent/prompts/{agent-name}.md`

The extension searches in this order and reports an error if the prompt file is not found.

**Example:**
For an agent named `tom`, create a file at `.pi/prompts/tom.md`:
```markdown
You are Tom, a senior code reviewer. Focus on code quality, security issues, and best practices.
```

**Error:**
If the prompt file is not found, you'll see:
```
"tom.md" not found in ~/.pi/agent/prompts/ or .pi/prompts/
```

### System Prompt Interaction

Agent prompts work alongside pi's built-in system prompt customization:

**Order of application:**
1. Default system prompt
2. `.pi/SYSTEM.md` (project) or `~/.pi/agent/SYSTEM.md` (global) - if present, replaces default
3. `APPEND_SYSTEM.md` - if present, appends to system prompt
4. **Agent persona prompt** (from prompt file or config) - appended as "## Agent Persona: {name}\n{prompt}"

This means agent persona prompts (loaded from `.pi/prompts/{agent}.md` or `~/.pi/agent/prompts/{agent}.md`) are always applied last, ensuring the agent's persona takes precedence while still respecting your global/project system prompt customizations.

### Agent Name Restrictions

Agent names must:
- Contain only: letters (`a-z`, `A-Z`), numbers (`0-9`), underscore (`_`), and hyphen (`-`)
- Be at least 1 character long
- Be unique within the configuration

Valid names: `tom`, `code-reviewer`, `agent_1`, `docs-writer`  
Invalid names: `my agent` (space), `tom@home` (special char), `../etc` (path traversal attempt)

## Usage

### Switch to an Agent

```
&tom, review this function
```

This will:
1. Switch to the "tom" agent
2. Send the message "review this function"

### Just Switch (No Message)

```
&tom
```

Switches to agent "tom" without sending a message.

### Commands

| Command | Description |
|---------|-------------|
| `/agents` | List all configured agents |
| `/agent <name>` | Switch to a specific agent |

### Prompt Prefix

The current agent name is shown in the input area as a prompt prefix:
```
tom $ _
```

This works like a Linux terminal prompt, showing which agent is currently active. When you switch agents, the prompt updates immediately.

## Session Management

When you switch agents:
1. The current agent's session is suspended and saved
2. The target agent's session is restored (or a new one is created)
3. A notification shows when you last talked to that agent

Each agent maintains its own:
- Conversation history
- Model configuration
- Tool settings
- System prompt

### Session Storage Location

Agent sessions are stored in:
```
~/.pi/agent-sessions/<project-hash>/<agent-name>.jsonl
```

The project hash is derived from the current working directory, so different projects have isolated agent sessions.

### State Persistence

Agent team state is saved to a global file that persists across sessions:
```
~/.pi/agent-team-state.json
```

This file tracks:
- Which agent is currently active
- Session file locations for each agent
- Last conversation timestamps

## Available Tools

| Tool | Description |
|------|-------------|
| `read` | Read file contents |
| `write` | Write/create files |
| `edit` | Edit files using exact text replacement |
| `bash` | Execute shell commands |
| `grep` | Search for text patterns in files |
| `find` | Find files by name |
| `ls` | List directory contents |

## Skills Directory

This extension uses pi's default skill folders. Skills placed in these locations are available to all agents:
- **Global**: `~/.pi/agent/skills/` or `~/.agents/skills/`
- **Project**: `.pi/skills/` or `.agents/skills/`

Skills are automatically discovered and loaded by pi. No additional configuration is needed.

### Disabling All Tools

To create an agent that cannot use any tools, set `tools` to an empty array:

```json
{
  "name": "advisor",
  "prompt": "You are an advisor who only provides guidance without executing commands.",
  "tools": []
}
```

## Example Workflow

```
# Start with default agent
Write a function to calculate fibonacci numbers

# Switch to reviewer
&tom, review the fibonacci function I just wrote

# Switch to documentation writer
&mike, write documentation for the fibonacci function

# Back to coding
&tom
Let's optimize this function for large numbers

# Switch to an agent with no tools (advisory only)
&advisor
What are the security implications of this approach?
```

## Troubleshooting

### "Agent name must contain only letters, numbers, underscore, and hyphen"

Agent names are validated to prevent file system issues. Rename your agent to use only allowed characters.

### "No agents configured"

Create a configuration file at `~/.pi/agent-team.json` or `.pi/agent-team.json` with your agent definitions.

### Session not restored

Check that `~/.pi/agent-team-state.json` exists and contains valid JSON. If corrupted, you can delete it to start fresh (you'll lose session history).
