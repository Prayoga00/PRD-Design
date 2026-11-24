'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Map as MapIcon,
  Maximize2,
  Plus,
  Trash2,
  Unlink,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { PrdinEdge, PrdinNode } from '@/lib/types/prdin';
import { BusinessFlowNode, type RfPrdinNode, UxResearchNode } from './CanvasNodes';

interface InteractiveCanvasProps {
  nodes: PrdinNode[];
  edges: PrdinEdge[];
  selectedNodeId: string | null;
  focusRequestToken: number;
  onSelectNode: (nodeId: string | null) => void;
  onNodesChangePersist: (nodes: PrdinNode[]) => void;
  onEdgesChangePersist: (edges: PrdinEdge[]) => void;
  onQuickAddNode: (zone: 'business-flow' | 'ux-research') => void;
  onDeleteSelectedNode: () => void;
}

const NODE_TYPES = {
  uxResearch: UxResearchNode,
  businessFlow: BusinessFlowNode,
};

function CanvasInner({
  nodes,
  edges,
  selectedNodeId,
  focusRequestToken,
  onSelectNode,
  onNodesChangePersist,
  onEdgesChangePersist,
  onQuickAddNode,
  onDeleteSelectedNode,
}: InteractiveCanvasProps) {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();
  const { zoom } = useViewport();
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const prevNodeCountRef = useRef(nodes.length);

  useEffect(() => {
    if (nodes.length > prevNodeCountRef.current) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 280 });
      }, 60);
      prevNodeCountRef.current = nodes.length;
      return () => clearTimeout(timer);
    }
    prevNodeCountRef.current = nodes.length;
  }, [nodes.length, fitView]);

  const rfNodes = useMemo<RfPrdinNode[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId]
  );

  const rfEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => {
        const isEdgeSelected = e.id === selectedEdgeId;
        return {
          ...e,
          selected: isEdgeSelected,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isEdgeSelected ? '#60A5FA' : '#64748B',
            width: 18,
            height: 18,
          },
          style: {
            stroke: isEdgeSelected ? '#60A5FA' : '#52525B',
            strokeWidth: isEdgeSelected ? 2.4 : 1.75,
          },
          labelStyle: {
            fontSize: 11,
            fontWeight: 600,
            fill: '#E4E4E7',
          },
          labelBgStyle: {
            fill: '#18181D',
            fillOpacity: 0.92,
          },
        };
      }),
    [edges, selectedEdgeId]
  );

  useEffect(() => {
    if (focusRequestToken === 0 || !selectedNodeId) return;
    const target = nodes.find((n) => n.id === selectedNodeId);
    if (!target) return;
    setCenter(target.position.x + 130, target.position.y + 70, {
      zoom: Math.max(zoom, 0.95),
      duration: 350,
    });
  }, [focusRequestToken, selectedNodeId, nodes, setCenter, zoom]);

  const handleNodesChange = useCallback<OnNodesChange<RfPrdinNode>>(
    (changes) => {
      const hasStructuralOrLayoutChange = changes
        .toArray()
        .some((c) => c.type !== 'select');
      if (!hasStructuralOrLayoutChange) return;

      const updated = changes.applyTo(rfNodes);
      onNodesChangePersist(
        updated.map((n) => ({
          id: n.id,
          type: n.type ?? 'businessFlow',
          position: n.position,
          data: n.data,
          measured: n.measured,
        }))
      );
    },
    [rfNodes, onNodesChangePersist]
  );

  const handleEdgesChange = useCallback<OnEdgesChange<Edge>>(
    (changes) => {
      const hasStructuralChange = changes
        .toArray()
        .some((c) => c.type !== 'select');
      if (!hasStructuralChange) return;

      const updated = changes.applyTo(rfEdges);
      onEdgesChangePersist(
        updated.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle ?? undefined,
          targetHandle: e.targetHandle ?? undefined,
          label: typeof e.label === 'string' ? e.label : undefined,
          animated: e.animated,
        }))
      );
    },
    [rfEdges, onEdgesChangePersist]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const newEdge: PrdinEdge = {
        id: `e-${connection.source}-${connection.target}-${Date.now().toString(36)}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        label: 'Terhubung',
      };
      onEdgesChangePersist([...edges, newEdge]);
    },
    [edges, onEdgesChangePersist]
  );

  const handleDeleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    onEdgesChangePersist(edges.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  return (
    <div className="relative h-full w-full bg-[#0E0E0E]">
      {/* Top Canvas Toolbar */}
      <div className="pointer-events-none absolute top-3 right-3 left-3 z-10 flex flex-wrap items-center justify-between gap-2">
        {/* Legend */}
        <div className="iris-glass pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl px-3 py-1.5 text-xs">
          <span className="font-semibold text-white">Canvas Interaktif</span>
          <span className="h-3.5 w-px bg-white/[0.12]" />
          <span className="inline-flex items-center gap-1.5 text-[#7DD3FC]">
            <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />
            UX Research
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#93C5FD]">
            <span className="h-2 w-2 rounded-full bg-[#2F6BFF]" />
            Flow Kerja Bisnis
          </span>
        </div>

        {/* Zoom + Node Controls */}
        <div className="iris-glass pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-xl p-1">
          <button
            type="button"
            onClick={() => onQuickAddNode('business-flow')}
            className="inline-flex items-center gap-1 rounded-lg bg-[#2F6BFF]/20 px-2.5 py-1.5 text-xs font-semibold text-[#93C5FD] hover:bg-[#2F6BFF]/30 hover:text-white"
            title="Tambah node alur kerja bisnis"
          >
            <Plus className="h-3.5 w-3.5" />
            Flow
          </button>
          <button
            type="button"
            onClick={() => onQuickAddNode('ux-research')}
            className="inline-flex items-center gap-1 rounded-lg bg-[#5A4CF5]/20 px-2.5 py-1.5 text-xs font-semibold text-[#C4B5FD] hover:bg-[#5A4CF5]/30 hover:text-white"
            title="Tambah catatan UX Research di canvas"
          >
            <Plus className="h-3.5 w-3.5" />
            UX Insight
          </button>

          {selectedEdgeId && (
            <button
              type="button"
              onClick={handleDeleteSelectedEdge}
              aria-label="Hapus koneksi terpilih"
              title="Hapus koneksi terpilih"
              className="inline-flex items-center gap-1 rounded-lg bg-[#5A4CF5]/25 px-2 py-1.5 text-xs font-medium text-[#DDD6FE] hover:bg-[#5A4CF5]/40"
            >
              <Unlink className="h-3.5 w-3.5" />
              Hapus Garis
            </button>
          )}

          {selectedNodeId && nodes.length > 1 && (
            <button
              type="button"
              onClick={onDeleteSelectedNode}
              aria-label="Hapus node terpilih"
              title="Hapus node terpilih"
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-[#C4B5FD] hover:bg-[#5A4CF5]/25 hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <span className="mx-0.5 h-4 w-px bg-white/[0.12]" />

          <button
            type="button"
            onClick={() => zoomOut({ duration: 180 })}
            aria-label="Zoom out canvas"
            title="Zoom Out"
            className="rounded-lg p-1.5 text-[#D4D4D8] hover:bg-white/[0.08]"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[42px] text-center font-mono text-[11px] font-medium text-[#8C8C8C]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomIn({ duration: 180 })}
            aria-label="Zoom in canvas"
            title="Zoom In"
            className="rounded-lg p-1.5 text-[#D4D4D8] hover:bg-white/[0.08]"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => fitView({ padding: 0.16, duration: 250 })}
            aria-label="Pas-kan semua node di layar"
            title="Fit View"
            className="rounded-lg p-1.5 text-[#D4D4D8] hover:bg-white/[0.08]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowMiniMap((prev) => !prev)}
            aria-label="Tampilkan atau sembunyikan minimap"
            title="Toggle Minimap"
            className={`rounded-lg p-1.5 ${showMiniMap ? 'bg-white/[0.12] text-white' : 'text-[#8C8C8C] hover:bg-white/[0.08]'
              }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ReactFlow
        className="dark"
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
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
        fitViewOptions={{ padding: 0.2 }}
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
            nodeColor={(n) =>
              (n.data as RfPrdinNode['data']).zone === 'ux-research' ? '#38BDF8' : '#2F6BFF'
            }
          />
        )}
      </ReactFlow>
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
