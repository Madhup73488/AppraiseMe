import type {
  AIProvider,
  StructuredGenerationRequest,
} from '@appraiseme/contracts'
import { createPromptMetadata, type PromptMetadata } from '@appraiseme/ai-core'
import type {
  StructuredReport,
  GenerateReportInput,
  GenerateReportOutput,
  ReportClaim,
  ReportStyle,
} from './types.js'

export interface ReportWriterDeps {
  provider: AIProvider
  providerName: string
  modelName: string
}

const REPORT_PROMPT_VERSION = '1'

const STYLE_INSTRUCTIONS: Record<ReportStyle, string> = {
  concise:
    'Keep the report brief and scannable. Use short bullet points. Focus on outcomes.',
  detailed:
    'Provide thorough analysis with context. Include background and reasoning.',
  leadership:
    'Write for a leadership audience. Emphasize strategic impact, business value, and decisions.',
  impact:
    'Focus on measurable outcomes and impact. Highlight achievements and their significance.',
  balanced:
    'Provide a balanced overview covering all activities, outcomes, and context.',
}

const SYSTEM_PROMPT = `You are a professional work report generator. Given a set of work entries, produce a structured report.

Rules:
- Base every claim on the provided work entries — never fabricate information
- Each claim must reference at least one source entry ID as evidence
- Group claims into logical sections (e.g., "Key Achievements", "Projects", "Meetings & Collaboration")
- Do not invent numeric metrics unless they appear in the source entries
- Do not fabricate dates, people, or teams not present in the entries
- Write professionally but without jargon
- The summary should be a 2-3 sentence overview of the period
- If there is insufficient data for a section, omit it rather than padding`

export function createReportWriter(deps: ReportWriterDeps) {
  return async (input: GenerateReportInput): Promise<GenerateReportOutput> => {
    const entriesContext = formatEntriesForPrompt(input.entries)
    const styleInstruction =
      STYLE_INSTRUCTIONS[input.style] || STYLE_INSTRUCTIONS.balanced

    const userPrompt = `Generate a ${input.reportType} report for the period ${input.dateFrom} to ${input.dateTo}.

Style: ${input.style} — ${styleInstruction}

Work entries (${input.entries.length} total):
${entriesContext}`

    const request: StructuredGenerationRequest<StructuredReport> = {
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                title: { type: 'string' },
                claims: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      sectionKey: { type: 'string' },
                      claimText: { type: 'string' },
                      sortOrder: { type: 'number' },
                      evidence: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            entryId: { type: 'string' },
                            relevance: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      model: deps.modelName,
      temperature: 0.4,
      parse: (value: unknown) => parseReport(value, input),
    }

    const report = await deps.provider.generate(request)

    const metadata = createPromptMetadata(
      deps.providerName,
      deps.modelName,
      input.entries.map((e) => e.id),
    )

    return {
      report,
      provider: deps.providerName,
      model: deps.modelName,
      promptVersion: REPORT_PROMPT_VERSION,
      generatedAt: metadata.generatedAt,
    }
  }
}

function formatEntriesForPrompt(
  entries: GenerateReportInput['entries'],
): string {
  if (entries.length === 0) return '(no entries for this period)'

  return entries
    .map((e, i) => {
      const parts = [`[${i + 1}] ID: ${e.id}`]
      parts.push(`    Date: ${e.occurredAt}`)
      parts.push(`    Type: ${e.entryType}`)
      if (e.projectName) parts.push(`    Project: ${e.projectName}`)
      if (e.importance > 0) parts.push(`    Importance: ${e.importance}`)
      parts.push(`    Content: ${e.content}`)
      if (e.aiSummary) parts.push(`    AI Summary: ${e.aiSummary}`)
      return parts.join('\n')
    })
    .join('\n\n')
}

function parseReport(
  value: unknown,
  input: GenerateReportInput,
): StructuredReport {
  const v = value as Record<string, unknown>
  const sections = Array.isArray(v.sections) ? v.sections : []

  return {
    title: String(v.title || `${input.reportType} Report`),
    reportType: input.reportType,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    style: input.style,
    summary: String(v.summary || ''),
    sections: sections.map((s: Record<string, unknown>, sIdx: number) => {
      const key = String(s.key || `section-${sIdx}`)
      const title = String(s.title || key)
      const claims = Array.isArray(s.claims) ? s.claims : []
      return {
        key,
        title,
        claims: claims.map((c: Record<string, unknown>, cIdx: number) => {
          const claim: ReportClaim = {
            id: String(c.id || `claim-${sIdx}-${cIdx}`),
            sectionKey: key,
            claimText: String(c.claimText || ''),
            sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : cIdx,
            evidence: Array.isArray(c.evidence)
              ? c.evidence.map((e: Record<string, unknown>) => ({
                  entryId: String(e.entryId || ''),
                  relevance: typeof e.relevance === 'number' ? e.relevance : 0,
                }))
              : [],
          }
          return claim
        }),
      }
    }),
  }
}

export type { PromptMetadata }
