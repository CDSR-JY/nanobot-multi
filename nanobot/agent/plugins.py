"""Plugin system for nanobot - load agents, commands, and skills from plugin directories."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from loguru import logger


@dataclass
class PluginAgent:
    name: str
    description: str
    model: str | None
    system_prompt: str
    plugin_name: str


@dataclass
class PluginCommand:
    name: str
    description: str
    argument_hint: str | None
    content: str  # Raw body with $ARGUMENTS placeholder
    plugin_name: str

    def expand(self, arguments: str) -> str:
        return self.content.replace("$ARGUMENTS", arguments.strip())


@dataclass
class Plugin:
    name: str
    description: str
    source: str  # "global" or "workspace"
    agents: dict[str, PluginAgent] = field(default_factory=dict)
    commands: dict[str, PluginCommand] = field(default_factory=dict)
    skill_dirs: list[Path] = field(default_factory=list)


class PluginLoader:
    """
    Loads plugins from global and workspace plugin directories.

    Search paths (workspace takes priority over global):
      - Global:    ~/.nanobot/plugins/<plugin-name>/
      - Workspace: <workspace>/plugins/<plugin-name>/

    Each plugin directory may contain:
      - plugin.json              — manifest with name/description
      - agents/<name>.md         — agent definitions (frontmatter + system prompt)
      - commands/<name>.md       — slash command definitions (frontmatter + content)
      - skills/<name>/SKILL.md   — skill files exposed to SkillsLoader
    """

    GLOBAL_DIR = Path.home() / ".nanobot" / "plugins"

    def __init__(self, workspace: Path, global_dir: Path | None = None):
        self.workspace = workspace
        self.global_dir = global_dir or self.GLOBAL_DIR
        self.workspace_dir = workspace / "plugins"
        self._plugins: dict[str, Plugin] | None = None

    @property
    def plugins(self) -> dict[str, Plugin]:
        if self._plugins is None:
            self._plugins = self._load_all()
        return self._plugins

    def find_command(self, cmd_name: str) -> PluginCommand | None:
        """Find a command by name. Workspace plugins take priority over global."""
        for plugin in self.plugins.values():
            if plugin.source == "workspace" and cmd_name in plugin.commands:
                return plugin.commands[cmd_name]
        for plugin in self.plugins.values():
            if plugin.source == "global" and cmd_name in plugin.commands:
                return plugin.commands[cmd_name]
        return None

    def find_agent(self, agent_name: str) -> PluginAgent | None:
        """Find an agent by name. Workspace plugins take priority over global."""
        for plugin in self.plugins.values():
            if plugin.source == "workspace" and agent_name in plugin.agents:
                return plugin.agents[agent_name]
        for plugin in self.plugins.values():
            if plugin.source == "global" and agent_name in plugin.agents:
                return plugin.agents[agent_name]
        return None

    def get_skill_dirs(self) -> list[Path]:
        """Return all skill root directories contributed by plugins."""
        dirs = []
        for plugin in self.plugins.values():
            dirs.extend(plugin.skill_dirs)
        return dirs

    def build_agents_summary(self) -> str:
        """Build an XML summary of all plugin agents for the system prompt."""
        agents = []
        for plugin in self.plugins.values():
            agents.extend(plugin.agents.values())
        if not agents:
            return ""

        def esc(s: str) -> str:
            return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        lines = ["<agents>"]
        for agent in agents:
            lines.append("  <agent>")
            lines.append(f"    <name>{esc(agent.name)}</name>")
            lines.append(f"    <plugin>{esc(agent.plugin_name)}</plugin>")
            lines.append(f"    <description>{esc(agent.description)}</description>")
            if agent.model:
                lines.append(f"    <model>{esc(agent.model)}</model>")
            lines.append("  </agent>")
        lines.append("</agents>")
        return "\n".join(lines)

    def build_commands_summary(self) -> str:
        """Build an XML summary of all plugin commands for the system prompt."""
        commands = []
        for plugin in self.plugins.values():
            commands.extend(plugin.commands.values())
        if not commands:
            return ""

        def esc(s: str) -> str:
            return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        lines = ["<commands>"]
        for cmd in commands:
            lines.append("  <command>")
            lines.append(f"    <name>/{esc(cmd.name)}</name>")
            lines.append(f"    <plugin>{esc(cmd.plugin_name)}</plugin>")
            lines.append(f"    <description>{esc(cmd.description)}</description>")
            if cmd.argument_hint:
                lines.append(f"    <argument-hint>{esc(cmd.argument_hint)}</argument-hint>")
            lines.append("  </command>")
        lines.append("</commands>")
        return "\n".join(lines)

    # ------------------------------------------------------------------ private

    def _load_all(self) -> dict[str, Plugin]:
        """Load all plugins from global then workspace (workspace wins)."""
        plugins: dict[str, Plugin] = {}

        if self.global_dir.exists():
            for plugin_dir in sorted(self.global_dir.iterdir()):
                if plugin_dir.is_dir():
                    plugin = self._load_plugin(plugin_dir, "global")
                    if plugin:
                        plugins[plugin.name] = plugin
                        logger.debug("Loaded global plugin: {}", plugin.name)

        if self.workspace_dir.exists():
            for plugin_dir in sorted(self.workspace_dir.iterdir()):
                if plugin_dir.is_dir():
                    plugin = self._load_plugin(plugin_dir, "workspace")
                    if plugin:
                        plugins[plugin.name] = plugin  # override global
                        logger.debug("Loaded workspace plugin: {}", plugin.name)

        return plugins

    def _load_plugin(self, plugin_dir: Path, source: str) -> Plugin | None:
        """Load a single plugin from a directory."""
        try:
            name = plugin_dir.name
            description = ""

            # Look for plugin.json at root, then fall back to .claude-plugin/plugin.json
            # so that Claude Code plugin repos work without copying files.
            manifest_file = plugin_dir / "plugin.json"
            if not manifest_file.exists():
                manifest_file = plugin_dir / ".claude-plugin" / "plugin.json"
            if manifest_file.exists():
                try:
                    manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
                    name = manifest.get("name", name)
                    description = manifest.get("description", "")
                except (json.JSONDecodeError, OSError) as e:
                    logger.warning("Failed to parse plugin.json in {}: {}", plugin_dir, e)

            agents_dir = plugin_dir / "agents"
            agents = self._load_agents(agents_dir, name) if agents_dir.exists() else {}

            commands_dir = plugin_dir / "commands"
            commands = self._load_commands(commands_dir, name) if commands_dir.exists() else {}

            skills_dir = plugin_dir / "skills"
            skill_dirs = [skills_dir] if skills_dir.exists() else []

            return Plugin(
                name=name,
                description=description,
                source=source,
                agents=agents,
                commands=commands,
                skill_dirs=skill_dirs,
            )
        except Exception as e:
            logger.warning("Failed to load plugin from {}: {}", plugin_dir, e)
            return None

    def _load_agents(self, agents_dir: Path, plugin_name: str) -> dict[str, PluginAgent]:
        """Load agent .md files from a directory."""
        agents: dict[str, PluginAgent] = {}
        for md_file in sorted(agents_dir.glob("*.md")):
            try:
                content = md_file.read_text(encoding="utf-8")
                meta, body = self._parse_frontmatter(content)
                name = meta.get("name", md_file.stem)
                description = meta.get("description", "")
                model = meta.get("model") or None
                agents[name] = PluginAgent(
                    name=name,
                    description=description,
                    model=model,
                    system_prompt=body,
                    plugin_name=plugin_name,
                )
            except Exception as e:
                logger.warning("Failed to load agent {}: {}", md_file, e)
        return agents

    def _load_commands(self, commands_dir: Path, plugin_name: str) -> dict[str, PluginCommand]:
        """Load command .md files from a directory."""
        commands: dict[str, PluginCommand] = {}
        for md_file in sorted(commands_dir.glob("*.md")):
            try:
                content = md_file.read_text(encoding="utf-8")
                meta, body = self._parse_frontmatter(content)
                name = md_file.stem
                description = meta.get("description", "")
                argument_hint = meta.get("argument-hint") or None
                commands[name] = PluginCommand(
                    name=name,
                    description=description,
                    argument_hint=argument_hint,
                    content=body,
                    plugin_name=plugin_name,
                )
            except Exception as e:
                logger.warning("Failed to load command {}: {}", md_file, e)
        return commands

    def _parse_frontmatter(self, content: str) -> tuple[dict[str, str], str]:
        """
        Parse YAML frontmatter delimited by ``---`` lines.

        Returns (meta_dict, body). Supports simple ``key: value`` pairs and
        block scalars (``key: |``). Does not require PyYAML.
        """
        if not content.startswith("---"):
            return {}, content

        match = re.match(r"^---\n(.*?)\n---\n?", content, re.DOTALL)
        if not match:
            return {}, content

        raw = match.group(1)
        body = content[match.end():].strip()

        meta: dict[str, str] = {}
        lines = raw.split("\n")
        i = 0
        while i < len(lines):
            line = lines[i]
            if ":" in line and not line.startswith((" ", "\t")):
                key, _, value = line.partition(":")
                key = key.strip()
                value = value.strip()
                if value == "|":
                    # Block scalar: collect following indented lines
                    block_lines: list[str] = []
                    i += 1
                    while i < len(lines) and (lines[i].startswith("  ") or lines[i] == ""):
                        block_lines.append(lines[i][2:] if lines[i].startswith("  ") else "")
                        i += 1
                    meta[key] = "\n".join(block_lines).strip()
                    continue
                else:
                    meta[key] = value.strip("\"'")
            i += 1

        return meta, body
