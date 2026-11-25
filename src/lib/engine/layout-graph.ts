import type {
  FlowchartDirection,
  PlanSection,
  PrdinEdge,
  PrdinNode,
  WorkspacePatch,
  WorkspaceState,
} from '@/lib/types/prdin';
import type { RawBlueprintNode } from '@/lib/schemas/ai-contracts';

const LR_UX_START_X = 40;
const LR_UX_Y = 32;
const LR_UX_GAP_X = 340;

const LR_FLOW_START_X = 40;
const LR_FLOW_START_Y = 275;
const LR_FLOW_GAP_X = 405;
const LR_FLOW_GAP_Y = 240;
const LR_FLOW_COLS_PER_ROW = 4;

const TB_UX_X = 32;
const TB_SPINE_X = 385;
const TB_BRANCH_X = 830;
const TB_START_Y = 36;
const TB_STEP_GAP_Y = 210;
const TB_UX_GAP_Y = 195;

function toCanvasNodeType(zone: RawBlueprintNode['zone']): PrdinNode['type'] {
  return zone === 'ux-research' ? 'uxResearch' : 'businessFlow';
}

function isRecoveryOrBranchNode(
  node: RawBlueprintNode,
  edges: PrdinEdge[]
): boolean {
  if (node.id === 'flow-recovery' || node.id.includes('recovery') || node.id.includes('revisi')) {
    return true;
  }
  const incoming = edges.filter((e) => e.target === node.id);
  const outgoing = edges.filter((e) => e.source === node.id);
  const comesFromDecisionAsRevisi = incoming.some(
    (e) => e.source === 'flow-decision' && /tidak|revisi|gagal|ulangi|batal/i.test(e.label ?? '')
  );
  const loopsBackToEarlier = outgoing.some(
    (e) => /ulangi|kembali|perbaiki|retry|loop/i.test(e.label ?? '')
  );
  return comesFromDecisionAsRevisi || (loopsBackToEarlier && node.kind !== 'flow-outcome');
}

function buildTopologicalFlowOrder(
  flowNodes: RawBlueprintNode[],
  edges: PrdinEdge[]
): { spineNodes: RawBlueprintNode[]; branchNodes: RawBlueprintNode[]; levelById: Map<string, number> } {
  const branchNodes = flowNodes.filter((n) => isRecoveryOrBranchNode(n, edges));
  const branchIdSet = new Set(branchNodes.map((n) => n.id));
  const spineCandidates = flowNodes.filter((n) => !branchIdSet.has(n.id));

  const spineIdSet = new Set(spineCandidates.map((n) => n.id));
  const incomingCount = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of spineCandidates) {
    incomingCount.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (spineIdSet.has(edge.source) && spineIdSet.has(edge.target)) {
      adjacency.get(edge.source)?.push(edge.target);
      incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
    }
  }

  const levelById = new Map<string, number>();
  const queue: string[] = [];

  for (const node of spineCandidates) {
    if ((incomingCount.get(node.id) ?? 0) === 0 || node.kind === 'flow-start') {
      if (!levelById.has(node.id)) {
        levelById.set(node.id, 0);
        queue.push(node.id);
      }
    }
  }

  if (queue.length === 0 && spineCandidates.length > 0) {
    levelById.set(spineCandidates[0].id, 0);
    queue.push(spineCandidates[0].id);
  }

  let cursor = 0;
  while (cursor < queue.length) {
    const currentId = queue[cursor++];
    const currentLevel = levelById.get(currentId) ?? 0;
    const neighbors = adjacency.get(currentId) ?? [];

    for (const nextId of neighbors) {
      const candidateLevel = currentLevel + 1;
      const existing = levelById.get(nextId);
      if (existing === undefined || (candidateLevel > existing && candidateLevel <= spineCandidates.length)) {
        levelById.set(nextId, candidateLevel);
        queue.push(nextId);
      }
    }
  }

  const orderedSpine = [...spineCandidates].sort((a, b) => {
    const la = levelById.get(a.id) ?? 999;
    const lb = levelById.get(b.id) ?? 999;
    if (la !== lb) return la - lb;
    if (a.kind === 'flow-start') return -1;
    if (b.kind === 'flow-start') return 1;
    if (a.kind === 'flow-outcome') return 1;
    if (b.kind === 'flow-outcome') return -1;
    return 0;
  });

  orderedSpine.forEach((node, idx) => {
    if (!levelById.has(node.id)) {
      levelById.set(node.id, idx);
    }
  });

  return { spineNodes: orderedSpine, branchNodes, levelById };
}

