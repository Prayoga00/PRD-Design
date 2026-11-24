import type {
  PrdinEdge,
  PrdinNode,
  PlanSection,
  WorkspacePatch,
  WorkspaceState,
} from '@/lib/types/prdin';
import type { RawBlueprintNode } from '@/lib/schemas/ai-contracts';

const UX_START_X = 40;
const UX_Y = 32;
const UX_GAP_X = 350;

const FLOW_START_X = 40;
const FLOW_START_Y = 290;
const FLOW_GAP_X = 370;
const FLOW_GAP_Y = 225;
const FLOW_COLS_PER_ROW = 4;

function toCanvasNodeType(zone: RawBlueprintNode['zone']): PrdinNode['type'] {
  return zone === 'ux-research' ? 'uxResearch' : 'businessFlow';
}

/**
 * Computes deterministic, non-overlapping coordinates for UX Research cards (top band)
 * and Business Workflow nodes (layered left-to-right below the research band).
 */
export function layoutBlueprintNodes(
  rawNodes: RawBlueprintNode[],
  edges: PrdinEdge[]
): PrdinNode[] {
  const uxNodes = rawNodes.filter((n) => n.zone === 'ux-research');
  const flowNodes = rawNodes.filter((n) => n.zone === 'business-flow');

  const positioned: PrdinNode[] = [];

  uxNodes.forEach((node, index) => {
    positioned.push({
      id: node.id,
      type: toCanvasNodeType(node.zone),
      position: {
        x: UX_START_X + index * UX_GAP_X,
        y: UX_Y,
      },
      data: {
        title: node.title,
        subtitle: node.subtitle,
        kind: node.kind,
        zone: node.zone,
        linkedSectionId: node.linkedSectionId,
        details: node.details,
      },
    });
  });

  // Topological layering for business-flow nodes using BFS from entry nodes
  const flowIdSet = new Set(flowNodes.map((n) => n.id));
  const incomingCount = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of flowNodes) {
    incomingCount.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (flowIdSet.has(edge.source) && flowIdSet.has(edge.target)) {
      adjacency.get(edge.source)?.push(edge.target);
      incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
    }
  }

  const levelById = new Map<string, number>();
  const queue: string[] = [];

  for (const node of flowNodes) {
    if ((incomingCount.get(node.id) ?? 0) === 0 || node.kind === 'flow-start') {
      if (!levelById.has(node.id)) {
        levelById.set(node.id, 0);
        queue.push(node.id);
      }
    }
  }

  // Fallback in case graph contains cycles without a zero-indegree root
  if (queue.length === 0 && flowNodes.length > 0) {
    levelById.set(flowNodes[0].id, 0);
    queue.push(flowNodes[0].id);
  }

  let cursor = 0;
  while (cursor < queue.length) {
    const currentId = queue[cursor++];
    const currentLevel = levelById.get(currentId) ?? 0;
    const neighbors = adjacency.get(currentId) ?? [];

    for (const nextId of neighbors) {
      const candidateLevel = currentLevel + 1;
      const existing = levelById.get(nextId);
      if (existing === undefined || (candidateLevel > existing && candidateLevel <= flowNodes.length)) {
        levelById.set(nextId, candidateLevel);
        queue.push(nextId);
      }
    }
  }

  // Group nodes by computed horizontal column
  const columns = new Map<number, RawBlueprintNode[]>();
  flowNodes.forEach((node, idx) => {
    const col = levelById.get(node.id) ?? idx;
    const list = columns.get(col) ?? [];
    list.push(node);
    columns.set(col, list);
  });

  const sortedCols = Array.from(columns.keys()).sort((a, b) => a - b);
  for (const level of sortedCols) {
    const colNodes = columns.get(level) ?? [];
    const wrapRow = Math.floor(level / FLOW_COLS_PER_ROW);
    const visualCol = level % FLOW_COLS_PER_ROW;

    colNodes.forEach((node, rowIdx) => {
      positioned.push({
        id: node.id,
        type: toCanvasNodeType(node.zone),
        position: {
          x: FLOW_START_X + visualCol * FLOW_GAP_X,
          y: FLOW_START_Y + (wrapRow * FLOW_GAP_Y) + rowIdx * FLOW_GAP_Y,
        },
        data: {
          title: node.title,
          subtitle: node.subtitle,
          kind: node.kind,
          zone: node.zone,
          linkedSectionId: node.linkedSectionId,
          details: node.details,
        },
      });
    });
  }

  return positioned;
}

