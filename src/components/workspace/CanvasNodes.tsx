'use client';

import React from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import {
  AlertCircle,
  Flag,
  GitBranch,
  Layers,
  Repeat,
  Sparkles,
  UserCheck,
  Zap,
} from 'lucide-react';
import type { PrdinNodeData } from '@/lib/types/prdin';

export type RfPrdinNode = Node<PrdinNodeData, 'uxResearch' | 'businessFlow'>;

const UX_STYLE_MAP: Record<
  string,
  { badge: string; badgeBg: string; border: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  'ux-persona': {
    badge: 'Persona (Q1)',
    badgeBg: 'bg-[#38BDF8]/15 text-[#7DD3FC]',
    border: 'border-[#38BDF8]/35',
    Icon: UserCheck,
  },
  'ux-pain': {
    badge: 'UX Research / Pain',
    badgeBg: 'bg-[#5A4CF5]/20 text-[#C4B5FD]',
    border: 'border-[#5A4CF5]/40',
    Icon: AlertCircle,
  },
  'ux-value': {
    badge: 'Daya Tarik (Q4)',
    badgeBg: 'bg-[#2F6BFF]/20 text-[#93C5FD]',
    border: 'border-[#2F6BFF]/40',
    Icon: Zap,
  },
  'ux-retention': {
    badge: 'Retensi (Q5)',
    badgeBg: 'bg-[#6366F1]/20 text-[#A5B4FC]',
    border: 'border-[#6366F1]/40',
    Icon: Repeat,
  },
};

export function UxResearchNode({ data, selected }: NodeProps<RfPrdinNode>) {
  const style = UX_STYLE_MAP[data.kind] ?? UX_STYLE_MAP['ux-pain'];
  const Icon = style.Icon;

  return (
    <div
      className={`w-[260px] rounded-2xl border bg-[#16161B] p-3.5 shadow-lg transition-all ${
        selected
          ? 'border-[#38BDF8] ring-4 ring-[#38BDF8]/20'
          : `${style.border} hover:border-[#38BDF8]/65`
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.badgeBg}`}
        >
          <Icon className="h-3 w-3" />
          {style.badge}
        </span>
        <span className="text-[10px] font-medium text-[#6E6E6E]">UX Research</span>
      </div>

      <h4 className="mt-2 text-xs font-semibold leading-snug text-white">{data.title}</h4>
      <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-[#8C8C8C]">
        {data.subtitle}
      </p>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-[#16161B] !bg-[#38BDF8]"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-[#16161B] !bg-[#38BDF8]"
      />
    </div>
  );
}

const FLOW_STYLE_MAP: Record<
  string,
  { badge: string; badgeBg: string; accent: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  'flow-start': {
    badge: 'Mulai / Q2',
    badgeBg: 'bg-[#38BDF8]/15 text-[#7DD3FC]',
    accent: 'border-l-4 border-l-[#38BDF8]',
    Icon: Flag,
  },
  'flow-feature': {
    badge: 'Wajib / Q3',
    badgeBg: 'bg-[#2F6BFF]/20 text-[#93C5FD]',
    accent: 'border-l-4 border-l-[#2F6BFF]',
    Icon: Layers,
  },
  'flow-decision': {
    badge: 'Validasi / Gate',
    badgeBg: 'bg-[#6366F1]/20 text-[#A5B4FC]',
    accent: 'border-l-4 border-l-[#6366F1]',
    Icon: GitBranch,
  },
  'flow-outcome': {
    badge: 'Hasil & Retensi',
    badgeBg: 'bg-[#5A4CF5]/22 text-[#C4B5FD]',
    accent: 'border-l-4 border-l-[#5A4CF5]',
    Icon: Sparkles,
  },
};

export function BusinessFlowNode({ data, selected }: NodeProps<RfPrdinNode>) {
  const style = FLOW_STYLE_MAP[data.kind] ?? FLOW_STYLE_MAP['flow-feature'];
  const Icon = style.Icon;

  return (
    <div
      className={`w-[268px] rounded-2xl border bg-[#16161B] p-3.5 shadow-lg transition-all ${style.accent} ${
        selected
          ? 'border-[#2F6BFF] ring-4 ring-[#2F6BFF]/20'
          : 'border-white/[0.1] hover:border-[#2F6BFF]/55'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-[#16161B] !bg-[#2F6BFF]"
      />
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="!h-2 !w-2 !border-2 !border-[#16161B] !bg-[#38BDF8]"
      />

      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.badgeBg}`}
        >
          <Icon className="h-3 w-3" />
          {style.badge}
        </span>
        <span className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[10px] font-medium text-[#8C8C8C]">
          {data.details.uiComponents.length} UI
        </span>
      </div>

      <h4 className="mt-2 text-xs font-semibold leading-snug text-white">{data.title}</h4>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#8C8C8C]">
        {data.subtitle}
      </p>

      <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.07] pt-2 text-[10px] text-[#6E6E6E]">
        <span>Aktor: {data.details.actor}</span>
        <span className="font-medium text-[#93C5FD]">Lihat di Plan Text</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-[#16161B] !bg-[#2F6BFF]"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-2 !border-[#16161B] !bg-[#5A4CF5]"
      />
    </div>
  );
}
