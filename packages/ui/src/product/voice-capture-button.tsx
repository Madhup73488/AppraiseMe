import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '../utils/cn'
import { Mic, MicOff, Loader2, AudioLines } from 'lucide-react'

export interface VoiceCaptureButtonProps {
  /** Called with the transcript; a returned promise is awaited with a "polishing" indicator */
  onTranscript: (text: string) => void | Promise<void>
  /** Server transcription fallback — used only when the browser has no built-in speech recognition */
  transcribe?: ((audio: Blob) => Promise<string>) | null
  className?: string
}

type Phase =
  | 'idle'
  | 'listening'
  | 'recording'
  | 'transcribing'
  | 'polishing'
  | 'error'

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  const ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | SpeechRecognitionCtor
    | undefined
  return ctor ?? null
}

export function VoiceCaptureButton({
  onTranscript,
  transcribe,
  className,
}: VoiceCaptureButtonProps) {
  const [speechCtor, setSpeechCtor] = useState<SpeechRecognitionCtor | null>(
    null,
  )
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [liveText, setLiveText] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const shouldListenRef = useRef(false)
  const finalTextRef = useRef('')
  const interimTextRef = useRef('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdRef = useRef(false)

  useEffect(() => {
    // wrap in a function — otherwise React treats the value as an updater
    // and *calls* the SpeechRecognition constructor without `new`
    setSpeechCtor(() => getSpeechRecognitionCtor())
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const emitTranscript = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) {
        setError('Nothing heard — try again')
        setPhase('error')
        return
      }
      setPhase('polishing')
      try {
        await onTranscript(trimmed)
        setPhase('idle')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Saving voice note failed')
        setPhase('error')
      }
    },
    [onTranscript],
  )

  const detachRecognition = useCallback(
    (recognition: SpeechRecognitionLike) => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try {
        recognition.abort()
      } catch {
        // already stopped
      }
    },
    [],
  )

  const abortListening = useCallback(
    (message: string | null) => {
      shouldListenRef.current = false
      clearTimer()
      const recognition = recognitionRef.current
      recognitionRef.current = null
      if (recognition) detachRecognition(recognition)
      setLiveText('')
      if (message) {
        setError(message)
        setPhase('error')
      } else {
        setPhase('idle')
      }
    },
    [clearTimer, detachRecognition],
  )

  const finishListening = useCallback(() => {
    clearTimer()
    const recognition = recognitionRef.current
    recognitionRef.current = null
    if (recognition) detachRecognition(recognition)
    const text = `${finalTextRef.current} ${interimTextRef.current}`.trim()
    setLiveText('')
    void emitTranscript(text)
  }, [clearTimer, detachRecognition, emitTranscript])

  const stopListening = useCallback(() => {
    shouldListenRef.current = false
    const recognition = recognitionRef.current
    if (!recognition) return
    try {
      recognition.stop()
    } catch {
      finishListening()
    }
  }, [finishListening])

  const startListening = useCallback(() => {
    if (!speechCtor || recognitionRef.current) return
    setError(null)
    setSeconds(0)
    setLiveText('')
    finalTextRef.current = ''
    interimTextRef.current = ''
    try {
      const recognition = new speechCtor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = navigator.language || 'en-US'
      recognition.onresult = (event) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (!result) continue
          const transcript = result[0]?.transcript ?? ''
          if (result.isFinal) {
            finalTextRef.current =
              `${finalTextRef.current} ${transcript}`.trim()
          } else {
            interim += transcript
          }
        }
        interimTextRef.current = interim
        setLiveText(`${finalTextRef.current} ${interim}`.trim())
      }
      recognition.onerror = (event) => {
        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed'
        ) {
          abortListening('Microphone permission denied')
        } else if (event.error === 'network') {
          abortListening('Speech service unreachable')
        }
        // no-speech / aborted are recoverable — listening restarts via onend
      }
      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return
        if (shouldListenRef.current) {
          try {
            recognition.start()
          } catch {
            // start already pending
          }
        } else {
          finishListening()
        }
      }
      recognitionRef.current = recognition
      shouldListenRef.current = true
      recognition.start()
      setPhase('listening')
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
      recognitionRef.current = null
      shouldListenRef.current = false
      clearTimer()
      setError(e instanceof Error ? e.message : 'Voice capture failed to start')
      setPhase('error')
    }
  }, [speechCtor, abortListening, finishListening, clearTimer])

  const stopRecording = useCallback(() => {
    clearTimer()
    holdRef.current = false
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
  }, [clearTimer])

  const startRecording = useCallback(async () => {
    if (!transcribe || holdRef.current) return
    holdRef.current = true
    setError(null)
    setSeconds(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      )
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        })
        if (blob.size === 0) {
          setPhase('idle')
          return
        }
        setPhase('transcribing')
        try {
          const text = await transcribe(blob)
          await emitTranscript(text)
        } catch (e) {
          setError(
            e instanceof Error ? e.message : 'Transcription failed',
          )
          setPhase('error')
        }
      }
      recorderRef.current = recorder
      recorder.start()
      setPhase('recording')
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
      holdRef.current = false
      setError(
        e instanceof Error
          ? `Microphone unavailable: ${e.message}`
          : 'Microphone unavailable',
      )
      setPhase('error')
    }
  }, [transcribe, emitTranscript])

  // safety: stop fallback recording if user releases outside the button
  useEffect(() => {
    const onUp = () => {
      if (!speechCtor && holdRef.current) stopRecording()
    }
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [speechCtor, stopRecording])

  // hard cap at 2 minutes
  useEffect(() => {
    if (seconds < 120) return
    if (phase === 'listening') stopListening()
    else if (phase === 'recording') stopRecording()
  }, [phase, seconds, stopListening, stopRecording])

  // stop everything on unmount
  useEffect(() => {
    return () => {
      clearTimer()
      const recognition = recognitionRef.current
      if (recognition) detachRecognition(recognition)
      recognitionRef.current = null
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') recorder.stop()
    }
  }, [clearTimer, detachRecognition])

  if (!speechCtor && !transcribe) {
    return (
      <div
        title="Voice capture is not supported in this browser"
        className={cn(
          'flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-full border border-border-default bg-bg-surface text-fg-muted',
          className,
        )}
      >
        <MicOff className="h-5 w-5" />
      </div>
    )
  }

  const busy = phase === 'transcribing' || phase === 'polishing'
  const active = phase === 'listening' || phase === 'recording'
  const toggle = () => {
    if (recognitionRef.current) stopListening()
    else if (phase === 'idle' || phase === 'error') startListening()
  }

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <button
        type="button"
        aria-label={
          active
            ? 'Stop and save voice note'
            : 'Record a voice note'
        }
        onClick={speechCtor ? toggle : undefined}
        onPointerDown={
          speechCtor ? undefined : () => void startRecording()
        }
        onPointerUp={speechCtor ? undefined : stopRecording}
        onPointerLeave={
          speechCtor
            ? undefined
            : () => {
                if (holdRef.current) stopRecording()
              }
        }
        disabled={busy}
        className={cn(
          'flex h-11 w-11 select-none items-center justify-center rounded-full border shadow-sm transition-all',
          active
            ? 'scale-110 animate-pulse border-danger bg-danger text-white'
            : busy
              ? 'border-accent bg-accent-muted text-accent'
              : 'border-border-default bg-bg-surface text-fg-secondary hover:bg-bg-hover active:scale-95',
        )}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : active ? (
          <AudioLines className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>
      {active && (
        <span className="text-[10px] font-medium tabular-nums text-danger">
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')} ·
          {phase === 'listening' ? ' tap mic to stop' : ' release to save'}
        </span>
      )}
      {phase === 'listening' && liveText && (
        <span className="line-clamp-3 max-w-[220px] text-center text-[10px] italic text-fg-muted">
          “{liveText}”
        </span>
      )}
      {phase === 'transcribing' && (
        <span className="text-[10px] text-fg-muted">transcribing…</span>
      )}
      {phase === 'polishing' && (
        <span className="text-[10px] text-fg-muted">AI polishing…</span>
      )}
      {phase === 'error' && error && (
        <span className="max-w-[180px] text-center text-[10px] text-danger">
          {error}
        </span>
      )}
    </div>
  )
}