function findNonOverlappingPosition(
  existingNodes: PrdinNode[],
  zone: RawBlueprintNode['zone'],
  connectFromNodeId?: string
): { x: number; y: number } {
  const occupied = existingNodes.map((n) => n.position);
  const collides = (x: number, y: number) =>
    occupied.some((pos) => Math.abs(pos.x - x) < 250 && Math.abs(pos.y - y) < 140);

  if (connectFromNodeId) {
    const anchor = existingNodes.find((n) => n.id === connectFromNodeId);
    if (anchor) {
      const candidates = [
        { x: anchor.position.x + FLOW_GAP_X, y: anchor.position.y },
        { x: anchor.position.x, y: anchor.position.y + FLOW_GAP_Y },
        { x: anchor.position.x + FLOW_GAP_X, y: anchor.position.y + FLOW_GAP_Y },
        { x: anchor.position.x - FLOW_GAP_X, y: anchor.position.y + FLOW_GAP_Y },
      ];
      for (const candidate of candidates) {
        if (candidate.x >= FLOW_START_X && !collides(candidate.x, candidate.y)) {
          return candidate;
        }
      }
    }
  }

  const zoneNodes = existingNodes.filter((n) => n.data.zone === zone);
  if (zone === 'ux-research') {
    let x = UX_START_X + zoneNodes.length * UX_GAP_X;
    const y = UX_Y;
    while (collides(x, y)) {
      x += UX_GAP_X;
    }
    return { x, y };
  }

  const maxX = zoneNodes.reduce((acc, n) => Math.max(acc, n.position.x), FLOW_START_X - FLOW_GAP_X);
  let candidateX = maxX + FLOW_GAP_X;
  const candidateY = FLOW_START_Y;
  while (collides(candidateX, candidateY)) {
    candidateX += FLOW_GAP_X;
  }
  return { x: candidateX, y: candidateY };
}

/**
 * Applies a structured patch from AI Chat or manual user actions onto WorkspaceState,
 * preserving manual positions of existing nodes and maintaining graph/plan consistency.
 */
export function applyWorkspacePatch(
  state: WorkspaceState,
  patch: WorkspacePatch
): { nextState: WorkspaceState; summary: string[] } {
  const summary: string[] = [];
  let nodes = [...state.nodes];
  let edges = [...state.edges];
  const planSections: PlanSection[] = [...state.planSections];
  let projectTitle = state.projectTitle;

  if (patch.projectTitle && patch.projectTitle.trim() !== state.projectTitle) {
    projectTitle = patch.projectTitle.trim();
    summary.push(`Judul proyek: ${projectTitle}`);
  }

  if (patch.removeNodeIds && patch.removeNodeIds.length > 0) {
    const removeSet = new Set(patch.removeNodeIds);
    const beforeCount = nodes.length;
    nodes = nodes.filter((n) => !removeSet.has(n.id));
    edges = edges.filter((e) => !removeSet.has(e.source) && !removeSet.has(e.target));
    const removedCount = beforeCount - nodes.length;
    if (removedCount > 0) {
      summary.push(`-${removedCount} Node Canvas`);
    }
  }

  if (patch.upsertNodes && patch.upsertNodes.length > 0) {
    let addedCount = 0;
    let updatedCount = 0;

    for (const incoming of patch.upsertNodes) {
      const existingIndex = nodes.findIndex((n) => n.id === incoming.id);
      const nextData = {
        title: incoming.title,
        subtitle: incoming.subtitle,
        kind: incoming.kind,
        zone: incoming.zone,
        linkedSectionId: incoming.linkedSectionId,
        details: incoming.details,
      };

      if (existingIndex >= 0) {
        nodes[existingIndex] = {
          ...nodes[existingIndex],
          type: toCanvasNodeType(incoming.zone),
          data: nextData,
        };
        updatedCount++;
      } else {
        const position = findNonOverlappingPosition(
          nodes,
          incoming.zone,
          incoming.connectFromNodeId
        );
        nodes.push({
          id: incoming.id,
          type: toCanvasNodeType(incoming.zone),
          position,
          data: nextData,
        });
        addedCount++;

        if (
          incoming.connectFromNodeId &&
          nodes.some((n) => n.id === incoming.connectFromNodeId)
        ) {
          const edgeId = `e-${incoming.connectFromNodeId}-${incoming.id}`;
          if (!edges.some((e) => e.id === edgeId)) {
            edges.push({
              id: edgeId,
              source: incoming.connectFromNodeId,
              target: incoming.id,
              label: incoming.edgeLabel,
            });
          }
        }
      }
    }

    if (addedCount > 0) summary.push(`+${addedCount} Node Canvas`);
    if (updatedCount > 0) summary.push(`${updatedCount} Node diperbarui`);
  }

  if (patch.removeEdgeIds && patch.removeEdgeIds.length > 0) {
    const removeEdgeSet = new Set(patch.removeEdgeIds);
    edges = edges.filter((e) => !removeEdgeSet.has(e.id));
  }

  if (patch.upsertEdges && patch.upsertEdges.length > 0) {
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of patch.upsertEdges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) continue;
      const idx = edges.findIndex((e) => e.id === edge.id);
      if (idx >= 0) {
        edges[idx] = edge;
      } else {
        edges.push(edge);
      }
    }
  }

  // Ensure zero orphan edges remain
  const finalNodeIds = new Set(nodes.map((n) => n.id));
  edges = edges.filter((e) => finalNodeIds.has(e.source) && finalNodeIds.has(e.target));

  if (patch.upsertPlanSections && patch.upsertPlanSections.length > 0) {
    for (const section of patch.upsertPlanSections) {
      const idx = planSections.findIndex((s) => s.id === section.id);
      if (idx >= 0) {
        planSections[idx] = section;
      } else {
        planSections.push(section);
      }
    }
    summary.push(`Plan Text diperbarui (${patch.upsertPlanSections.length} bagian)`);
  }

  const selectedNodeId =
    state.selectedNodeId && finalNodeIds.has(state.selectedNodeId)
      ? state.selectedNodeId
      : nodes[0]?.id ?? null;

  return {
    nextState: {
      ...state,
      projectTitle,
      nodes,
      edges,
      planSections,
      selectedNodeId,
    },
    summary,
  };
}
