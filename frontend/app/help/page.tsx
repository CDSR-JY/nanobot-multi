'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Terminal,
  Layers,
  Wifi,
  WifiOff,
  Loader2,
  Plus,
  Trash2,
  Send,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ icon, title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-accent/50 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-primary">{icon}</span>
        <span className="font-medium flex-1">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 py-4 space-y-3 text-sm text-muted-foreground border-t border-border bg-background">
          {children}
        </div>
      )}
    </div>
  );
}

function Tag({ children, color = 'default' }: { children: React.ReactNode; color?: 'green' | 'yellow' | 'red' | 'default' }) {
  const cls = {
    green: 'bg-green-900/30 text-green-400 border-green-800',
    yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
    red: 'bg-red-900/30 text-red-400 border-red-800',
    default: 'bg-muted text-foreground border-border',
  }[color];
  return (
    <span className={`inline-block px-2 py-0.5 rounded border text-xs font-mono ${cls}`}>
      {children}
    </span>
  );
}

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">使用帮助</h1>
        <p className="text-muted-foreground text-sm">了解如何使用 nanobot 的各项功能</p>
      </div>

      <Section icon={<MessageSquare className="w-5 h-5" />} title="如何开始对话" defaultOpen>
        <p>登录后，你会看到主界面分为左侧<strong className="text-foreground">对话列表</strong>和右侧<strong className="text-foreground">聊天区域</strong>。</p>
        <ol className="list-decimal list-inside space-y-1.5 ml-1">
          <li>在底部输入框中输入你的问题或指令</li>
          <li>按 <Tag>Enter</Tag> 发送，按 <Tag>Shift + Enter</Tag> 换行</li>
          <li>等待 nanobot 回复（右上角会显示"思考中..."）</li>
        </ol>
        <p className="mt-1">
          点击左上角的 <Tag>新对话</Tag> 按钮可以开启一个全新的对话，历史对话会保存在左侧列表中。
        </p>
      </Section>

      <Section icon={<Terminal className="w-5 h-5" />} title="斜杠命令（/命令）">
        <p>在输入框中输入 <Tag>/</Tag> 可以呼出命令选择菜单，列出所有可用的快捷指令。</p>
        <ul className="space-y-1.5 ml-1">
          <li>输入 <Tag>/</Tag> 后继续输入关键词可以过滤命令</li>
          <li>用 <Tag>↑</Tag> <Tag>↓</Tag> 方向键选择命令</li>
          <li>按 <Tag>Enter</Tag> 或 <Tag>Tab</Tag> 确认选择</li>
          <li>按 <Tag>Esc</Tag> 关闭命令菜单</li>
        </ul>
        <p>命令由内置功能或已安装的插件提供，可在<strong className="text-foreground">技能</strong>和<strong className="text-foreground">插件</strong>页面查看详情。</p>
      </Section>

      <Section icon={<Layers className="w-5 h-5" />} title="对话管理">
        <ul className="space-y-2 ml-1">
          <li>
            <span className="inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /><strong className="text-foreground">新对话</strong></span>
            {' '}— 创建一个新的独立对话，不会影响现有对话
          </li>
          <li>
            <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /><strong className="text-foreground">切换对话</strong></span>
            {' '}— 点击左侧列表中的对话条目即可切换
          </li>
          <li>
            <span className="inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /><strong className="text-foreground">删除对话</strong></span>
            {' '}— 鼠标悬停在对话条目上，点击右侧垃圾桶图标删除
          </li>
        </ul>
        <p className="text-xs mt-1 text-muted-foreground/70">对话历史保存在服务器端，重新登录后仍可查看。</p>
      </Section>

      <Section icon={<Wifi className="w-5 h-5" />} title="连接状态说明">
        <p>右上角导航栏会显示当前连接状态：</p>
        <div className="space-y-2 ml-1 mt-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <Tag color="green">已连接</Tag>
            <span>— nanobot 服务正常运行，可以正常对话</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
            <Tag color="yellow">连接中 / 检查中</Tag>
            <span>— 正在建立连接或检测服务状态，请稍等</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <Tag color="red">服务离线</Tag>
            <span>— 已连接到网关，但 nanobot 用户服务未启动</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <Tag color="red">未连接</Tag>
            <span>— 无法连接到服务器，系统会自动重试</span>
          </div>
        </div>
        <p className="mt-3 text-xs">
          <strong className="text-foreground">提示：</strong>若长时间显示"服务离线"，请联系管理员确认你的 nanobot 实例是否已启动。
        </p>
      </Section>

      <Section icon={<Send className="w-5 h-5" />} title="输入技巧">
        <ul className="space-y-2 ml-1">
          <li><Tag>Enter</Tag> — 发送消息</li>
          <li><Tag>Shift + Enter</Tag> — 在消息中插入换行，不发送</li>
          <li>使用中文输入法时，选字过程中按 Enter 不会误发送，选好汉字后再按 Enter 才会发送</li>
          <li>输入 <Tag>/</Tag> 可以快速调用内置命令和插件功能</li>
        </ul>
      </Section>

      <Section icon={<WifiOff className="w-5 h-5" />} title="常见问题">
        <div className="space-y-4">
          <div>
            <p className="font-medium text-foreground mb-1">Q：发送消息后一直没有回复？</p>
            <p>请检查右上角连接状态是否为"已连接"。若显示"服务离线"或"未连接"，说明后端服务未运行，消息无法被处理。</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Q：如何查看 nanobot 的运行状态？</p>
            <p>点击顶部导航栏的<strong className="text-foreground">状态</strong>页面，可以查看服务配置、AI 模型、各通道和定时任务的运行状况。</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Q：如何使用定时任务？</p>
            <p>点击顶部导航栏的<strong className="text-foreground">定时任务</strong>，可以添加、启用或禁用周期性执行的指令，例如定时提醒、数据采集等。</p>
          </div>
          <div>
            <p className="font-medium text-foreground mb-1">Q：什么是技能和插件？</p>
            <p><strong className="text-foreground">技能</strong>是可上传的自定义提示词包，扩展 nanobot 的能力范围。<strong className="text-foreground">插件</strong>是更完整的功能扩展，可以提供新的斜杠命令、专用 Agent 等。</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
