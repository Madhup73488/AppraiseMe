export type ThemeId =
  'appraiseme' | 'midnight' | 'paper' | 'minimal' | 'terminal'

export type Density = 'comfortable' | 'compact'

export type ReportStyle =
  'balanced' | 'concise' | 'detailed' | 'leadership' | 'impact'

export interface UserPreferences {
  userId: string
  themeId: ThemeId
  density: Density
  weekStartsOn: number
  defaultReportStyle: ReportStyle
  advancedAiSettings: boolean
  telemetryEnabled: boolean
  updatedAt: string
}

export interface UpdatePreferencesInput {
  themeId?: ThemeId
  density?: Density
  weekStartsOn?: number
  defaultReportStyle?: ReportStyle
  advancedAiSettings?: boolean
  telemetryEnabled?: boolean
}
