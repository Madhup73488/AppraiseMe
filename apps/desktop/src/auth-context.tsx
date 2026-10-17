

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import {
  createControlPlaneClient,
  type CreateControlPlaneClientOptions,
} from '@appraiseme/control-plane'
import type { ControlPlaneClient, AuthSession } from '@appraiseme/contracts'

interface AuthContextValue {
  session: AuthSession | null
  loading: boolean
  controlPlane: ControlPlaneClient | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ needsConfirmation: boolean }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)
  const clientRef = useRef<ControlPlaneClient | null>(null)

  const getControlPlane = useCallback((): ControlPlaneClient | null => {
    if (clientRef.current) return clientRef.current

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) return null

    const options: CreateControlPlaneClientOptions = {
      supabaseUrl,
      supabaseAnonKey,
    }
    clientRef.current = createControlPlaneClient(options)
    return clientRef.current
  }, [])

  useEffect(() => {
    const cp = getControlPlane()
    if (!cp) {
      setLoading(false)
      return
    }

    cp.auth
      .getSession()
      .then(setSession)
      .finally(() => setLoading(false))

    const unsubscribe = cp.auth.onAuthStateChange((newSession) => {
      setSession(newSession)
      setLoading(false)
    })

    return unsubscribe
  }, [getControlPlane])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const cp = getControlPlane()
      if (!cp) throw new Error('Supabase not configured')
      await cp.auth.signIn({ email, password })
    },
    [getControlPlane],
  )

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const cp = getControlPlane()
      if (!cp) throw new Error('Supabase not configured')
      const result = await cp.auth.signUp({
        email,
        password,
        displayName,
      })
      return { needsConfirmation: result.needsConfirmation }
    },
    [getControlPlane],
  )

  const signOut = useCallback(async () => {
    const cp = getControlPlane()
    if (!cp) return
    await cp.auth.signOut()
    setSession(null)
  }, [getControlPlane])

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        controlPlane: clientRef.current,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
