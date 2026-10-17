'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  AppShell,
  Skeleton,
  OnboardingFlow,
  Timeline,
  SearchBar,
  SearchFilters,
  EntryEditor,
  Button,
  EmptyState,
  ExportDialog,
  ReportEditor,
  ConnectionSettingsDialog,
  AIConnectionSettingsDialog,
  DatabaseGate,
  VoiceCaptureButton,
  NewProjectDialog,
  ThemePicker,
  Input,
  LoadingScreen,
  TypewriterText,
  createCommandRegistry,
  type EntryCardData,
  type EntryEditorData,
  type EntryEditorProject,
  type ReportEditorData,
  type SearchFiltersValue,
} from '@appraiseme/ui'
import {
  createCaptureEntryUseCase,
  createListTimelineUseCase,
  createUpdateEntryUseCase,
  createDeleteEntryUseCase,
  createListProjectsUseCase,
  createCreateProjectUseCase,
  createListReportsUseCase,
  createGenerateReportUseCase,
  createAskWorklogUseCase,
} from '@appraiseme/application'
import { exportReport, downloadFile, copyToClipboard } from '@appraiseme/export'
import {
  reportToMarkdown,
  type ReportType,
  type ReportStyle,
} from '@appraiseme/reports'
import type { WorkEntryDTO, ProjectDTO, ReportDTO } from '@appraiseme/contracts'
import {
  Plus,
  FileText,
  Sparkles,
  Trophy,
  Database,
  LogOut,
  Send,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { createPersistentStore } from '@appraiseme/storage-memory'
import { useSync } from '@/lib/use-sync'
import { SUPABASE_SETUP_SQL } from '@appraiseme/storage-supabase'
import { useAI } from '@/lib/use-ai'

export default function HomePage() {
  const router = useRouter()
  const { session, loading, signOut } = useAuth()
  const [activeNav, setActiveNav] = useState('today')
  const [activeTab, setActiveTab] = useState('today')
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('appraiseme:onboarding:v1') === 'done'
    } catch {
      return false
    }
  })
  const [currentTheme, setCurrentTheme] = useState('appraiseme')
  const [entries, setEntries] = useState<EntryCardData[]>([])
  const [projects, setProjects] = useState<ProjectDTO[]>([])
  const [timelineLoading, setTimelineLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<SearchFiltersValue>({
    projectId: null,
    entryType: null,
    tag: null,
  })
  const [editingEntry, setEditingEntry] = useState<EntryEditorData | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [reports, setReports] = useState<ReportDTO[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportEditorData | null>(
    null,
  )
  const [exportOpen, setExportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aiSettingsOpen, setAISettingsOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [askQuestion, setAskQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [askThread, setAskThread] = useState<
    Array<{ id: string; question: string; answer: string; error?: string }>
  >([])
  const askBottomRef = useRef<HTMLDivElement>(null)
  const [workspaceBooted, setWorkspaceBooted] = useState(false)

  const ownerId = session?.userId || 'web-user'
  const store = useMemo(() => createPersistentStore(ownerId), [ownerId])

  const sync = useSync(store, ownerId, { authToken: session?.accessToken ?? null })

  const useCases = useMemo(
    () => ({
      capture: createCaptureEntryUseCase({ store, outbox: sync.outbox }),
      listTimeline: createListTimelineUseCase({ store }),
      update: createUpdateEntryUseCase({ store, outbox: sync.outbox }),
      remove: createDeleteEntryUseCase({ store, outbox: sync.outbox }),
      listProjects: createListProjectsUseCase({ store }),
      createProject: createCreateProjectUseCase({ store }),
      listReports: createListReportsUseCase({ store }),
    }),
    [store, sync.outbox],
  )

  const loadEntries = useCallback(async () => {
    setTimelineLoading(true)
    try {
      const list = await useCases.listTimeline({})
      setEntries(list.map(mapEntryToCard))
    } finally {
      setTimelineLoading(false)
    }
  }, [useCases])

  const loadProjects = useCallback(async () => {
    const list = await useCases.listProjects()
    setProjects(list)
  }, [useCases])

  const loadReports = useCallback(async () => {
    const list = await useCases.listReports()
    setReports(list)
  }, [useCases])

  const loadEntriesRef = useRef(loadEntries)
  loadEntriesRef.current = loadEntries

  const ai = useAI(
    store,
    sync.outbox,
    useCallback(() => {
      void loadEntriesRef.current()
    }, []),
    { authToken: session?.accessToken ?? null },
  )

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [loading, session, router])

  useEffect(() => {
    if (session) {
      loadEntries()
      loadProjects()
      loadReports()
    }
  }, [session, loadEntries, loadProjects, loadReports])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme)
    document.documentElement.classList.toggle('dark', true)
  }, [currentTheme])

  useEffect(() => {
    setSelectedReport(null)
    setReportError(null)
  }, [activeNav])

  // boot loader is only for session + connection restore/completion; if the
  // gate becomes visible instead, the boot sequence is considered done
  useEffect(() => {
    if (sync.connecting || sync.restoring) {
      setWorkspaceBooted(false)
    } else if (sync.restoreFinished && !sync.connected) {
      setWorkspaceBooted(true)
    }
  }, [sync.connecting, sync.restoring, sync.restoreFinished, sync.connected])

  useEffect(() => {
    if (sync.connected) {
      loadEntries()
      loadProjects()
      loadReports()
    }
  }, [sync.connected, loadEntries, loadProjects, loadReports])

  const registry = useMemo(() => {
    const r = createCommandRegistry()
    r.register({
      id: 'new-entry',
      label: 'New entry',
      shortcut: 'Cmd+N',
      group: 'Actions',
      perform: () => {
        const input = document.querySelector(
          'textarea[aria-label="Quick capture"]',
        ) as HTMLTextAreaElement
        input?.focus()
      },
    })
    r.register({
      id: 'search',
      label: 'Search work entries',
      shortcut: 'Cmd+F',
      group: 'Actions',
      perform: () => {
        const search = document.querySelector(
          'input[placeholder*="Search"]',
        ) as HTMLInputElement
        search?.focus()
      },
    })
    r.register({
      id: 'sign-out',
      label: 'Sign out',
      group: 'Account',
      perform: () => signOut(),
    })
    r.register({
      id: 'sync-now',
      label: 'Sync now',
      group: 'Actions',
      perform: () => sync.syncNow(),
    })
    r.register({
      id: 'database-connection',
      label: 'Database connection settings',
      group: 'Settings',
      perform: () => setSettingsOpen(true),
    })
    r.register({
      id: 'ai-connection',
      label: 'AI provider settings',
      group: 'Settings',
      perform: () => setAISettingsOpen(true),
    })
    r.register({
      id: 'ask',
      label: 'Go to Ask',
      group: 'Navigation',
      perform: () => setActiveNav('ask'),
    })
    r.register({
      id: 'settings',
      label: 'Go to Settings',
      group: 'Navigation',
      perform: () => setActiveNav('settings'),
    })
    r.register({
      id: 'weekly',
      label: 'Go to Weekly report',
      group: 'Navigation',
      perform: () => setActiveNav('weekly'),
    })
    return r
  }, [signOut, sync, ai])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleSave = useCallback(
    async (content: string) => {
      try {
        const entry = await useCases.capture({ content })
        setSaveError(null)
        ai.requestEnrichment(entry.id)
        await loadEntries()
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Save failed')
      }
    },
    [useCases, loadEntries, ai],
  )

  const handleVoiceTranscript = useCallback(
    async (text: string) => {
      let content = text
      if (ai.connected && ai.rephrase) {
        try {
          content = await ai.rephrase(text)
        } catch {
          // rephrase failed — save the raw transcript
        }
      }
      const entry = await useCases.capture({
        content,
        entryType: 'task',
        source: 'voice',
      })
      ai.requestEnrichment(entry.id)
      await loadEntries()
    },
    [useCases, loadEntries, ai],
  )

  const handleEdit = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id)
      if (!entry) return
      setEditingEntry({
        id: entry.id,
        content: entry.content,
        entryType: entry.entryType,
        projectId: null,
        importance: entry.importance,
      })
      setEditorOpen(true)
    },
    [entries],
  )

  const handleEditorSave = useCallback(
    async (
      id: string,
      data: {
        content: string
        entryType: string
        projectId: string | null
        importance: number
      },
    ) => {
      await useCases.update(id, {
        ...data,
        projectId: data.projectId || undefined,
      })
      await loadEntries()
      setEditorOpen(false)
    },
    [useCases, loadEntries],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await useCases.remove(id)
      await loadEntries()
    },
    [useCases, loadEntries],
  )

  const handleGenerateReport = useCallback(
    async (reportType: ReportType) => {
      const ctx = ai.providerContext()
      if (!ctx) {
        setReportError('Connect an AI provider first (✨ in the top bar)')
        return
      }
      setGeneratingReport(true)
      setReportError(null)
      try {
        const generate = createGenerateReportUseCase({
          store,
          provider: ctx.provider,
          providerName: ctx.providerName,
          modelName: ctx.modelName,
        })
        await generate({ reportType })
        await loadReports()
      } catch (e) {
        setReportError(
          e instanceof Error ? e.message : 'Report generation failed',
        )
      } finally {
        setGeneratingReport(false)
      }
    },
    [ai, store, loadReports],
  )

  const handleAsk = useCallback(async () => {
    const question = askQuestion.trim()
    if (!question || asking) return
    const ctx = ai.providerContext()
    if (!ctx) {
      setAskThread((t) => [
        ...t,
        {
          id: `q-${Date.now()}`,
          question,
          answer: '',
          error: 'Connect an AI provider first (Settings → AI provider)',
        },
      ])
      setAskQuestion('')
      return
    }
    const id = `q-${Date.now()}`
    setAsking(true)
    setAskQuestion('')
    setAskThread((t) => [...t, { id, question, answer: '' }])
    try {
      const ask = createAskWorklogUseCase({ store, provider: ctx.provider })
      const res = await ask(question)
      setAskThread((t) =>
        t.map((m) => (m.id === id ? { ...m, answer: res.answer } : m)),
      )
    } catch (e) {
      setAskThread((t) =>
        t.map((m) =>
          m.id === id
            ? { ...m, error: e instanceof Error ? e.message : 'Ask failed' }
            : m,
        ),
      )
    } finally {
      setAsking(false)
    }
  }, [askQuestion, asking, ai, store])

  useEffect(() => {
    askBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [askThread])

  const filteredEntries = useMemo(() => {
    let result = entries
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.content.toLowerCase().includes(q) ||
          (e.aiSummary?.toLowerCase().includes(q) ?? false),
      )
    }
    if (filters.entryType) {
      result = result.filter((e) => e.entryType === filters.entryType)
    }
    if (filters.tag) {
      result = result.filter(
        (e) => e.suggestedTags?.includes(filters.tag!) ?? false,
      )
    }
    return result
  }, [entries, searchQuery, filters])

  const editorProjects: EntryEditorProject[] = useMemo(
    () => projects.map((p) => ({ id: p.id, name: p.name })),
    [projects],
  )

  const tabs = useMemo(() => {
    const labels: Record<string, string> = {
      today: 'Today',
      timeline: 'Timeline',
      projects: 'Projects',
      achievements: 'Achievements',
      ask: 'Ask',
      weekly: 'Weekly',
      monthly: 'Monthly',
      appraisal: 'Appraisal',
      settings: 'Settings',
    }
    return [{ id: activeNav, label: labels[activeNav] ?? activeNav }]
  }, [activeNav])

  const todayEntries = useMemo(() => {
    const key = new Date().toDateString()
    return entries.filter(
      (e) => new Date(e.occurredAt).toDateString() === key,
    )
  }, [entries])

  const stats = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const days = new Set(
      entries.map((e) => new Date(e.occurredAt).toDateString()),
    )
    let streak = 0
    const d = new Date(now)
    while (days.has(d.toDateString())) {
      streak++
      d.setDate(d.getDate() - 1)
    }
    return {
      total: entries.length,
      thisWeek: entries.filter((e) => new Date(e.occurredAt) >= weekAgo)
        .length,
      enriched: entries.filter((e) => e.aiStatus === 'completed').length,
      streak,
      projects: projects.length,
    }
  }, [entries, projects])

  if (loading) {
    return <LoadingScreen progress={18} label="Checking your session…" />
  }

  if (!session) {
    return <LoadingScreen progress={35} label="Preparing AppraiseMe…" />
  }

  if (!onboardingComplete) {
    return (
      <OnboardingFlow
        onComplete={(data) => {
          setCurrentTheme(data.theme)
          setOnboardingComplete(true)
          try {
            window.localStorage.setItem('appraiseme:onboarding:v1', 'done')
          } catch {
            // storage unavailable — onboarding will show again next load
          }
        }}
      />
    )
  }

  if (!sync.restoreFinished || sync.restoring) {
    return (
      <LoadingScreen
        progress={sync.restoring ? 60 : 45}
        label="Restoring your connections…"
      />
    )
  }

  if (sync.connecting) {
    return (
      <LoadingScreen progress={82} label="Connecting to your database…" />
    )
  }

  if (sync.connected && !workspaceBooted) {
    return (
      <LoadingScreen
        progress={100}
        done
        label="Opening your workspace…"
        onDone={() => setWorkspaceBooted(true)}
      />
    )
  }

  if (!sync.connected) {
    return (
      <DatabaseGate
        onConnect={(url, apiKey) => sync.connect(url, apiKey, 'supabase')}
        connecting={sync.connecting}
        error={sync.error}
        supabaseSetupSql={SUPABASE_SETUP_SQL}
        email={session.email}
      />
    )
  }

  const renderContent = () => {
    if (activeNav === 'projects') {
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
            <h2 className="text-sm font-medium text-fg-primary">Projects</h2>
            <Button size="sm" onClick={() => setNewProjectOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              New project
            </Button>
          </div>
          {projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="Create one to organize your entries."
              action={
                <Button size="sm" onClick={() => setNewProjectOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  New project
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-surface p-4 transition-colors duration-150 hover:border-border-strong hover:bg-bg-hover"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-fg-primary">
                      {p.name}
                    </p>
                    <span className="shrink-0 rounded-full border border-border-subtle px-2 py-0.5 text-[10px] font-medium capitalize text-fg-secondary">
                      {p.status}
                    </span>
                  </div>
                  {p.description && (
                    <p className="line-clamp-2 text-xs text-fg-muted">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-auto text-[11px] text-fg-muted">
                    Created{' '}
                    {new Date(p.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (
      activeNav === 'weekly' ||
      activeNav === 'monthly' ||
      activeNav === 'appraisal'
    ) {
      const reportType = activeNav as ReportType
      const typeLabel =
        reportType === 'weekly'
          ? 'Weekly report'
          : reportType === 'monthly'
            ? 'Monthly report'
            : 'Appraisal report'
      const typeReports = reports.filter((r) => r.reportType === reportType)
      const handleExport = async (format: 'markdown' | 'text' | 'json' | 'pdf' | 'docx') => {
        if (!selectedReport) return
        const result = await exportReport(
          {
            title: selectedReport.title,
            reportType: selectedReport.reportType as ReportType,
            dateFrom: selectedReport.dateFrom,
            dateTo: selectedReport.dateTo,
            style: selectedReport.style as ReportStyle,
            summary: selectedReport.summary,
            sections: selectedReport.sections,
          },
          { format },
        )
        downloadFile(result.content, result.filename, result.mimeType)
        setExportOpen(false)
      }

      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
            <h2 className="text-sm font-medium text-fg-primary">{typeLabel}</h2>
            <div className="flex items-center gap-2">
              {reportError && (
                <p className="text-xs text-danger" role="alert">
                  {reportError}
                </p>
              )}
              {selectedReport && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExportOpen(true)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Export
                </Button>
              )}
              <Button
                size="sm"
                disabled={generatingReport}
                onClick={() => void handleGenerateReport(reportType)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generatingReport ? 'Generating…' : 'Generate'}
              </Button>
            </div>
          </div>
          {selectedReport ? (
            <ReportEditor report={selectedReport} className="flex-1" />
          ) : typeReports.length === 0 ? (
            <EmptyState
              title={`No ${activeNav} report yet`}
              description="Generate a report from your work entries to get started."
            />
          ) : (
            <div className="divide-y divide-border-subtle">
              {typeReports.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-bg-hover cursor-pointer"
                  onClick={() => {
                    setSelectedReport({
                      id: r.id,
                      title: r.title,
                      reportType: r.reportType,
                      dateFrom: r.dateFrom,
                      dateTo: r.dateTo,
                      style: r.style,
                      status: r.status,
                      contentMarkdown: r.contentMarkdown,
                      sections: [],
                      summary: '',
                    })
                  }}
                >
                  <div>
                    <p className="text-sm text-fg-primary">{r.title}</p>
                    <p className="text-xs text-fg-muted capitalize">
                      {r.reportType} · {r.style}
                    </p>
                  </div>
                  <span className="text-xs text-fg-muted capitalize">
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          <ExportDialog
            open={exportOpen}
            onOpenChange={setExportOpen}
            onExport={handleExport}
            onCopy={async () => {
              if (!selectedReport) return false
              return copyToClipboard(
                reportToMarkdown({
                  title: selectedReport.title,
                  reportType: selectedReport.reportType as ReportType,
                  dateFrom: selectedReport.dateFrom,
                  dateTo: selectedReport.dateTo,
                  style: selectedReport.style as ReportStyle,
                  summary: selectedReport.summary,
                  sections: selectedReport.sections,
                }),
              )
            }}
          />
        </div>
      )
    }

    if (activeNav === 'today') {
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
            <h2 className="text-sm font-medium text-fg-primary">Today</h2>
            <span className="text-xs text-fg-muted">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          {todayEntries.length === 0 ? (
            <EmptyState
              title="Nothing captured today"
              description="Use quick capture below to log your work as it happens."
            />
          ) : (
            <Timeline
              entries={todayEntries}
              loading={timelineLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRetryAI={ai.requestEnrichment}
              onNewEntry={() => {
                const input = document.querySelector(
                  'textarea[aria-label="Quick capture"]',
                ) as HTMLTextAreaElement
                input?.focus()
              }}
              className="flex-1"
            />
          )}
        </div>
      )
    }

    if (activeNav === 'achievements') {
      const cards = [
        { label: 'Total entries', value: stats.total },
        { label: 'This week', value: stats.thisWeek },
        { label: 'Day streak', value: stats.streak },
        { label: 'AI enriched', value: stats.enriched },
        { label: 'Projects', value: stats.projects },
      ]
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
            <h2 className="flex items-center gap-2 text-sm font-medium text-fg-primary">
              <Trophy className="h-4 w-4 text-accent" />
              Achievements
            </h2>
          </div>
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 p-4 lg:grid-cols-3">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-md border border-border-subtle bg-bg-surface p-4"
              >
                <p className="text-2xl font-semibold text-fg-primary">
                  {c.value}
                </p>
                <p className="text-xs text-fg-muted">{c.label}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (activeNav === 'ask') {
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
            <h2 className="text-sm font-medium text-fg-primary">
              Ask your work log
            </h2>
          </div>
          {!ai.connected ? (
            <EmptyState
              title="AI not connected"
              description="Connect an AI provider to ask questions about your work."
              action={
                <Button size="sm" onClick={() => setAISettingsOpen(true)}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Connect AI
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                  {askThread.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-16 text-center">
                      <Sparkles className="h-8 w-8 text-accent" />
                      <p className="text-sm font-medium text-fg-primary">
                        Ask anything about your work
                      </p>
                      <p className="max-w-sm text-xs text-fg-muted">
                        Try "What did I work on this week?" or "Summarize my
                        biggest wins".
                      </p>
                    </div>
                  ) : (
                    askThread.map((m, i) => (
                      <div key={m.id} className="flex flex-col gap-2">
                        <div className="flex justify-end">
                          <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-accent-muted px-3.5 py-2.5 text-sm text-fg-primary">
                            {m.question}
                          </div>
                        </div>
                        <div className="flex justify-start">
                          <div className="max-w-[92%] rounded-xl rounded-tl-sm border border-border-subtle bg-bg-surface px-3.5 py-2.5 text-sm text-fg-primary">
                            {m.error ? (
                              <p className="text-danger" role="alert">
                                {m.error}
                              </p>
                            ) : m.answer ? (
                              i === askThread.length - 1 ? (
                                <TypewriterText
                                  text={m.answer}
                                  className="block whitespace-pre-wrap"
                                />
                              ) : (
                                <p className="whitespace-pre-wrap">{m.answer}</p>
                              )
                            ) : (
                              <div
                                className="space-y-2 py-1"
                                aria-label="Generating answer"
                              >
                                <Skeleton className="h-3.5 w-52" />
                                <Skeleton className="h-3.5 w-40" />
                                <Skeleton className="h-3.5 w-44" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={askBottomRef} className="h-1 shrink-0" />
                </div>
              </div>
              <form
                className="border-t border-border-subtle bg-bg-surface p-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleAsk()
                }}
              >
                <div className="mx-auto flex w-full max-w-2xl items-center gap-2">
                  <Input
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    placeholder="Ask anything about your work…"
                    disabled={asking}
                    aria-label="Ask a question"
                  />
                  <Button
                    size="md"
                    type="submit"
                    disabled={asking || askQuestion.trim().length === 0}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {asking ? 'Thinking…' : 'Ask'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      )
    }

    if (activeNav === 'settings') {
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
            <h2 className="text-sm font-medium text-fg-primary">Settings</h2>
          </div>
          <div className="max-w-xl space-y-8 overflow-y-auto p-4">
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                Appearance
              </h3>
              <ThemePicker value={currentTheme} onChange={setCurrentTheme} />
            </section>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                Data
              </h3>
              <p className="text-xs text-fg-muted">
                Sync your entries across devices with a shared database.
              </p>
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Database className="h-3.5 w-3.5" />
                  Database connection
                </Button>
              </div>
            </section>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                AI
              </h3>
              <p className="text-xs text-fg-muted">
                Bring your own key — entries are enriched locally.
              </p>
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setAISettingsOpen(true)}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI provider
                </Button>
              </div>
            </section>
            {session && (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold tracking-wide text-fg-muted uppercase">
                  Account
                </h3>
                <p className="text-xs text-fg-muted">{session.email}</p>
                <div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void signOut()}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </Button>
                </div>
              </section>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
          <SearchBar onSearch={setSearchQuery} className="max-w-xs" />
          <SearchFilters
            value={filters}
            onChange={setFilters}
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
        <Timeline
          entries={filteredEntries}
          loading={timelineLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRetryAI={ai.requestEnrichment}
          onNewEntry={() => {
            const input = document.querySelector(
              'textarea[aria-label="Quick capture"]',
            ) as HTMLTextAreaElement
            input?.focus()
          }}
          className="flex-1"
        />
      </div>
    )
  }

  return (
    <>
      <AppShell
        sidebar={{
          activeItem: activeNav,
          onItemClick: setActiveNav,
        }}
        workspaceTabs={{
          tabs,
          activeTab,
          onTabChange: setActiveTab,
        }}
        quickCapture={{
          onSave: handleSave,
          syncState: saveError
            ? { status: 'failed', message: saveError }
            : sync.syncState,
          children: (
            <VoiceCaptureButton
              transcribe={ai.connected ? ai.transcribe : null}
              onTranscript={handleVoiceTranscript}
            />
          ),
        }}
        commandPalette={{
          registry,
          open: commandPaletteOpen,
          onOpenChange: setCommandPaletteOpen,
        }}
        onSettingsClick={() => setSettingsOpen(true)}
        onAISettingsClick={() => setAISettingsOpen(true)}
      >
        {renderContent()}
      </AppShell>

      <ConnectionSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        savedUrl={sync.savedUrl}
        savedType={sync.savedType}
        connected={sync.connected}
        connecting={sync.connecting}
        error={sync.error}
        pendingCount={sync.pendingCount}
        onConnect={sync.connect}
        onDisconnect={sync.disconnect}
        allowedTypes={['supabase']}
        supabaseSetupSql={SUPABASE_SETUP_SQL}
        backfilling={sync.backfilling}
        backfillResult={sync.backfillResult}
        backfillError={sync.backfillError}
        onBackfill={() => void sync.backfill()}
      />

      <AIConnectionSettingsDialog
        open={aiSettingsOpen}
        onOpenChange={setAISettingsOpen}
        savedConfig={ai.savedConfig}
        connected={ai.connected}
        testing={ai.testing}
        health={ai.health}
        enrichingCount={ai.enrichingCount}
        models={ai.models}
        loadingModels={ai.loadingModels}
        modelsError={ai.modelsError}
        onLoadModels={(config, apiKey) => void ai.loadModels(config, apiKey)}
        onTest={ai.testConnection}
        onConnect={ai.connect}
        onDisconnect={ai.disconnect}
      />

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onCreate={async (name) => {
          await useCases.createProject({ name })
          await loadProjects()
        }}
      />

      {editingEntry && (
        <EntryEditor
          entry={editingEntry}
          projects={editorProjects}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onSave={handleEditorSave}
        />
      )}
    </>
  )
}

function mapEntryToCard(entry: WorkEntryDTO): EntryCardData {
  return {
    id: entry.id,
    content: entry.content,
    entryType: entry.entryType,
    importance: entry.importance,
    occurredAt: entry.occurredAt,
    aiStatus: entry.aiStatus,
    aiSummary: entry.aiSummary,
    projectName: null,
    version: entry.version,
    suggestedTags: Array.isArray(entry.aiMetadata?.['suggested_tags'])
      ? (entry.aiMetadata['suggested_tags'] as unknown[]).map(String)
      : undefined,
  }
}
