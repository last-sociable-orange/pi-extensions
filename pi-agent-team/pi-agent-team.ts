import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { homedir } from "node:os";

// Constants
const AGENT_STATE_KEY = "agent-team-state";
const AGENT_SWITCH_PREFIX = "&";
const PROJECT_HASH_LENGTH = 16;
const DEFAULT_AGENT_NAME = "default";

// Agent name validation pattern
const AGENT_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

// Sanitize agent name for use in file paths
function sanitizeAgentName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// Agent configuration types
interface AgentConfig {
  name: string;
  model?: string;
  provider?: string;
  tools?: string[];
  thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
}

interface AgentTeamConfig {
  agents: AgentConfig[];
}

// Session state for each agent
interface AgentSessionState {
  agentName: string;
  sessionFile: string;
  lastTimestamp: number;
}

// Persisted extension state
// Persisted extension state
interface PersistedState {
  currentAgent: string | null;
  agentSessions: Record<string, AgentSessionState>;
}
function getGlobalStatePath(): string {
  return path.join(homedir(), ".pi", "agent-team-state.json");
}

// Load global state from file
async function loadGlobalState(): Promise<PersistedState | null> {
  try {
    const statePath = getGlobalStatePath();
    const content = await fs.readFile(statePath, "utf-8");
    return JSON.parse(content) as PersistedState;
  } catch {
    return null;
  }
}

// Save global state to file
async function saveGlobalState(state: PersistedState): Promise<void> {
  try {
    const statePath = getGlobalStatePath();
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error(`[agent-team] Failed to save global state: ${err}`);
  }
}

