import { useState } from 'react'
import { cn } from '../utils/cn'
import { Button } from '../primitives/button'
import { ThemePicker } from './theme-picker'
import { Logo } from './logo'

const APP_NAME = 'AppraiseMe'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  skippable?: boolean
}

const DEFAULT_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: `Welcome to ${APP_NAME}`,
  },
  {
    id: 'theme',
    title: 'Choose a theme',
    description: 'Pick a visual theme for your workspace',
  },
  {
    id: 'database',
    title: 'Database',
    description: 'Connect your worklog database (BYODB)',
    skippable: true,
  },
  {
    id: 'ai',
    title: 'AI Provider',
    description: 'Connect your AI provider (BYOK)',
    skippable: true,
  },
  {
    id: 'done',
    title: 'Ready',
    description: "You're all set!",
  },
]

export interface OnboardingData {
  theme: string
  databaseSkipped: boolean
  aiSkipped: boolean
}

export interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void
  onSkip?: () => void
  className?: string
}

export function OnboardingFlow({ onComplete, className }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [theme, setTheme] = useState('appraiseme')
  const [databaseSkipped, setDatabaseSkipped] = useState(false)
  const [aiSkipped, setAiSkipped] = useState(false)

  const step = DEFAULT_STEPS[currentStep]!
  const isFirst = currentStep === 0
  const isLast = currentStep === DEFAULT_STEPS.length - 1

  const handleNext = () => {
    if (step.id === 'database') setDatabaseSkipped(false)
    if (step.id === 'ai') setAiSkipped(false)
    if (isLast) {
      onComplete({ theme, databaseSkipped, aiSkipped })
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleSkip = () => {
    if (step.id === 'database') setDatabaseSkipped(true)
    if (step.id === 'ai') setAiSkipped(true)
    if (isLast) {
      onComplete({ theme, databaseSkipped, aiSkipped })
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (!isFirst) setCurrentStep(currentStep - 1)
  }

  return (
    <div
      className={cn(
        'flex h-screen w-full flex-col bg-bg-canvas text-fg-primary',
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-border-subtle px-4 py-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-fg-primary">
          <Logo size={16} />
          {APP_NAME}
        </span>
        <StepIndicator steps={DEFAULT_STEPS} currentStep={currentStep} />
      </header>

      <main className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-fg-primary">
              {step.title}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">{step.description}</p>
          </div>

          <StepContent
            stepId={step.id}
            theme={theme}
            onThemeChange={setTheme}
            databaseSkipped={databaseSkipped}
            aiSkipped={aiSkipped}
          />

          <div className="flex items-center justify-between pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isFirst}
            >
              Back
            </Button>
            <div className="flex gap-2">
              {step.skippable && (
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  Skip
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {isLast
                  ? 'Get started'
                  : currentStep === 0
                    ? 'Next'
                    : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: OnboardingStep[]
  currentStep: number
}) {
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1.5">
          {i > 0 && <div className="h-px w-4 bg-border-subtle" />}
          <div
            className={cn(
              'h-1.5 w-1.5 rounded-full transition-colors',
              i < currentStep
                ? 'bg-success'
                : i === currentStep
                  ? 'bg-accent'
                  : 'bg-border-subtle',
            )}
            title={step.title}
          />
        </div>
      ))}
    </div>
  )
}

function StepContent({
  stepId,
  theme,
  onThemeChange,
  databaseSkipped,
  aiSkipped,
}: {
  stepId: string
  theme: string
  onThemeChange: (t: string) => void
  databaseSkipped: boolean
  aiSkipped: boolean
}) {
  if (stepId === 'welcome') {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-bg-elevated">
          <svg
            className="h-8 w-8 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-sm text-fg-secondary">
          Your private, AI-assisted work memory. We help you remember what you
          accomplished and generate reports for performance reviews.
        </p>
        <div className="space-y-2 text-left text-sm text-fg-muted">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
            <span>Your data stays on your device by default</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>
              Bring your own database and AI provider — no vendor lock-in
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-info" />
            <span>
              Generate weekly, monthly, and appraisal reports from your work
              entries
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (stepId === 'theme') {
    return <ThemePicker value={theme} onChange={onThemeChange} />
  }

  if (stepId === 'database') {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-border-subtle bg-bg-surface p-4 space-y-3">
          <p className="text-sm font-medium text-fg-primary">
            Connect your database (BYODB)
          </p>
          <p className="text-xs text-fg-muted">
            AppraiseMe stores data in your own database. You can use:
          </p>
          <ul className="space-y-1.5 text-xs text-fg-muted">
            {[
              'SQLite (local)',
              'PostgreSQL (Neon, Supabase, self-hosted)',
              'Turso',
            ].map((opt) => (
              <li key={opt} className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-fg-muted" />
                {opt}
              </li>
            ))}
          </ul>
          <p className="text-xs text-fg-muted pt-1 border-t border-border-subtle">
            You can configure this later in Settings
          </p>
        </div>
        {databaseSkipped && (
          <p className="text-xs text-center text-fg-muted">
            Skipped — you can set this up later in Settings
          </p>
        )}
      </div>
    )
  }

  if (stepId === 'ai') {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-border-subtle bg-bg-surface p-4 space-y-3">
          <p className="text-sm font-medium text-fg-primary">
            Connect your AI provider (BYOK)
          </p>
          <p className="text-xs text-fg-muted">
            Enable AI-powered summaries, enrichment, and report generation:
          </p>
          <ul className="space-y-1.5 text-xs text-fg-muted">
            {[
              'OpenAI',
              'Anthropic',
              'Google Gemini',
              'OpenRouter',
              'OpenAI-compatible API',
            ].map((opt) => (
              <li key={opt} className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-fg-muted" />
                {opt}
              </li>
            ))}
          </ul>
          <p className="text-xs text-fg-muted pt-1 border-t border-border-subtle">
            You can configure this later in Settings
          </p>
        </div>
        {aiSkipped && (
          <p className="text-xs text-center text-fg-muted">
            Skipped — you can set this up later in Settings
          </p>
        )}
      </div>
    )
  }

  if (stepId === 'done') {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-bg-elevated">
          <svg
            className="h-8 w-8 text-success"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-fg-primary">Setup complete!</p>
          <p className="text-xs text-fg-muted">
            Start by capturing your first work entry with the Quick Capture
            below.
          </p>
        </div>
        <div className="rounded-md border border-border-subtle bg-bg-surface p-3 text-left">
          <p className="text-xs text-fg-muted space-y-1">
            <span className="block">
              • Press{' '}
              <kbd className="rounded border border-border-default bg-bg-elevated px-1 text-[10px]">
                ⌘+K
              </kbd>{' '}
              for the command palette
            </span>
            <span className="block">
              • Use Quick Capture at the bottom to log work entries
            </span>
            <span className="block">
              • Go to Settings to configure database and AI
            </span>
          </p>
        </div>
      </div>
    )
  }

  return null
}
