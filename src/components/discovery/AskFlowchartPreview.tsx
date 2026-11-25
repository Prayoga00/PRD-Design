'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Loader2,
  UserCheck,
} from 'lucide-react';
import type { DiscoveryState, FlowchartDirection } from '@/lib/types/prdin';
import {
  buildWorkspaceFallback,
  buildWorkspaceStateFromOutput,
} from '@/lib/engine/smart-fallback';
import { InteractiveCanvas } from '@/components/workspace/InteractiveCanvas';

interface AskFlowchartPreviewProps {
  discovery: DiscoveryState;
  direction: FlowchartDirection;
  isGeneratingWorkspace: boolean;
  onChangeDirection: (dir: FlowchartDirection) => void;
  onOpenFullWorkspace: () => void;
}

export function AskFlowchartPreview({
  discovery,
  direction,
  isGeneratingWorkspace,
  onChangeDirection,
  onOpenFullWorkspace,
}: AskFlowchartPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('flow-entry');
  const [focusRequestToken, setFocusRequestToken] = useState(0);

  const previewWorkspace = useMemo(() => {
    const fallback = buildWorkspaceFallback(discovery);
    return buildWorkspaceStateFromOutput(discovery, fallback, 'smart-fallback', direction);
  }, [discovery, direction]);

  const activeNode = useMemo(() => {
    if (!selectedNodeId) return previewWorkspace.nodes.find((n) => n.data.zone === 'business-flow') ?? null;
    return (
      previewWorkspace.nodes.find((n) => n.id === selectedNodeId) ??
      previewWorkspace.nodes.find((n) => n.data.zone === 'business-flow') ??
      null
    );
  }, [previewWorkspace.nodes, selectedNodeId]);

  const uxCount = previewWorkspace.nodes.filter((n) => n.data.zone === 'ux-research').length;
  const featureCount = previewWorkspace.nodes.filter(
    (n) => n.data.kind === 'flow-feature' && n.id !== 'flow-recovery'
  ).length;

  return (
    <section
      aria-labelledby="ask-flowchart-preview-heading"
      className="rounded-2xl border border-[#2F6BFF]/35 bg-[#14151B] p-4 sm:p-5 shadow-[0_20px_50px_-28px_rgba(47,107,255,0.55)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#38BDF8]/35 bg-[#38BDF8]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#7DD3FC]">
              <GitBranch className="h-3 w-3" aria-hidden="true" />
              Flowchart Canvas Otomatis (Q1–Q5)
            </span>
            <span className="text-[11px] text-[#8C8C8C]">
              {uxCount} Input Riset · 1 Mulai · {featureCount} Proses · Keputusan Ya/Tidak · Revisi Loop
            </span>
          </div>
          <h3
            id="ask-flowchart-preview-heading"
            className="mt-1.5 text-sm font-semibold text-white sm:text-base"
          >
            Flowchart Sistem dari 5 Jawabanmu: {previewWorkspace.projectTitle}
          </h3>
          <p className="mt-0.5 text-xs text-[#8C8C8C]">
            Klik node mana saja untuk mengecek detailnya, ubah arah Vertikal/Horizontal, lalu buka di Workspace penuh untuk menyunting atau ekspor PRD.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#1B1B22] px-3 py-1.5 text-xs font-medium text-[#D4D4D8] transition-colors hover:bg-white/[0.08]"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                Ringkas
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                Tampilkan Canvas
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isGeneratingWorkspace}
            onClick={onOpenFullWorkspace}
            className="iris-btn-gradient inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {isGeneratingWorkspace ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Membuka...
              </>
            ) : (
              <>
                Edit di Workspace
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          <div className="h-[480px] w-full overflow-hidden rounded-xl border border-white/[0.1] bg-[#0E0E0E] sm:h-[560px]">
            <InteractiveCanvas
              nodes={previewWorkspace.nodes}
              edges={previewWorkspace.edges}
              selectedNodeId={selectedNodeId}
              focusRequestToken={focusRequestToken}
              direction={direction}
              readOnlyPreview={true}
              onChangeDirection={onChangeDirection}
              onRelayout={() => setFocusRequestToken((n) => n + 1)}
              onSelectNode={(id) => setSelectedNodeId(id)}
              onNodesChangePersist={() => {}}
              onEdgesChangePersist={() => {}}
            />
          </div>

          {activeNode && (
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#18181F] px-4 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    {activeNode.data.title}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-[#93C5FD]">
                    <UserCheck className="h-2.5 w-2.5" aria-hidden="true" />
                    {activeNode.data.details.actor}
                  </span>
                </div>
                <p className="text-xs text-[#A1A1AA]">{activeNode.data.details.purpose}</p>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {activeNode.data.details.uiComponents.slice(0, 4).map((comp) => (
                    <span
                      key={comp}
                      className="rounded-md border border-[#2F6BFF]/30 bg-[#2F6BFF]/10 px-2 py-0.5 text-[10px] font-medium text-[#BFDBFE]"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenFullWorkspace}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#1F2230] px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#2F6BFF]/60 hover:bg-[#272B3F]"
              >
                Buka Detail Plan &amp; Canvas
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