export default function (pi: ExtensionAPI) {
  // In-memory state (reconstructed from session on load)
  let currentAgent: string | null = null;
  const agents = new Map<string, AgentConfig>();
  const agentSessions = new Map<string, AgentSessionState>();
  let isProcessingSwitch = false;

  // Get session storage directory for agent sessions
  async function getAgentSessionDir(cwd: string): Promise<string> {
    const baseDir = path.join(homedir(), ".pi", "agent-sessions");
    // Create a project-specific subdirectory based on cwd hash
    const projectHash = Buffer.from(cwd).toString("base64url").slice(0, PROJECT_HASH_LENGTH);
    const sessionDir = path.join(baseDir, projectHash);
    await fs.mkdir(sessionDir, { recursive: true });
    return sessionDir;
  }

  // Load configuration from files
  async function loadConfig(cwd: string): Promise<AgentTeamConfig> {
    const configs: AgentTeamConfig[] = [];

    // Load global config
    const globalConfigPath = path.join(homedir(), ".pi", "agent-team.json");
    try {
      const content = await fs.readFile(globalConfigPath, "utf-8");
      const parsed = JSON.parse(content);
      if (validateConfig(parsed)) {
        configs.push(parsed);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`[agent-team] Error loading global config: ${err}`);
      }
    }

    // Load project config (overrides global)
    const projectConfigPath = path.join(cwd, ".pi", "agent-team.json");
    try {
      const content = await fs.readFile(projectConfigPath, "utf-8");
      const parsed = JSON.parse(content);
      if (validateConfig(parsed)) {
        configs.push(parsed);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error(`[agent-team] Error loading project config: ${err}`);
      }
    }

    // Merge configs (project overrides global)
    return mergeConfigs(configs);
  }

  // Basic config validation
  function validateConfig(config: unknown): config is AgentTeamConfig {
    if (!config || typeof config !== "object") return false;
    const c = config as Record<string, unknown>;
    if (!Array.isArray(c.agents)) {
      console.error("[agent-team] Invalid config: 'agents' must be an array");
      return false;
    }
    for (const agent of c.agents) {
      if (!agent || typeof agent !== "object" || typeof (agent as AgentConfig).name !== "string") {
        console.error("[agent-team] Invalid config: each agent must have a 'name' string");
        return false;
      }
    }
    return true;
  }

  // Merge multiple configs (later configs override earlier ones)
  function mergeConfigs(configs: AgentTeamConfig[]): AgentTeamConfig {
    const merged: AgentTeamConfig = { agents: [] };
    const seen = new Map<string, number>();

    for (const config of configs) {
      for (const agent of config.agents) {
        const existingIdx = seen.get(agent.name);
        if (existingIdx === undefined) {
          seen.set(agent.name, merged.agents.length);
          merged.agents.push({ ...agent });
        } else {
          // Merge with existing (override)
          merged.agents[existingIdx] = { ...merged.agents[existingIdx], ...agent };
        }
      }
    }

    return merged;
  }

  // Initialize agents from config
  async function initAgents(ctx: ExtensionContext) {
    const config = await loadConfig(ctx.cwd);
    agents.clear();
    for (const agent of config.agents) {
      agents.set(agent.name, agent);
    }
  }

  // Load prompt for agent from standard locations
  // Looks for: 1) .pi/prompts/{agentName}.md 2) ~/.pi/agent/prompts/{agentName}.md
  // Reports error if not found in either location
  async function loadPrompt(agent: AgentConfig, cwd: string, ctx: ExtensionContext): Promise<string | undefined> {
    const agentName = agent.name;

    // 1. Check project prompts directory: .pi/prompts/{agentName}.md
    const projectPromptPath = path.join(cwd, ".pi", "prompts", `${agentName}.md`);
    try {
      const content = await fs.readFile(projectPromptPath, "utf-8");
      return content;
    } catch {
      // File doesn't exist or can't be read, continue to next option
    }

    // 2. Check global prompts directory: ~/.pi/agent/prompts/{agentName}.md
    const globalPromptPath = path.join(homedir(), ".pi", "agent", "prompts", `${agentName}.md`);
    try {
      const content = await fs.readFile(globalPromptPath, "utf-8");
      return content;
    } catch {
      // File doesn't exist or can't be read
    }

    // Not found in either location - report error
    ctx.ui.notify(
      `"${agentName}.md" not found in ~/.pi/agent/prompts/ or .pi/prompts/`,
      "error",
    );
    return undefined;
  }

  // Validate agent name
  function isValidAgentName(name: string): boolean {
    return name.length > 0 && AGENT_NAME_PATTERN.test(name);
  }

  // Switch to a different agent
  async function switchToAgent(
    agentName: string,
    ctx: ExtensionContext,
  ): Promise<boolean> {
    if (isProcessingSwitch) {
      ctx.ui.notify("Agent switch already in progress", "warning");
      return false;
    }

    // Validate agent name format
    if (!isValidAgentName(agentName)) {
      ctx.ui.notify(
        `Invalid agent name "${agentName}". Use only letters, numbers, underscore, and hyphen.`,
        "error",
      );
      return false;
    }

    const agent = agents.get(agentName);
    if (!agent) {
      ctx.ui.notify(
        `Agent "${agentName}" not found. Use /agents to list available agents.`,
        "error",
      );
      return false;
    }

    // Don't switch if already on this agent
    if (currentAgent === agentName) {
      return true;
    }

    isProcessingSwitch = true;
    const previousAgent = currentAgent;

    try {
      const sessionDir = await getAgentSessionDir(ctx.cwd);

      // Save current agent's session reference
      if (previousAgent) {
        const currentSession = ctx.sessionManager.getSessionFile();
        if (currentSession) {
          agentSessions.set(previousAgent, {
            agentName: previousAgent,
            sessionFile: currentSession,
            lastTimestamp: Date.now(),
          });
        }
      }

      // Check if target agent has an existing session
      const existingState = agentSessions.get(agentName);
      let targetSessionFile: string;

      if (existingState && await fileExists(existingState.sessionFile)) {
        // Resume existing session
        targetSessionFile = existingState.sessionFile;
      } else {
        // Create new session file for this agent (sanitized name)
        const sanitized = sanitizeAgentName(agentName);
        targetSessionFile = path.join(sessionDir, `${sanitized}.jsonl`);
      }

      // Persist state to global file BEFORE switching
      const stateToSave: PersistedState = {
        currentAgent: agentName,
        agentSessions: Object.fromEntries(agentSessions),
      };
      await saveGlobalState(stateToSave);

      // Actually switch session
      const result = await ctx.switchSession(targetSessionFile);

      if (result.cancelled) {
        ctx.ui.notify("Agent switch cancelled", "warning");
        isProcessingSwitch = false;
        return false;
      }

      // Update state AFTER successful switch
      currentAgent = agentName;

      // Update status to show current agent
      updateAgentStatus(ctx);

      // Apply agent configuration to new session
      await applyAgentConfig(agent, ctx);

      // Show appropriate message
      if (existingState) {
        const timeAgo = getTimeAgo(existingState.lastTimestamp);
        ctx.ui.notify(`Switched to agent "${agentName}". Last conversation: ${timeAgo}`, "info");
      } else {
        ctx.ui.notify(`Started new session with agent "${agentName}"`, "info");
      }

      return true;
    } catch (err) {
      // Rollback state on error
      currentAgent = previousAgent;
      ctx.ui.notify(`Failed to switch agent: ${err}`, "error");
      return false;
    } finally {
      isProcessingSwitch = false;
    }
  }

  // Helper to check file existence
  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Apply agent configuration (model, prompt, tools, etc.)
  async function applyAgentConfig(agent: AgentConfig, ctx: ExtensionContext) {
    // Set model if specified
    if (agent.model && agent.provider) {
      const model = ctx.modelRegistry.find(agent.provider, agent.model);
      if (model) {
        const success = await pi.setModel(model);
        if (!success) {
          ctx.ui.notify(`No API key available for ${agent.provider}/${agent.model}`, "warning");
        }
      } else {
        ctx.ui.notify(`Model ${agent.provider}/${agent.model} not found`, "warning");
      }
    }

    // Set thinking level if specified
    if (agent.thinkingLevel) {
      pi.setThinkingLevel(agent.thinkingLevel);
    }

    // Set active tools if specified
    if (agent.tools !== undefined) {
      if (agent.tools.length === 0) {
        // Empty array means no tools allowed
        pi.setActiveTools([]);
      } else {
        const allTools = pi.getAllTools();
        const validTools = agent.tools.filter((t) =>
          allTools.some((at) => at.name === t),
        );
        const invalidTools = agent.tools.filter((t) =>
          !allTools.some((at) => at.name === t),
        );
        if (invalidTools.length > 0) {
          console.warn(`[agent-team] Invalid tools for agent ${agent.name}: ${invalidTools.join(", ")}`);
        }
        pi.setActiveTools(validTools);
      }
    }
  }

  // Format time ago
  function getTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  // Update footer to show current agent name prepended to model/thinking line
  function updateAgentStatus(ctx: ExtensionContext) {
    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsub = footerData.onBranchChange(() => tui.requestRender());
      return {
        dispose: unsub,
        invalidate() {},
        render(width: number): string[] {
          // Line 1: Directory with git branch
          const cwd = ctx.cwd.replace(homedir(), "~");
          const branch = footerData.getGitBranch();
          const dirLine = branch ? `${cwd} (${branch})` : cwd;

          // Line 2: Token stats on left, agentName • model • thinking on right
          let input = 0, output = 0, cost = 0;
          for (const e of ctx.sessionManager.getBranch()) {
            if (e.type === "message" && e.message.role === "assistant") {
              const usage = (e.message as any).usage;
              if (usage) {
                input += usage.input || 0;
                output += usage.output || 0;
                cost += usage.cost?.total || 0;
              }
            }
          }
          const fmt = (n: number) => n < 1000 ? `${n}` : `${(n / 1000).toFixed(1)}k`;
          const total = input + output;
          const budget = ctx.model?.contextLength || 0;
          const pct = budget > 0 ? ((total / budget) * 100).toFixed(1) : "0";
          const left = theme.fg("dim", `${fmt(input)} ↓${fmt(output)} R${fmt(input)} $${cost.toFixed(3)} ${pct}%/${fmt(budget)} (auto)`);

          // Right side: agentName • model • thinking
          const agentName = currentAgent || DEFAULT_AGENT_NAME;
          const model = ctx.model;
          const thinkingLevel = pi.getThinkingLevel() || "off";
          const parts: string[] = [agentName];
          if (model) {
            parts.push(model.id);
          }
          parts.push(thinkingLevel);
          const right = theme.fg("dim", parts.join(" • "));

          // Combine line 2 with padding
          const visibleLeft = visibleWidth(left);
          const visibleRight = visibleWidth(right);
          const padding = " ".repeat(Math.max(1, width - visibleLeft - visibleRight));
          const line2 = truncateToWidth(left + padding + right, width);

          return [theme.fg("dim", dirLine), line2];
        },
      };
    });
  }

  // Session start - initialize and restore state
  pi.on("session_start", async (event, ctx) => {
    await initAgents(ctx);

    // Restore state from global state file (persists across sessions)
    const globalState = await loadGlobalState();
    if (globalState) {
      currentAgent = globalState.currentAgent;
      agentSessions.clear();
      for (const [name, state] of Object.entries(globalState.agentSessions)) {
        agentSessions.set(name, state);
      }
    }

    // Update status with current agent
    updateAgentStatus(ctx);

    // If we have a current agent, apply its config
    if (currentAgent && event.reason === "startup") {
      const agent = agents.get(currentAgent);
      if (agent) {
        await applyAgentConfig(agent, ctx);
        ctx.ui.notify(`Restored session for agent "${currentAgent}"`, "info");
      }
    }
  });

  // Handle input for agent switching
  pi.on("input", async (event, ctx) => {
    const text = event.text.trim();

    // Check for agent switch pattern: &agentName or &agentName message or &agentName, message
    if (text.startsWith(AGENT_SWITCH_PREFIX)) {
      const rest = text.slice(1).trim();

      let agentName: string;
      let message: string | undefined;

      // Find separator: comma takes precedence, then space
      const commaIdx = rest.indexOf(",");
      const spaceIdx = rest.indexOf(" ");

      if (commaIdx !== -1) {
        // &agentName, message
        agentName = rest.slice(0, commaIdx).trim();
        message = rest.slice(commaIdx + 1).trim();
      } else if (spaceIdx !== -1) {
        // &agentName message (space separated)
        agentName = rest.slice(0, spaceIdx).trim();
        message = rest.slice(spaceIdx + 1).trim();
      } else {
        // Just &agentName - switch without message
        agentName = rest;
      }

      // Validate agent name
      if (!agentName) {
        ctx.ui.notify("Usage: &<agent-name> [message] or &<agent-name>, message", "warning");
        return { action: "handled" };
      }

      // Switch to the agent
      const success = await switchToAgent(agentName, ctx);
      if (!success) {
        return { action: "handled" };
      }

      // If there's a message, transform it to continue processing
      if (message) {
        return { action: "transform", text: message };
      }

      // Just switched, no message to process
      return { action: "handled" };
    }

    return { action: "continue" };
  });

  // Modify system prompt based on current agent
  // Agent persona is appended after any SYSTEM.md or APPEND_SYSTEM.md content
  pi.on("before_agent_start", async (event, ctx) => {
    if (!currentAgent) return {};

    const agent = agents.get(currentAgent);
    if (!agent) return {};

    const prompt = await loadPrompt(agent, ctx.cwd, ctx);
    if (prompt) {
      // Append agent persona to the system prompt (which may already include SYSTEM.md)
      return {
        systemPrompt: `${event.systemPrompt}\n\n## Agent Persona: ${agent.name}\n${prompt}`,
      };
    }

    return {};
  });

  // Register /agents command - list all agents
  pi.registerCommand("agents", {
    description: "List all configured agents",
    handler: async (_args, ctx) => {
      if (agents.size === 0) {
        ctx.ui.notify(
          "No agents configured. Create ~/.pi/agent-team.json or .pi/agent-team.json",
          "warning",
        );
        return;
      }

      const lines: string[] = ["Configured agents:"];
      for (const [name, config] of agents) {
        const isCurrent = name === currentAgent;
        const marker = isCurrent ? "→ " : "  ";
        const model = config.model ? ` (${config.provider}/${config.model})` : "";
        const hasSession = agentSessions.has(name);
        const sessionIndicator = hasSession ? " 📂" : "";
        lines.push(`${marker}${name}${model}${sessionIndicator}`);
      }

      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  // Register /agent command - switch to agent
  pi.registerCommand("agent", {
    description: "Switch to a specific agent",
    getArgumentCompletions: (prefix) => {
      const agentNames = Array.from(agents.keys());
      const matches = agentNames.filter((a) =>
        a.toLowerCase().startsWith(prefix.toLowerCase()),
      );
      return matches.map((a) => ({ value: a, label: a }));
    },
    handler: async (args, ctx) => {
      const agentName = args.trim();
      if (!agentName) {
        ctx.ui.notify("Usage: /agent <agent-name>", "warning");
        return;
      }

      await switchToAgent(agentName, ctx);
    },
  });

  // Register skill paths (global for all agents)
  // Uses default pi skill folders - no separate agent-skills directory needed
  pi.on("resources_discover", async (_event, _ctx) => {
    // Skills are loaded from default pi locations:
    // - Global: ~/.pi/agent/skills/ or ~/.agents/skills/
    // - Project: .pi/skills/ or .agents/skills/
    // No additional skill paths needed - extension uses standard pi skill discovery
    return {};
  });

  // Clean up on session shutdown - save global state
  pi.on("session_shutdown", async () => {
    const state: PersistedState = {
      currentAgent,
      agentSessions: Object.fromEntries(agentSessions),
    };
    await saveGlobalState(state);
  });
}