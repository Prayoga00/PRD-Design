import { z } from 'zod';

export const PrdPurposeSchema = z.enum(['ui-ux-process', 'application', 'website']);

export const ProductArchetypeSchema = z.enum([
  'ecommerce',
  'booking',
  'saas',
  'portfolio',
  'education',
  'internal-tool',
  'custom',
]);

export const QuestionTagSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  description: z.string().max(180).optional(),
  source: z.enum(['ai', 'user']).default('ai'),
});

export const AdaptiveQuestionConfigSchema = z.object({
  id: z.enum(['q2', 'q3', 'q4', 'q5']),
  stepNumber: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  title: z.string().min(1),
  prompt: z.string().min(1),
  helperHint: z.string().min(1),
  selectionMode: z.enum(['single', 'multi', 'unlimited']).default('unlimited'),
  minSelect: z.number().int().min(1).default(1),
  maxSelect: z.number().int().min(1).max(100).nullable().optional().default(null),
  tags: z.array(QuestionTagSchema).min(3).max(30),
  selectedTagIds: z.array(z.string()).default([]),
});

export const PrdBusinessContextSchema = z.object({
  successMetrics: z.string().max(600).default(''),
  userRolesAndRules: z.string().max(600).default(''),
  nonGoals: z.string().max(600).default(''),
  technicalConstraints: z.string().max(600).default(''),
});

export const Q1ExtractedSummarySchema = z.object({
  prdPurpose: PrdPurposeSchema.default('website'),
  archetype: ProductArchetypeSchema,
  productNameSuggestion: z.string().min(2).max(80),
  persona: z.string().min(3).max(200),
  coreGoal: z.string().min(3).max(240),
  painPoint: z.string().min(3).max(240),
  valueContext: z.string().min(2).max(160),
});

export const HydrateQuestionsRequestSchema = z.object({
  prdPurpose: PrdPurposeSchema.default('website'),
  story: z.string().trim().min(8, 'Ceritakan minimal 8 karakter tentang pengguna dan tujuan aplikasimu.'),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .default([]),
  provider: z.enum(['auto', 'gemini', 'openai']).optional(),
});

export const HydrateQuestionsLlmOutputSchema = z.object({
  assistantReply: z.string().min(1),
  q1Summary: Q1ExtractedSummarySchema,
  questions: z.object({
    q2: AdaptiveQuestionConfigSchema,
    q3: AdaptiveQuestionConfigSchema,
    q4: AdaptiveQuestionConfigSchema,
    q5: AdaptiveQuestionConfigSchema,
  }),
});

export const NodeDetailsSchema = z.object({
  purpose: z.string().min(1),
  actor: z.string().min(1),
  uiComponents: z.array(z.string().min(1)).min(1).max(10),
  userStory: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(1).max(8),
  edgeCases: z.array(z.string().min(1)).min(1).max(8),
});

export const CanvasNodeKindSchema = z.enum([
  'ux-persona',
  'ux-pain',
  'ux-value',
  'ux-retention',
  'flow-start',
  'flow-feature',
  'flow-decision',
  'flow-outcome',
]);

export const RawBlueprintNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(160),
  kind: CanvasNodeKindSchema,
  zone: z.enum(['ux-research', 'business-flow']),
  linkedSectionId: z.string().min(1),
  details: NodeDetailsSchema,
});

export const PrdinEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().max(60).optional(),
  animated: z.boolean().optional(),
});

export const PlanSectionSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['summary', 'ux-research', 'business-flow', 'specs', 'non-goals']),
  title: z.string().min(1),
  content: z.string().min(1),
  linkedNodeId: z.string().optional(),
});

export const GenerateWorkspaceOutputSchema = z.object({
  projectTitle: z.string().min(2).max(90),
  blueprintNodes: z.array(RawBlueprintNodeSchema).min(4).max(40),
  edges: z.array(PrdinEdgeSchema).min(2).max(60),
  planSections: z.array(PlanSectionSchema).min(4).max(50),
  initialAssistantMessage: z.string().min(1),
});

export const WorkspacePatchSchema = z.object({
  projectTitle: z.string().min(2).max(90).optional(),
  upsertNodes: z
    .array(
      RawBlueprintNodeSchema.extend({
        connectFromNodeId: z.string().optional(),
        edgeLabel: z.string().max(60).optional(),
      })
    )
    .optional(),
  removeNodeIds: z.array(z.string().min(1)).optional(),
  upsertEdges: z.array(PrdinEdgeSchema).optional(),
  removeEdgeIds: z.array(z.string().min(1)).optional(),
  upsertPlanSections: z.array(PlanSectionSchema).optional(),
});

export const WorkspaceChatOutputSchema = z.object({
  assistantMessage: z.string().min(1),
  patch: WorkspacePatchSchema.default({}),
});

export type RawBlueprintNode = z.infer<typeof RawBlueprintNodeSchema>;
export type GenerateWorkspaceOutput = z.infer<typeof GenerateWorkspaceOutputSchema>;
export type WorkspaceChatOutput = z.infer<typeof WorkspaceChatOutputSchema>;
