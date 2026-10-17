import type { StructuredReport, ReportClaim } from '@appraiseme/reports'
import { reportToMarkdown, reportToText } from '@appraiseme/reports'

export type ExportFormat = 'markdown' | 'text' | 'json' | 'pdf' | 'docx'

export interface ExportOptions {
  format: ExportFormat
  filename?: string
}

export interface ExportResult {
  content: string | Uint8Array
  mimeType: string
  filename: string
  format: ExportFormat
}

export async function exportReport(
  report: StructuredReport,
  options: ExportOptions,
): Promise<ExportResult> {
  const filename = options.filename || sanitizeFilename(report.title)

  switch (options.format) {
    case 'markdown':
      return {
        content: reportToMarkdown(report),
        mimeType: 'text/markdown',
        filename: `${filename}.md`,
        format: 'markdown',
      }
    case 'text':
      return {
        content: reportToText(report),
        mimeType: 'text/plain',
        filename: `${filename}.txt`,
        format: 'text',
      }
    case 'json':
      return {
        content: JSON.stringify(report, null, 2),
        mimeType: 'application/json',
        filename: `${filename}.json`,
        format: 'json',
      }
    case 'pdf':
      return {
        content: await reportToPdf(report),
        mimeType: 'application/pdf',
        filename: `${filename}.pdf`,
        format: 'pdf',
      }
    case 'docx':
      return {
        content: await reportToDocx(report),
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename: `${filename}.docx`,
        format: 'docx',
      }
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
  return false
}

export function downloadFile(
  content: string | Uint8Array,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content as BlobPart], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function reportToPdf(
  report: StructuredReport,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')

  const doc = await PDFDocument.create()
  doc.setTitle(report.title)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 56
  const contentWidth = pageWidth - margin * 2

  const titleSize = 20
  const headingSize = 14
  const bodySize = 10.5
  const bodyLineHeight = 16

  let page = doc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  function newPageIfNeeded(needed: number): void {
    if (y - needed < margin) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
  }

  function drawWrapped(
    text: string,
    size: number,
    lineHeight: number,
    useBold: boolean,
  ): void {
    const activeFont = useBold ? boldFont : font
    const sanitized = sanitizeForPdf(text)
    const paragraphs = sanitized.split('\n')
    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/).filter(Boolean)
      if (words.length === 0) {
        y -= lineHeight / 2
        newPageIfNeeded(lineHeight)
        continue
      }
      let line = ''
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word
        if (activeFont.widthOfTextAtSize(candidate, size) > contentWidth) {
          newPageIfNeeded(lineHeight)
          page.drawText(line, {
            x: margin,
            y,
            size,
            font: activeFont,
            color: rgb(0.13, 0.13, 0.15),
          })
          y -= lineHeight
          line = word
        } else {
          line = candidate
        }
      }
      if (line) {
        newPageIfNeeded(lineHeight)
        page.drawText(line, {
          x: margin,
          y,
          size,
          font: activeFont,
          color: rgb(0.13, 0.13, 0.15),
        })
        y -= lineHeight
      }
    }
  }

  function drawHeading(text: string, size: number): void {
    y -= 10
    drawWrapped(text, size, size * 1.3, true)
  }

  drawWrapped(report.title, titleSize, titleSize * 1.25, true)
  y -= 6
  drawWrapped(
    `Period: ${formatDate(report.dateFrom)} - ${formatDate(report.dateTo)}`,
    bodySize,
    bodyLineHeight,
    false,
  )
  drawWrapped(`Style: ${report.style}`, bodySize, bodyLineHeight, false)
  y -= 6

  if (report.summary) {
    drawHeading('Summary', headingSize)
    drawWrapped(report.summary, bodySize, bodyLineHeight, false)
  }

  for (const section of report.sections) {
    drawHeading(section.title, headingSize)
    for (const claim of sortClaims(section.claims)) {
      drawWrapped(`•  ${claim.claimText}`, bodySize, bodyLineHeight, false)
      if (claim.evidence.length > 0) {
        const evidenceIds = claim.evidence.map((e) => e.entryId).join(', ')
        drawWrapped(`(Evidence: ${evidenceIds})`, bodySize - 1, bodyLineHeight, false)
      }
    }
  }

  return doc.save()
}

export async function reportToDocx(
  report: StructuredReport,
): Promise<Uint8Array> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import(
    'docx'
  )

  const children: InstanceType<typeof Paragraph>[] = []

  children.push(
    new Paragraph({
      text: report.title,
      heading: HeadingLevel.TITLE,
    }),
  )

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Period: ${formatDate(report.dateFrom)} - ${formatDate(report.dateTo)}`,
          italics: true,
          color: '595959',
        }),
      ],
    }),
  )
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Style: ${report.style}`,
          italics: true,
          color: '595959',
        }),
      ],
    }),
  )

  if (report.summary) {
    children.push(
      new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_1 }),
    )
    children.push(new Paragraph({ text: report.summary }))
  }

  for (const section of report.sections) {
    children.push(
      new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1 }),
    )
    for (const claim of sortClaims(section.claims)) {
      children.push(
        new Paragraph({
          text: claim.claimText,
          bullet: { level: 0 },
        }),
      )
      if (claim.evidence.length > 0) {
        const evidenceIds = claim.evidence.map((e) => e.entryId).join(', ')
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `(Evidence: ${evidenceIds})`,
                italics: true,
                size: 18,
                color: '808080',
              }),
            ],
            indent: { left: 720 },
          }),
        )
      }
    }
  }

  const doc = new Document({
    creator: 'AppraiseMe',
    title: report.title,
    sections: [{ children }],
  })

  const base64 = await Packer.toBase64String(doc)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function sortClaims(claims: ReportClaim[]): ReportClaim[] {
  return [...claims].sort((a, b) => a.sortOrder - b.sortOrder)
}

function sanitizeForPdf(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/•/g, '-')
    .replace(/[^\n\x20-\x7E\u00A1-\u00FF]/g, '?')
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function sanitizeFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'report'
  )
}
