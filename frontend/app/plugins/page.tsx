'use client';

import React, { useEffect, useState } from 'react';
import {
  Blocks,
  RefreshCw,
  Loader2,
  AlertCircle,
  Bot,
  Terminal,
  Wrench,
  ChevronDown,
  ChevronRight,
  Globe,
  FolderOpen,
} from 'lucide-react';
import { listPlugins } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PluginInfo } from '@/types';

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPlugins();
      setPlugins(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load plugins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Blocks className="w-6 h-6" />
            Plugins
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Installed from{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">~/.nanobot/plugins/</code>
            {' '}or{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;workspace&gt;/plugins/</code>
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!error && plugins.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Blocks className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No plugins installed</p>
            <p className="text-sm mt-2 max-w-sm mx-auto">
              Place a plugin directory in{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">~/.nanobot/plugins/</code>{' '}
              and restart nanobot.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plugin cards */}
      <div className="space-y-4">
        {plugins.map((plugin) => (
          <PluginCard key={plugin.name} plugin={plugin} />
        ))}
      </div>
    </div>
  );
}

function PluginCard({ plugin }: { plugin: PluginInfo }) {
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [commandsOpen, setCommandsOpen] = useState(true);
  const [skillsOpen, setSkillsOpen] = useState(false);

  const totalItems = plugin.agents.length + plugin.commands.length + plugin.skills.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold">{plugin.name}</CardTitle>
              <SourceBadge source={plugin.source} />
            </div>
            {plugin.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {plugin.description}
              </p>
            )}
          </div>
          {/* Summary chips */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {plugin.agents.length > 0 && (
              <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                <Bot className="w-3 h-3" />
                {plugin.agents.length} agent{plugin.agents.length !== 1 ? 's' : ''}
              </span>
            )}
            {plugin.commands.length > 0 && (
              <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                <Terminal className="w-3 h-3" />
                {plugin.commands.length} command{plugin.commands.length !== 1 ? 's' : ''}
              </span>
            )}
            {plugin.skills.length > 0 && (
              <span className="flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                <Wrench className="w-3 h-3" />
                {plugin.skills.length} skill{plugin.skills.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      {totalItems > 0 && (
        <CardContent className="pt-0 space-y-3">
          {/* Agents */}
          {plugin.agents.length > 0 && (
            <Section
              icon={<Bot className="w-3.5 h-3.5" />}
              label="Agents"
              count={plugin.agents.length}
              open={agentsOpen}
              onToggle={() => setAgentsOpen((v) => !v)}
            >
              <div className="divide-y divide-border rounded-md border">
                {plugin.agents.map((agent) => (
                  <div key={agent.name} className="px-3 py-2 flex items-start gap-3">
                    <code className="text-xs font-mono text-primary shrink-0 mt-0.5">
                      {agent.name}
                    </code>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {agent.description || '—'}
                      </p>
                    </div>
                    {agent.model && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {agent.model}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Commands */}
          {plugin.commands.length > 0 && (
            <Section
              icon={<Terminal className="w-3.5 h-3.5" />}
              label="Commands"
              count={plugin.commands.length}
              open={commandsOpen}
              onToggle={() => setCommandsOpen((v) => !v)}
            >
              <div className="divide-y divide-border rounded-md border">
                {plugin.commands.map((cmd) => (
                  <div key={cmd.name} className="px-3 py-2 flex items-start gap-3">
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <code className="text-xs font-mono text-primary">/{cmd.name}</code>
                      {cmd.argument_hint && (
                        <span className="text-xs text-muted-foreground">{cmd.argument_hint}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {cmd.description || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Skills */}
          {plugin.skills.length > 0 && (
            <Section
              icon={<Wrench className="w-3.5 h-3.5" />}
              label="Skills"
              count={plugin.skills.length}
              open={skillsOpen}
              onToggle={() => setSkillsOpen((v) => !v)}
            >
              <div className="flex flex-wrap gap-1.5">
                {plugin.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs font-mono">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Section>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function SourceBadge({ source }: { source: 'global' | 'workspace' }) {
  if (source === 'workspace') {
    return (
      <Badge variant="default" className="text-xs gap-1">
        <FolderOpen className="w-3 h-3" />
        workspace
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs gap-1">
      <Globe className="w-3 h-3" />
      global
    </Badge>
  );
}

function Section({
  icon,
  label,
  count,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-2 w-full text-left"
      >
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        {icon}
        {label}
        <span className="ml-1 text-muted-foreground/60">({count})</span>
      </button>
      {open && children}
    </div>
  );
}
