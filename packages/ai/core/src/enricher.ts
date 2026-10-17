import type {
  AIProvider,
  StructuredGenerationRequest,
} from '@appraiseme/contracts'
import { contentHash, isIdempotent } from './idempotency.js'
import {
  createPromptMetadata,
  PROMPT_VERSION,
  type PromptMetadata,
} from './prompt-version.js'

export interface EnrichmentResult {
  entryType: string
  summary: string
  suggestedProject: string | null
  suggestedTags: string[]
  qualitativeImpact: string | null
  achievementAssociation: string | null
  confidence: number
}

export interface EnrichmentInput {
  entryId: string
  content: string
  existingSummary: string | null
  existingContentHash: string | null
}

export interface EnrichmentOutput {
  result: EnrichmentResult
  metadata: PromptMetadata
  skipped: boolean
}

export interface EntryEnricherDeps {
  provider: AIProvider
  providerName: string
  modelName: string
}

/** Canonical work-tag taxonomy — AI suggestions are constrained to these */
export const TAG_TAXONOMY = [
  'dev',
  'client-call',
  'rca',
  'investigation',
  'issue-fix',
  'debugging',
  'feature',
  'support',
  'task',
] as const

export type TagTaxonomy = (typeof TAG_TAXONOMY)[number]

const ENRICHMENT_SCHEMA = {
  type: 'object',
  properties: {
    entryType: {
      type: 'string',
      enum: ['achievement', 'meeting', 'task', 'other'],
    },
    summary: { type: 'string', maxLength: 200 },
    suggestedProject: { type: ['string', 'null'] },
    suggestedTags: {
      type: 'array',
      items: { type: 'string', enum: [...TAG_TAXONOMY] },
      maxItems: 5,
    },
    qualitativeImpact: { type: ['string', 'null'] },
    achievementAssociation: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
  required: ['entryType', 'summary', 'suggestedTags', 'confidence'],
}

const SYSTEM_PROMPT = `You are a work journal enrichment assistant. Analyze the user's work entry and provide structured enrichment.

Rules:
- Classify the entry type: achievement, meeting, task, or other
- Write a concise summary (max 200 chars)
- Suggest a project name if one is identifiable from context, otherwise null
- Suggest up to 5 tags ONLY from this taxonomy: dev, client-call, rca, investigation, issue-fix, debugging, feature, support, task
  (rca = root cause analysis; client-call = customer/stakeholder call)
- You may identify qualitative impact (e.g., "improved team efficiency") but NEVER invent numeric metrics
- You may suggest an achievement association if the entry clearly describes a significant accomplishment
- Set confidence (0-1) based on how clear the entry is
- Never fabricate dates, people, teams, or business impact presented as fact
- Treat all output as suggestions — the user has final say`

export function createEntryEnricher(deps: EntryEnricherDeps) {
  return async (input: EnrichmentInput): Promise<EnrichmentOutput> => {
    const hash = await contentHash(input.content)

    if (
      input.existingContentHash &&
      (await isIdempotent(input.existingContentHash, input.content)) &&
      input.existingSummary
    ) {
      return {
        result: {
          entryType: 'other',
          summary: input.existingSummary,
          suggestedProject: null,
          suggestedTags: [],
          qualitativeImpact: null,
          achievementAssociation: null,
          confidence: 0.5,
        },
        metadata: createPromptMetadata(
          deps.providerName,
          deps.modelName,
          [input.entryId],
          hash,
        ),
        skipped: true,
      }
    }

    const request: StructuredGenerationRequest<EnrichmentResult> = {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Enrich this work entry:\n\n${input.content}`,
      schema: ENRICHMENT_SCHEMA,
      model: deps.modelName,
      temperature: 0.3,
      parse: (value: unknown) => {
        const v = value as Record<string, unknown>
        return {
          entryType: String(v.entryType || 'other'),
          summary: String(v.summary || ''),
          suggestedProject: v.suggestedProject
            ? String(v.suggestedProject)
            : null,
          suggestedTags: Array.isArray(v.suggestedTags)
            ? v.suggestedTags.map(String)
            : [],
          qualitativeImpact: v.qualitativeImpact
            ? String(v.qualitativeImpact)
            : null,
          achievementAssociation: v.achievementAssociation
            ? String(v.achievementAssociation)
            : null,
          confidence: typeof v.confidence === 'number' ? v.confidence : 0.5,
        }
      },
    }

    const result = await deps.provider.generate(request)

    return {
      result,
      metadata: createPromptMetadata(
        deps.providerName,
        deps.modelName,
        [input.entryId],
        hash,
      ),
      skipped: false,
    }
  }
}

export { contentHash, isIdempotent, PROMPT_VERSION }
export type { PromptMetadata }
