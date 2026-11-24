export type PrdPurpose = 'ui-ux-process' | 'application' | 'website';

export type ProductArchetype =
  | 'ecommerce'
  | 'booking'
  | 'saas'
  | 'portfolio'
  | 'education'
  | 'internal-tool'
  | 'custom';

export type AiExecutionMode = 'live-llm' | 'smart-fallback';

export type AiProviderChoice = 'auto' | 'gemini' | 'openai';

export interface AiSettings {
  provider: AiProviderChoice;
  apiKey: string;
}

export interface QuestionTag {
  id: string;
  label: string;
  description?: string;
  source: 'ai' | 'user';
}

export type AdaptiveQuestionId = 'q2' | 'q3' | 'q4' | 'q5';

export interface AdaptiveQuestionConfig {
  id: AdaptiveQuestionId;
  stepNumber: 2 | 3 | 4 | 5;
  title: string;
  prompt: string;
  helperHint: string;
  selectionMode: 'single' | 'multi' | 'unlimited';
  minSelect: number;
  maxSelect: number | null;
  tags: QuestionTag[];
  selectedTagIds: string[];
  updatedAt?: number;
}

export interface Q1Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface Q1ExtractedSummary {
  prdPurpose: PrdPurpose;
  archetype: ProductArchetype;
  productNameSuggestion: string;
  persona: string;
  coreGoal: string;
  painPoint: string;
  valueContext: string;
}

export interface PrdBusinessContext {
  successMetrics: string;
  userRolesAndRules: string;
  nonGoals: string;
  technicalConstraints: string;
}

export interface DiscoveryState {
  prdPurpose: PrdPurpose;
  q1Messages: Q1Message[];
  q1Summary: Q1ExtractedSummary | null;
  questions: Record<AdaptiveQuestionId, AdaptiveQuestionConfig>;
  businessContext?: PrdBusinessContext;
}

export type CanvasNodeKind =
  | 'ux-persona'
  | 'ux-pain'
  | 'ux-value'
  | 'ux-retention'
  | 'flow-start'
  | 'flow-feature'
  | 'flow-decision'
  | 'flow-outcome';

export type CanvasZone = 'ux-research' | 'business-flow';

export interface NodeDetails {
  purpose: string;
  actor: string;
  uiComponents: string[];
  userStory: string;
  acceptanceCriteria: string[];
  edgeCases: string[];
}

export interface PrdinNodeData extends Record<string, unknown> {
  title: string;
  subtitle: string;
  kind: CanvasNodeKind;
  zone: CanvasZone;
  linkedSectionId: string;
  details: NodeDetails;
}

export interface PrdinNode {
  id: string;
  type: 'uxResearch' | 'businessFlow';
  position: { x: number; y: number };
  data: PrdinNodeData;
  measured?: { width?: number; height?: number };
}

export interface PrdinEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
}

export type PlanCategory =
  | 'summary'
  | 'ux-research'
  | 'business-flow'
  | 'specs'
  | 'non-goals';

export interface PlanSection {
  id: string;
  category: PlanCategory;
  title: string;
  content: string;
  linkedNodeId?: string;
}

export interface WorkspaceChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mutationSummary?: string[];
}

export type RoadmapStatus = 'todo' | 'in-progress' | 'done' | 'failed';

export type TaskPriority = 'high' | 'medium' | 'low';

export interface RoadmapTask {
  id: string;
  title: string;
  description?: string;
  status: RoadmapStatus;
  priority: TaskPriority;
  linkedNodeId?: string;
  failureReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceState {
  projectId: string;
  projectTitle: string;
  aiMode: AiExecutionMode;
  discovery: DiscoveryState;
  nodes: PrdinNode[];
  edges: PrdinEdge[];
  planSections: PlanSection[];
  chatMessages: WorkspaceChatMessage[];
  selectedNodeId: string | null;
  roadmapTasks: RoadmapTask[];
}

export interface RecentProjectEntry {
  id: string;
  title: string;
  prdPurpose: PrdPurpose;
  storyPreview: string;
  updatedAt: number;
  nodeCount: number;
  taskCount: number;
  discovery: DiscoveryState;
  workspace: WorkspaceState | null;
}

export interface WorkspacePatch {
  projectTitle?: string;
  upsertNodes?: Array<{
    id: string;
    title: string;
    subtitle: string;
    kind: CanvasNodeKind;
    zone: CanvasZone;
    linkedSectionId: string;
    details: NodeDetails;
    connectFromNodeId?: string;
    edgeLabel?: string;
  }>;
  removeNodeIds?: string[];
  upsertEdges?: PrdinEdge[];
  removeEdgeIds?: string[];
  upsertPlanSections?: PlanSection[];
}
