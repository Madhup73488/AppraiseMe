import type { WorklogStore } from '@appraiseme/contracts'

export interface BackfillDeps {
  localStore: WorklogStore
}

export interface BackfillResult {
  entries: number
  projects: number
  tags: number
  reports: number
  achievements: number
}

/**
 * One-way push of all local data into a connected remote store
 * ("Move to cloud"). Idempotent-ish: entries upsert by id; projects and
 * reports are matched by name/title to avoid duplicates on re-run.
 */
export function createBackfillToRemoteUseCase(deps: BackfillDeps) {
  return async (remote: WorklogStore): Promise<BackfillResult> => {
    const local = deps.localStore

    const localProjects = await local.projects.list()
    const remoteProjects = await remote.projects.list()
    const remoteByName = new Map(remoteProjects.map((p) => [p.name, p.id]))
    const projectIdMap = new Map<string, string>()
    let projects = 0
    for (const p of localProjects) {
      const existing = remoteByName.get(p.name)
      if (existing) {
        projectIdMap.set(p.id, existing)
      } else {
        const created = await remote.projects.create({
          name: p.name,
          description: p.description ?? undefined,
        })
        projectIdMap.set(p.id, created.id)
        projects++
      }
    }

    const localTags = await local.tags.list()
    const remoteTags = new Set((await remote.tags.list()).map((t) => t.name))
    let tags = 0
    for (const t of localTags) {
      if (!remoteTags.has(t.name)) {
        await remote.tags.create(t.name)
        tags++
      }
    }

    const localEntries = await local.entries.list({ limit: 100_000 })
    let entries = 0
    for (const e of localEntries) {
      const { ownerId: _owner, deletedAt: _del, ...rest } = e
      void _owner
      void _del
      await remote.entries.upsert({
        ...rest,
        projectId: e.projectId
          ? (projectIdMap.get(e.projectId) ?? null)
          : null,
      })
      entries++
    }

    const remoteReports = await remote.reports.list()
    const remoteReportKeys = new Set(
      remoteReports.map((r) => `${r.title}|${r.dateFrom}`),
    )
    let reports = 0
    for (const r of await local.reports.list()) {
      if (remoteReportKeys.has(`${r.title}|${r.dateFrom}`)) continue
      await remote.reports.create({
        title: r.title,
        reportType: r.reportType,
        dateFrom: r.dateFrom,
        dateTo: r.dateTo,
        style: r.style,
      })
      reports++
    }

    const localAchievements = await local.achievements.list()
    const remoteAchievements = new Set(
      (await remote.achievements.list()).map((a) => a.title),
    )
    let achievements = 0
    for (const a of localAchievements) {
      if (remoteAchievements.has(a.title)) continue
      await remote.achievements.create({
        title: a.title,
        description: a.description ?? undefined,
        impact: a.impact ?? undefined,
      })
      achievements++
    }

    return { entries, projects, tags, reports, achievements }
  }
}