function layoutVerticalFlowchart(
  uxNodes: RawBlueprintNode[],
  flowNodes: RawBlueprintNode[],
  edges: PrdinEdge[]
): PrdinNode[] {
  const positioned: PrdinNode[] = [];
  const { spineNodes, branchNodes, levelById } = buildTopologicalFlowOrder(flowNodes, edges);

  // Place main vertical spine down the center lane
  const columns = new Map<number, RawBlueprintNode[]>();
  spineNodes.forEach((node, idx) => {
    const level = levelById.get(node.id) ?? idx;
    const list = columns.get(level) ?? [];
    list.push(node);
    columns.set(level, list);
  });

  const sortedLevels = Array.from(columns.keys()).sort((a, b) => a - b);
  const flowPosById = new Map<string, { x: number; y: number }>();

  let currentY = TB_START_Y;
  for (const level of sortedLevels) {
    const levelNodes = columns.get(level) ?? [];
    const hasDecision = levelNodes.some((n) => n.kind === 'flow-decision');

    levelNodes.forEach((node, colOffset) => {
      const x = TB_SPINE_X + colOffset * 340;
      const y = currentY;
      flowPosById.set(node.id, { x, y });
      positioned.push({
        id: node.id,
        type: toCanvasNodeType(node.zone),
        position: { x, y },
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

    currentY += hasDecision ? TB_STEP_GAP_Y + 30 : TB_STEP_GAP_Y;
  }

  // Place decision branch / recovery nodes in the right lane aligned beside parent decision node
  branchNodes.forEach((node, idx) => {
    const incomingEdge = edges.find((e) => e.target === node.id);
    const parentPos = incomingEdge ? flowPosById.get(incomingEdge.source) : undefined;
    const anchorY = parentPos?.y ?? TB_START_Y + idx * TB_STEP_GAP_Y;

    let candidateY = anchorY;
    const branchOccupiedY = positioned
      .filter((n) => n.position.x >= TB_BRANCH_X - 40)
      .map((n) => n.position.y);
    while (branchOccupiedY.some((oy) => Math.abs(oy - candidateY) < 160)) {
      candidateY += TB_STEP_GAP_Y;
    }

    positioned.push({
      id: node.id,
      type: toCanvasNodeType(node.zone),
      position: { x: TB_BRANCH_X, y: candidateY },
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

  // Align left UX Research cards directly beside the flowchart stage they drive
  const usedUxY: number[] = [];
  uxNodes.forEach((node, idx) => {
    const linkedEdge = edges.find((e) => e.source === node.id && flowPosById.has(e.target));
    const targetPos = linkedEdge ? flowPosById.get(linkedEdge.target) : undefined;

    let candidateY = targetPos?.y ?? TB_START_Y + idx * TB_UX_GAP_Y;
    while (usedUxY.some((oy) => Math.abs(oy - candidateY) < 155)) {
      candidateY += TB_UX_GAP_Y;
    }
    usedUxY.push(candidateY);

    positioned.push({
      id: node.id,
      type: toCanvasNodeType(node.zone),
      position: { x: TB_UX_X, y: candidateY },
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

  return positioned;
}

function layoutHorizontalFlowchart(
  uxNodes: RawBlueprintNode[],
  flowNodes: RawBlueprintNode[],
  edges: PrdinEdge[]
): PrdinNode[] {
  const positioned: PrdinNode[] = [];
  const { spineNodes, branchNodes, levelById } = buildTopologicalFlowOrder(flowNodes, edges);

  uxNodes.forEach((node, index) => {
    positioned.push({
      id: node.id,
      type: toCanvasNodeType(node.zone),
      position: {
        x: LR_UX_START_X + index * LR_UX_GAP_X,
        y: LR_UX_Y,
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

  const columns = new Map<number, RawBlueprintNode[]>();
  spineNodes.forEach((node, idx) => {
    const col = levelById.get(node.id) ?? idx;
    const list = columns.get(col) ?? [];
    list.push(node);
    columns.set(col, list);
  });

  const flowPosById = new Map<string, { x: number; y: number }>();
  const sortedCols = Array.from(columns.keys()).sort((a, b) => a - b);

  for (const level of sortedCols) {
    const colNodes = columns.get(level) ?? [];
    const wrapRow = Math.floor(level / LR_FLOW_COLS_PER_ROW);
    const visualCol = level % LR_FLOW_COLS_PER_ROW;

    colNodes.forEach((node, rowIdx) => {
      const x = LR_FLOW_START_X + visualCol * LR_FLOW_GAP_X;
      const y = LR_FLOW_START_Y + wrapRow * (LR_FLOW_GAP_Y * 1.45) + rowIdx * LR_FLOW_GAP_Y;
      flowPosById.set(node.id, { x, y });
      positioned.push({
        id: node.id,
        type: toCanvasNodeType(node.zone),
        position: { x, y },
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

  // Place branch / recovery nodes below their decision gate node
  branchNodes.forEach((node, idx) => {
    const incomingEdge = edges.find((e) => e.target === node.id);
    const parentPos = incomingEdge ? flowPosById.get(incomingEdge.source) : undefined;
    let candidateX = parentPos?.x ?? LR_FLOW_START_X + idx * LR_FLOW_GAP_X;
    let candidateY = (parentPos?.y ?? LR_FLOW_START_Y) + LR_FLOW_GAP_Y;

    const collides = (x: number, y: number) =>
      positioned.some((p) => Math.abs(p.position.x - x) < 280 && Math.abs(p.position.y - y) < 150);

    while (collides(candidateX, candidateY)) {
      candidateY += LR_FLOW_GAP_Y;
      if (candidateY > LR_FLOW_START_Y + LR_FLOW_GAP_Y * 2.5) {
        candidateX += LR_FLOW_GAP_X;
      }
    }

    positioned.push({
      id: node.id,
      type: toCanvasNodeType(node.zone),
      position: { x: candidateX, y: candidateY },
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

  return positioned;
}

/**
 * Computes deterministic, non-overlapping flowchart coordinates for UX Research cards
 * and Business Flowchart nodes in either Vertical ('TB') or Horizontal ('LR') flow direction.
 */
export function layoutBlueprintNodes(
  rawNodes: RawBlueprintNode[],
  edges: PrdinEdge[],
  direction: FlowchartDirection = 'TB'
): PrdinNode[] {
  const uxNodes = rawNodes.filter((n) => n.zone === 'ux-research');
  const flowNodes = rawNodes.filter((n) => n.zone === 'business-flow');

  return direction === 'LR'
    ? layoutHorizontalFlowchart(uxNodes, flowNodes, edges)
    : layoutVerticalFlowchart(uxNodes, flowNodes, edges);
}

/**
 * Re-computes flowchart layout coordinates on an existing Workspace node list
 * when switching Vertical/Horizontal orientation or auto-tidying the diagram.
 */
export function relayoutWorkspaceNodes(
  nodes: PrdinNode[],
  edges: PrdinEdge[],
  direction: FlowchartDirection = 'TB'
): PrdinNode[] {
  const rawNodes: RawBlueprintNode[] = nodes.map((n) => ({
    id: n.id,
    title: n.data.title,
    subtitle: n.data.subtitle,
    kind: n.data.kind,
    zone: n.data.zone,
    linkedSectionId: n.data.linkedSectionId,
    details: n.data.details,
  }));
  const laidOut = layoutBlueprintNodes(rawNodes, edges, direction);
  const measuredById = new Map(nodes.map((n) => [n.id, n.measured]));
  return laidOut.map((node) => ({
    ...node,
    measured: measuredById.get(node.id),
  }));
}

function findNonOverlappingPosition(
  existingNodes: PrdinNode[],
  zone: RawBlueprintNode['zone'],
  connectFromNodeId?: string,
  direction: FlowchartDirection = 'TB'
): { x: number; y: number } {
  const occupied = existingNodes.map((n) => n.position);
  const collides = (x: number, y: number) =>
    occupied.some((pos) => Math.abs(pos.x - x) < 260 && Math.abs(pos.y - y) < 150);

  if (connectFromNodeId) {
    const anchor = existingNodes.find((n) => n.id === connectFromNodeId);
    if (anchor) {
      const candidates =
        direction === 'TB'
          ? [
              { x: anchor.position.x, y: anchor.position.y + TB_STEP_GAP_Y },
              { x: anchor.position.x + 360, y: anchor.position.y },
              { x: anchor.position.x + 360, y: anchor.position.y + TB_STEP_GAP_Y },
            ]
          : [
              { x: anchor.position.x + LR_FLOW_GAP_X, y: anchor.position.y },
              { x: anchor.position.x, y: anchor.position.y + LR_FLOW_GAP_Y },
              { x: anchor.position.x + LR_FLOW_GAP_X, y: anchor.position.y + LR_FLOW_GAP_Y },
            ];
      for (const candidate of candidates) {
        if (candidate.x >= 20 && !collides(candidate.x, candidate.y)) {
          return candidate;
        }
      }
    }
  }

  const zoneNodes = existingNodes.filter((n) => n.data.zone === zone);
  if (zone === 'ux-research') {
    if (direction === 'TB') {
      const maxY = zoneNodes.reduce((acc, n) => Math.max(acc, n.position.y), TB_START_Y - TB_UX_GAP_Y);
      let candidateY = maxY + TB_UX_GAP_Y;
      while (collides(TB_UX_X, candidateY)) {
        candidateY += TB_UX_GAP_Y;
      }
      return { x: TB_UX_X, y: candidateY };
    }
    let x = LR_UX_START_X + zoneNodes.length * LR_UX_GAP_X;
    while (collides(x, LR_UX_Y)) {
      x += LR_UX_GAP_X;
    }
    return { x, y: LR_UX_Y };
  }

  if (direction === 'TB') {
    const maxY = zoneNodes.reduce((acc, n) => Math.max(acc, n.position.y), TB_START_Y - TB_STEP_GAP_Y);
    let candidateY = maxY + TB_STEP_GAP_Y;
    while (collides(TB_SPINE_X, candidateY)) {
      candidateY += TB_STEP_GAP_Y;
    }
    return { x: TB_SPINE_X, y: candidateY };
  }

  const maxX = zoneNodes.reduce(
    (acc, n) => Math.max(acc, n.position.x),
    LR_FLOW_START_X - LR_FLOW_GAP_X
  );
  let candidateX = maxX + LR_FLOW_GAP_X;
  while (collides(candidateX, LR_FLOW_START_Y)) {
    candidateX += LR_FLOW_GAP_X;
  }
  return { x: candidateX, y: LR_FLOW_START_Y };
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
  const direction = state.flowchartDirection ?? 'TB';

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
          incoming.connectFromNodeId,
          direction
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
