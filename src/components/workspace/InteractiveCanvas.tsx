'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type OnEdgesChange,
  type OnNodesChange,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
} from '@xyflow/react';
import {
  ArrowDownUp,
  ArrowLeftRight,
  HelpCircle,
  Layers,
  Map as MapIcon,
  Maximize2,
  Plus,
  Sparkles,
  Trash2,
  Unlink,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { FlowchartDirection, PrdinEdge, PrdinNode } from '@/lib/types/prdin';
import { BusinessFlowNode, type RfPrdinNode, UxResearchNode } from './CanvasNodes';

interface InteractiveCanvasProps {
  nodes: PrdinNode[];
  edges: PrdinEdge[];
  selectedNodeId: string | null;
  focusRequestToken: number;
  direction?: FlowchartDirection;
  readOnlyPreview?: boolean;
  onChangeDirection?: (nextDir: FlowchartDirection) => void;
  onRelayout?: (dir: FlowchartDirection) => void;
  onSelectNode: (nodeId: string | null) => void;
  onNodesChangePersist: (nodes: PrdinNode[]) => void;
  onEdgesChangePersist: (edges: PrdinEdge[]) => void;
  onQuickAddNode?: (zone: 'business-flow' | 'ux-research') => void;
  onDeleteSelectedNode?: () => void;
}

const NODE_TYPES = {
  uxResearch: UxResearchNode,
  businessFlow: BusinessFlowNode,
};

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function resolveSemanticEdgeStyle(
  edge: PrdinEdge,
  srcNode: PrdinNode | undefined,
  tgtNode: PrdinNode | undefined,
  direction: FlowchartDirection,
  isSelected: boolean,
  prefersReducedMotion: boolean
): Partial<Edge> {
  const label = edge.label ?? '';
  const isUxLink = edge.source.startsWith('ux-') || srcNode?.data.zone === 'ux-research';
  const isBranchRevisi =
    !isUxLink &&
    (/tidak|revisi|gagal|batal/i.test(label) || edge.target.includes('recovery'));
  const isLoopback =
    !isUxLink &&
    (/ulangi|perbaiki|kembali|loop|retry/i.test(label) || edge.source.includes('recovery'));
  const isYesBranch = !isUxLink && /\bya\b|valid|lolos|sukses/i.test(label);

  let sourceHandle = edge.sourceHandle;
  let targetHandle = edge.targetHandle;

  // Pick orthogonal exit/entry handles matching active TB/LR flowchart direction
  if (srcNode && tgtNode && !edge.id.startsWith('e-manual-')) {
    if (isUxLink) {
      sourceHandle = direction === 'TB' ? 's-right' : 'bottom';
      targetHandle = direction === 'TB' ? 'left' : 'top';
    } else if (isLoopback) {
      sourceHandle = direction === 'TB' ? 's-top' : 's-left';
      targetHandle = direction === 'TB' ? 't-right' : 't-bottom';
    } else if (isBranchRevisi) {
      sourceHandle = direction === 'TB' ? 'right' : 'bottom';
      targetHandle = direction === 'TB' ? 'left' : 'top';
    } else {
      const dx = tgtNode.position.x - srcNode.position.x;
      const dy = tgtNode.position.y - srcNode.position.y;
      if (dy >= Math.abs(dx) * 0.65) {
        sourceHandle = 'bottom';
        targetHandle = 'top';
      } else if (dx >= Math.abs(dy) * 0.65) {
        sourceHandle = 'right';
        targetHandle = 'left';
      } else {
        sourceHandle = direction === 'TB' ? 'bottom' : 'right';
        targetHandle = direction === 'TB' ? 'top' : 'left';
      }
    }
  }

  let stroke = '#3B82F6';
  let strokeWidth = 1.85;
  let strokeDasharray: string | undefined;
  let badgeFill = '#161822';
  let labelFill = '#E4E4E7';
  let animated = Boolean(edge.animated) && !prefersReducedMotion;

  if (isUxLink) {
    stroke = 'rgba(56, 189, 248, 0.52)';
    strokeWidth = 1.5;
    strokeDasharray = '4 4';
    badgeFill = '#111622';
    labelFill = '#7DD3FC';
    animated = false;
  } else if (isBranchRevisi || isLoopback) {
    stroke = '#818CF8';
    strokeWidth = 1.9;
    strokeDasharray = '6 4';
    badgeFill = '#1B1933';
    labelFill = '#C7D2FE';
    animated = false;
  } else if (isYesBranch) {
    stroke = '#38BDF8';
    strokeWidth = 2.25;
    badgeFill = '#0F2234';
    labelFill = '#7DD3FC';
  }

  if (isSelected) {
    stroke = '#60A5FA';
    strokeWidth = 2.6;
  }

  return {
    sourceHandle,
    targetHandle,
    type: 'smoothstep',
    animated,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: stroke,
      width: 17,
      height: 17,
    },
    style: {
      stroke,
      strokeWidth,
      strokeDasharray,
    },
    labelStyle: {
      fontSize: 10.5,
      fontWeight: 600,
      fill: labelFill,
    },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 6,
    labelBgStyle: {
      fill: badgeFill,
      fillOpacity: 0.94,
    },
  };
}

