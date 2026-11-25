'use client';

import React from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import {
  AlertCircle,
  Flag,
  GitBranch,
  Layers,
  Repeat,
  RotateCcw,
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
    badge: 'Masalah (Q1)',
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
      className={`group relative w-[256px] rounded-2xl border border-dashed bg-[#15151B]/95 p-3.5 shadow-lg transition-all ${
        selected
          ? 'border-[#38BDF8] ring-4 ring-[#38BDF8]/20'
          : `${style.border} hover:border-[#38BDF8]/70`
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badgeBg}`}
        >
          <Icon className="h-3 w-3" />
          {style.badge}
        </span>
        <span className="text-[10px] font-medium text-[#6E6E6E]">Input Riset</span>
      </div>

      <h4 className="mt-2 text-xs font-semibold leading-snug text-white">{data.title}</h4>
      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#8C8C8C]">
        {data.subtitle}
      </p>

      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="!h-2 !w-2 !border-2 !border-[#15151B] !bg-[#38BDF8] opacity-0 transition-opacity group-hover:opacity-90"
      />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-[#15151B] !bg-[#38BDF8] opacity-0 transition-opacity group-hover:opacity-90"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-[#15151B] !bg-[#38BDF8]"
      />
      <Handle
        type="source"
        id="s-right"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-[#15151B] !bg-[#38BDF8]"
      />
    </div>
  );
}

function SharedFlowHandles() {
  return (
    <>
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-[#16161B] !bg-[#2F6BFF]"
      />
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-[#16161B] !bg-[#38BDF8]"
      />
      <Handle
        type="target"
        id="t-right"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-[#16161B] !bg-[#818CF8] opacity-0 transition-opacity group-hover:opacity-90"
      />
      <Handle
        type="target"
        id="t-bottom"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-2 !border-[#16161B] !bg-[#818CF8] opacity-0 transition-opacity group-hover:opacity-90"
      />

      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-[#16161B] !bg-[#2F6BFF]"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-[#16161B] !bg-[#5A4CF5]"
      />
      <Handle
        type="source"
        id="s-top"
        position={Position.Top}
        className="!h-2 !w-2 !border-2 !border-[#16161B] !bg-[#818CF8] opacity-0 transition-opacity group-hover:opacity-90"
      />
      <Handle
        type="source"
        id="s-left"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-[#16161B] !bg-[#818CF8] opacity-0 transition-opacity group-hover:opacity-90"
      />
    </>
  );
}

const FLOW_STYLE_MAP: Record<
  string,
  { badge: string; badgeBg: string; accent: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  'flow-start': {
    badge: 'Mulai · Q2',
    badgeBg: 'bg-[#38BDF8]/18 text-[#7DD3FC]',
    accent: 'border-[#38BDF8]/50',
    Icon: Flag,
  },
  'flow-feature': {
    badge: 'Proses · Q3',
    badgeBg: 'bg-[#2F6BFF]/20 text-[#93C5FD]',
    accent: 'border-l-4 border-l-[#2F6BFF]',
    Icon: Layers,
  },
  'flow-decision': {
    badge: 'Keputusan · Q4',
    badgeBg: 'bg-[#6366F1]/25 text-[#A5B4FC]',
    accent: 'border-[#6366F1]/55',
    Icon: GitBranch,
  },
  'flow-outcome': {
    badge: 'Selesai · Q5',
    badgeBg: 'bg-[#5A4CF5]/24 text-[#C4B5FD]',
    accent: 'border-[#5A4CF5]/60',
    Icon: Sparkles,
  },
};

export function BusinessFlowNode({ id, data, selected }: NodeProps<RfPrdinNode>) {
  // 1. Decision Diamond Shape (Flowchart Gate)
  if (data.kind === 'flow-decision') {
    return (
      <div className="group relative flex h-[168px] w-[304px] items-center justify-center">
        <svg
          viewBox="0 0 304 168"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full drop-shadow-[0_12px_28px_rgba(47,107,255,0.22)]"
        >
          <polygon
            points="152,4 300,84 152,164 4,84"
            fill="#151726"
            stroke={selected ? '#38BDF8' : '#6366F1'}
            strokeWidth={selected ? 2.5 : 1.75}
          />
          <polygon
            points="152,11 291,84 152,157 13,84"
            fill="none"
            stroke="rgba(147,197,253,0.14)"
            strokeWidth="1"
          />
        </svg>

        <SharedFlowHandles />

        <div className="relative z-10 flex w-[184px] flex-col items-center text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#6366F1]/25 px-2 py-0.5 text-[10px] font-semibold text-[#C7D2FE]">
            <GitBranch className="h-2.5 w-2.5" />
            Keputusan · Q4
          </span>
          <h4 className="mt-1.5 line-clamp-2 text-[11.5px] font-semibold leading-tight text-white">
            {data.title}
          </h4>
          <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-[#8C8C8C]">
            {data.subtitle}
          </p>
        </div>
      </div>
    );
  }

  // 2. Start / End Terminator Shape (Stadium Pill)
  if (data.kind === 'flow-start' || data.kind === 'flow-outcome') {
    const isStart = data.kind === 'flow-start';
    const Icon = isStart ? Flag : Sparkles;

    return (
      <div
        className={`group relative w-[276px] rounded-full border-2 bg-[#141620] px-5 py-3.5 shadow-xl transition-all ${
          isStart ? 'border-[#38BDF8]/55' : 'border-[#5A4CF5]/60 ring-1 ring-[#5A4CF5]/25 ring-offset-2 ring-offset-[#0E0E0E]'
        } ${
          selected
            ? isStart
              ? 'border-[#38BDF8] ring-4 ring-[#38BDF8]/25'
              : 'border-[#7C6BFF] ring-4 ring-[#5A4CF5]/30'
            : ''
        }`}
      >
        <SharedFlowHandles />

        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isStart ? 'bg-[#38BDF8]/18 text-[#7DD3FC]' : 'bg-[#5A4CF5]/25 text-[#DDD6FE]'
            }`}
          >
            <Icon className="h-3 w-3" />
            {isStart ? 'Mulai · Q2' : 'Selesai · Q5'}
          </span>
          <span className="text-[10px] font-medium text-[#8C8C8C]">Terminator</span>
        </div>

        <h4 className="mt-1.5 line-clamp-1 text-xs font-semibold leading-snug text-white">
          {data.title}
        </h4>
        <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-[#8C8C8C]">
          {data.subtitle}
        </p>
      </div>
    );
  }

  // 3. Process / Recovery Rectangle Shape
  const isRecovery =
    id === 'flow-recovery' ||
    id.includes('recovery') ||
    /revisi|perbaikan|fallback|coba lagi/i.test(data.title);
  const style = FLOW_STYLE_MAP[data.kind] ?? FLOW_STYLE_MAP['flow-feature'];
  const Icon = isRecovery ? RotateCcw : style.Icon;

  return (
    <div
      className={`group relative w-[268px] rounded-xl border bg-[#16161B] p-3.5 shadow-lg transition-all ${
        isRecovery
          ? 'border-dashed border-l-4 border-[#818CF8]/45 border-l-[#818CF8]'
          : `border-white/[0.1] ${style.accent}`
      } ${
        selected
          ? 'border-[#2F6BFF] ring-4 ring-[#2F6BFF]/20'
          : 'hover:border-[#2F6BFF]/60'
      }`}
    >
      <SharedFlowHandles />

      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
            isRecovery ? 'bg-[#818CF8]/20 text-[#C7D2FE]' : style.badgeBg
          }`}
        >
          <Icon className="h-3 w-3" />
          {isRecovery ? 'Revisi / Loop' : style.badge}
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
        <span className="truncate">Aktor: {data.details.actor}</span>
        <span className="shrink-0 font-medium text-[#93C5FD]">Lihat di Plan Text</span>
      </div>
    </div>
  );
}