function CanvasInner({
  nodes,
  edges,
  selectedNodeId,
  focusRequestToken,
  direction = 'TB',
  readOnlyPreview = false,
  onChangeDirection,
  onRelayout,
  onSelectNode,
  onNodesChangePersist,
  onEdgesChangePersist,
  onQuickAddNode,
  onDeleteSelectedNode,
}: InteractiveCanvasProps) {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();
  const { zoom } = useViewport();
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false
  );
  const canvasRegionId = useId();
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Minimap off by default so bottom-right decision branch nodes stay 100% unobstructed
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [showUxLayer, setShowUxLayer] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Refit smoothly when node count, orientation, or layer filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.14, duration: prefersReducedMotion ? 0 : 240 });
    }, 60);
    return () => clearTimeout(timer);
  }, [nodes.length, direction, showUxLayer, fitView, prefersReducedMotion]);

  // Roving tabindex fallback for toolbar keyboard navigation when native focusgroup is unavailable
  useEffect(() => {
    const bar = toolbarRef.current;
    if (!bar || 'focusGroup' in HTMLElement.prototype) return;

    const getButtons = () =>
      Array.from(bar.querySelectorAll<HTMLButtonElement>('button:not([hidden])'));

    const items = getButtons();
    items.forEach((btn, idx) => {
      btn.tabIndex = idx === 0 ? 0 : -1;
    });

    const handleFocusIn = (e: FocusEvent) => {
      const currentItems = getButtons();
      const target = e.target as HTMLButtonElement | null;
      if (!target || !currentItems.includes(target)) return;
      currentItems.forEach((b) => {
        b.tabIndex = b === target ? 0 : -1;
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentItems = getButtons();
      const activeIdx = currentItems.indexOf(document.activeElement as HTMLButtonElement);
      if (activeIdx === -1 || currentItems.length === 0) return;

      let nextIdx: number | null = null;
      if (e.key === 'ArrowRight') nextIdx = (activeIdx + 1) % currentItems.length;
      else if (e.key === 'ArrowLeft')
        nextIdx = (activeIdx - 1 + currentItems.length) % currentItems.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = currentItems.length - 1;

      if (nextIdx !== null) {
        e.preventDefault();
        currentItems.forEach((b, idx) => {
          b.tabIndex = idx === nextIdx ? 0 : -1;
        });
        currentItems[nextIdx]?.focus();
      }
    };

    bar.addEventListener('focusin', handleFocusIn);
    bar.addEventListener('keydown', handleKeyDown);
    return () => {
      bar.removeEventListener('focusin', handleFocusIn);
      bar.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodes.length, selectedEdgeId, selectedNodeId, readOnlyPreview]);

  const visibleNodes = useMemo(
    () => (showUxLayer ? nodes : nodes.filter((n) => n.data.zone === 'business-flow')),
    [nodes, showUxLayer]
  );

  const visibleNodeMap = useMemo(
    () => new Map(visibleNodes.map((n) => [n.id, n])),
    [visibleNodes]
  );

  const rfNodes = useMemo<RfPrdinNode[]>(
    () =>
      visibleNodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [visibleNodes, selectedNodeId]
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      edges
        .filter((e) => visibleNodeMap.has(e.source) && visibleNodeMap.has(e.target))
        .map((e) => {
          const isEdgeSelected = e.id === selectedEdgeId;
          const semantic = resolveSemanticEdgeStyle(
            e,
            visibleNodeMap.get(e.source),
            visibleNodeMap.get(e.target),
            direction,
            isEdgeSelected,
            prefersReducedMotion
          );
          return {
            ...e,
            ...semantic,
            selected: isEdgeSelected,
          };
        }),
    [edges, visibleNodeMap, selectedEdgeId, direction, prefersReducedMotion]
  );

  useEffect(() => {
    if (focusRequestToken === 0 || !selectedNodeId) return;
    const target = nodes.find((n) => n.id === selectedNodeId);
    if (!target) return;
    setCenter(target.position.x + 140, target.position.y + 80, {
      zoom: Math.max(zoom, 0.9),
      duration: prefersReducedMotion ? 0 : 320,
    });
  }, [focusRequestToken, selectedNodeId, nodes, setCenter, zoom, prefersReducedMotion]);

  const handleNodesChange = useCallback<OnNodesChange<RfPrdinNode>>(
    (changes) => {
      const hasStructuralOrLayoutChange = changes
        .toArray()
        .some((c) => c.type !== 'select');
      if (!hasStructuralOrLayoutChange) return;

      const updatedVisible = changes.applyTo(rfNodes);
      const updatedMap = new Map(updatedVisible.map((n) => [n.id, n]));
      onNodesChangePersist(
        nodes.map((existing) => {
          const changed = updatedMap.get(existing.id);
          if (!changed) return existing;
          return {
            id: changed.id,
            type: changed.type ?? existing.type,
            position: changed.position,
            data: changed.data,
            measured: changed.measured,
          };
        })
      );
    },
    [rfNodes, nodes, onNodesChangePersist]
  );

  const handleEdgesChange = useCallback<OnEdgesChange<Edge>>(
    (changes) => {
      const hasStructuralChange = changes
        .toArray()
        .some((c) => c.type !== 'select');
      if (!hasStructuralChange) return;

      const updatedVisible = changes.applyTo(rfEdges);
      const hiddenUxEdges = edges.filter(
        (e) => !visibleNodeMap.has(e.source) || !visibleNodeMap.has(e.target)
      );
      onEdgesChangePersist([
        ...hiddenUxEdges,
        ...updatedVisible.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
          targetHandle: e.targetHandle ?? undefined,
          label: typeof e.label === 'string' ? e.label : undefined,
          animated: e.animated,
        })),
      ]);
    },
    [rfEdges, edges, visibleNodeMap, onEdgesChangePersist]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const newEdge: PrdinEdge = {
        id: `e-manual-${connection.source}-${connection.target}-${Date.now().toString(36)}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        label: 'Terhubung',
      };
      onEdgesChangePersist([...edges, newEdge]);
      setStatusMessage('Koneksi baru ditambahkan ke flowchart.');
    },
    [edges, onEdgesChangePersist]
  );

  const handleDeleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    onEdgesChangePersist(edges.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    setStatusMessage('Koneksi flowchart dihapus.');
  };

  return (
    <div
      id={canvasRegionId}
      role="region"
      aria-label="Flowchart Canvas Interaktif PRDin"
      className="flex h-full w-full flex-col bg-[#0E0E0E]"
    >
      {/* Docked Accessible Flowchart Toolbar above viewport (zero overlap with nodes) */}
      <div
        ref={toolbarRef}
        role="toolbar"
        {...({ focusgroup: 'toolbar wrap' } as Record<string, string>)}
        aria-label="Kontrol Flowchart Canvas"
        aria-controls={canvasRegionId}
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-[#121216] px-3 py-2"
      >
        {/* Left: Title + Orientation + Layers */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-semibold text-white">Flowchart Canvas</span>

          <span
            role="separator"
            aria-orientation="vertical"
            className="mx-0.5 hidden h-3.5 w-px bg-white/[0.12] sm:inline-block"
          />

          <div role="group" aria-label="Orientasi Flowchart" className="flex flex-wrap items-center gap-1">
            {onChangeDirection && (
              <>
                <button
                  type="button"
                  aria-pressed={direction === 'TB'}
                  onClick={() => {
                    onChangeDirection('TB');
                    setStatusMessage('Orientasi flowchart diubah ke Vertikal.');
                  }}
                  className={`inline-flex min-h-[26px] items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2 ${
                    direction === 'TB'
                      ? 'bg-[#2F6BFF]/25 text-white ring-1 ring-[#2F6BFF]/50'
                      : 'text-[#8C8C8C] hover:bg-white/[0.06] hover:text-white'
                  }`}
                  title="Tampilkan Flowchart Vertikal (Atas ke Bawah)"
                >
                  <ArrowDownUp className="h-3 w-3" aria-hidden="true" />
                  Vertikal
                </button>
                <button
                  type="button"
                  aria-pressed={direction === 'LR'}
                  onClick={() => {
                    onChangeDirection('LR');
                    setStatusMessage('Orientasi flowchart diubah ke Horizontal.');
                  }}
                  className={`inline-flex min-h-[26px] items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2 ${
                    direction === 'LR'
                      ? 'bg-[#2F6BFF]/25 text-white ring-1 ring-[#2F6BFF]/50'
                      : 'text-[#8C8C8C] hover:bg-white/[0.06] hover:text-white'
                  }`}
                  title="Tampilkan Flowchart Horizontal (Kiri ke Kanan)"
                >
                  <ArrowLeftRight className="h-3 w-3" aria-hidden="true" />
                  Horizontal
                </button>
              </>
            )}

            {onRelayout && (
              <button
                type="button"
                onClick={() => {
                  onRelayout(direction);
                  setStatusMessage('Posisi flowchart dirapikan otomatis.');
                }}
                className="inline-flex min-h-[26px] items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-[#D4D4D8] transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2"
                title="Rapikan kembali posisi seluruh node flowchart"
              >
                <Sparkles className="h-3 w-3 text-[#60A5FA]" aria-hidden="true" />
                Rapikan
              </button>
            )}
          </div>

          <span
            role="separator"
            aria-orientation="vertical"
            className="mx-0.5 hidden h-3.5 w-px bg-white/[0.12] sm:inline-block"
          />

          <div role="group" aria-label="Filter Layer dan Simbol" className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={showUxLayer}
              onClick={() => {
                setShowUxLayer((prev) => {
                  const next = !prev;
                  setStatusMessage(
                    next ? 'Layer Riset Q1 sampai Q5 ditampilkan.' : 'Layer Riset disembunyikan.'
                  );
                  return next;
                });
              }}
              className={`inline-flex min-h-[26px] items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2 ${
                showUxLayer
                  ? 'bg-[#38BDF8]/18 text-[#7DD3FC] ring-1 ring-[#38BDF8]/40'
                  : 'text-[#8C8C8C] hover:bg-white/[0.06] hover:text-white'
              }`}
              title="Tampilkan atau sembunyikan kartu Konteks Riset Q1–Q5"
            >
              <Layers className="h-3 w-3" aria-hidden="true" />
              Riset Q1–Q5
            </button>

            <button
              type="button"
              aria-pressed={showLegend}
              aria-label="Tampilkan panduan simbol flowchart"
              onClick={() => setShowLegend((prev) => !prev)}
              className={`inline-flex min-h-[26px] min-w-[26px] items-center justify-center rounded-lg px-1.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2 ${
                showLegend
                  ? 'bg-white/[0.14] text-white'
                  : 'text-[#8C8C8C] hover:bg-white/[0.06] hover:text-white'
              }`}
              title="Panduan simbol flowchart"
            >
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Right: Node Editing + Zoom Controls */}
        <div className="flex flex-wrap items-center gap-1">
          {!readOnlyPreview && onQuickAddNode && (
            <div role="group" aria-label="Tambah atau hapus node" className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onQuickAddNode('business-flow')}
                className="inline-flex min-h-[26px] items-center gap-1 rounded-lg bg-[#2F6BFF]/20 px-2 py-1 text-[11px] font-semibold text-[#93C5FD] transition-colors hover:bg-[#2F6BFF]/30 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2"
                title="Tambah langkah flowchart baru"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Flow
              </button>
              <button
                type="button"
                onClick={() => onQuickAddNode('ux-research')}
                className="inline-flex min-h-[26px] items-center gap-1 rounded-lg bg-[#5A4CF5]/20 px-2 py-1 text-[11px] font-semibold text-[#C4B5FD] transition-colors hover:bg-[#5A4CF5]/30 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2"
                title="Tambah catatan UX Research di canvas"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                UX Insight
              </button>

              {selectedEdgeId && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedEdge}
                  aria-label="Hapus koneksi terpilih"
                  title="Hapus koneksi terpilih"
                  className="inline-flex min-h-[26px] items-center gap-1 rounded-lg bg-[#5A4CF5]/25 px-2 py-1 text-[11px] font-medium text-[#DDD6FE] hover:bg-[#5A4CF5]/40 focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2"
                >
                  <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
                  Hapus Garis
                </button>
              )}

              {selectedNodeId && nodes.length > 1 && onDeleteSelectedNode && (
                <button
                  type="button"
                  onClick={onDeleteSelectedNode}
                  aria-label="Hapus node terpilih"
                  title="Hapus node terpilih"
                  className="inline-flex min-h-[26px] min-w-[26px] items-center justify-center rounded-lg p-1 text-[#C4B5FD] hover:bg-[#5A4CF5]/25 hover:text-white focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}

              <span
                role="separator"
                aria-orientation="vertical"
                className="mx-0.5 hidden h-4 w-px bg-white/[0.12] sm:inline-block"
              />
            </div>
          )}

          <div role="group" aria-label="Zoom dan navigasi canvas" className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => zoomOut({ duration: prefersReducedMotion ? 0 : 180 })}
              aria-label="Zoom out canvas"
              title="Zoom Out"
              className="inline-flex min-h-[26px] min-w-[26px] items-center justify-center rounded-lg p-1 text-[#D4D4D8] hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2"
            >
              <ZoomOut className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <span className="min-w-[38px] text-center font-mono text-[11px] font-medium text-[#8C8C8C]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => zoomIn({ duration: prefersReducedMotion ? 0 : 180 })}
              aria-label="Zoom in canvas"
              title="Zoom In"
              className="inline-flex min-h-[26px] min-w-[26px] items-center justify-center rounded-lg p-1 text-[#D4D4D8] hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2"
            >
              <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => fitView({ padding: 0.14, duration: prefersReducedMotion ? 0 : 250 })}
              aria-label="Pas-kan semua node di layar"
              title="Fit View"
              className="inline-flex min-h-[26px] min-w-[26px] items-center justify-center rounded-lg p-1 text-[#D4D4D8] hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2"
            >
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={showMiniMap}
              onClick={() => setShowMiniMap((prev) => !prev)}
              aria-label="Tampilkan atau sembunyikan minimap"
              title="Toggle Minimap"
              className={`inline-flex min-h-[26px] min-w-[26px] items-center justify-center rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-[#2F6BFF] focus-visible:outline-offset-2 ${
                showMiniMap ? 'bg-white/[0.12] text-white' : 'text-[#8C8C8C] hover:bg-white/[0.08]'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Live screen reader announcements for toolbar actions */}
      <p role="status" className="sr-only">
        {statusMessage}
      </p>

      {/* Dedicated unobstructed ReactFlow Canvas area */}
      <div className="relative min-h-0 flex-1">
        {showLegend && (
          <div
            aria-label="Legenda Simbol Flowchart"
            className="iris-glass absolute bottom-3 left-3 z-10 max-w-xs rounded-xl p-3 text-[11px] shadow-2xl"
          >
            <p className="font-semibold text-white">Simbol Flowchart PRDin</p>
            <ul className="mt-2 space-y-1.5 text-[#D4D4D8]">
              <li className="flex items-center gap-2">
                <span className="h-3 w-5 rounded-full border-2 border-[#38BDF8] bg-[#141620]" />
                <span>Kapsul (Oval) = Mulai (Q2) / Selesai (Q5)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-5 rounded border border-white/20 border-l-4 border-l-[#2F6BFF] bg-[#16161B]" />
                <span>Kotak = Proses / Fitur (Q3)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rotate-45 border border-[#6366F1] bg-[#151726]" />
                <span>Belah Ketupat = Keputusan Ya / Tidak (Q4)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-0.5 w-5 border-t-2 border-dashed border-[#818CF8]" />
                <span>Garis Putus = Cabang Revisi / Loopback</span>
              </li>
            </ul>
          </div>
        )}

        <ReactFlow
          className="dark"
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          nodesDraggable={!readOnlyPreview}
          nodesConnectable={!readOnlyPreview}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeClick={(_, node) => {
            setSelectedEdgeId(null);
            onSelectNode(node.id);
          }}
          onEdgeClick={(_, edge) => {
            setSelectedEdgeId(edge.id);
          }}
          onPaneClick={() => {
            setSelectedEdgeId(null);
            onSelectNode(null);
          }}
          fitView
          fitViewOptions={{ padding: 0.14 }}
          minZoom={0.25}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            bgColor="#0E0E0E"
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.2}
            color="#27272A"
          />
          {showMiniMap && (
            <MiniMap
              pannable
              zoomable
              maskColor="rgba(14, 14, 14, 0.72)"
              className="!rounded-xl !border !border-white/[0.1] !bg-[#151518]/95 !shadow-xl"
              nodeColor={(n) => {
                const data = n.data as RfPrdinNode['data'];
                if (data.zone === 'ux-research') return '#38BDF8';
                if (data.kind === 'flow-decision') return '#6366F1';
                if (data.kind === 'flow-outcome') return '#5A4CF5';
                return '#2F6BFF';
              }}
            />
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export function InteractiveCanvas(props: InteractiveCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
