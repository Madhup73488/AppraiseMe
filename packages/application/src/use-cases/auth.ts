import type { ControlPlaneClient, AuthSession } from '@appraiseme/contracts'
import { AuthenticationError } from '@appraiseme/domain'

export interface SignUpUseCaseDeps {
  controlPlane: ControlPlaneClient
}

export interface SignUpInput {
  email: string
  password: string
  displayName?: string
}

export interface SignUpResult {
  session: AuthSession | null
  needsConfirmation: boolean
}

export function createSignUpUseCase(deps: SignUpUseCaseDeps) {
  return async function signUp(input: SignUpInput): Promise<SignUpResult> {
    if (!input.email.includes('@')) {
      throw new AuthenticationError('Invalid email address')
    }
    if (input.password.length < 8) {
      throw new AuthenticationError('Password must be at least 8 characters')
    }

    const result = await deps.controlPlane.auth.signUp({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    })

    return result
  }
}

export interface SignInUseCaseDeps {
  controlPlane: ControlPlaneClient
}

export interface SignInInput {
  email: string
  password: string
}

export function createSignInUseCase(deps: SignInUseCaseDeps) {
  return async function signIn(input: SignInInput): Promise<AuthSession> {
    if (!input.email.includes('@')) {
      throw new AuthenticationError('Invalid email address')
    }

    return deps.controlPlane.auth.signIn({
      email: input.email,
      password: input.password,
    })
  }
}

export interface SignOutUseCaseDeps {
  controlPlane: ControlPlaneClient
}

export function createSignOutUseCase(deps: SignOutUseCaseDeps) {
  return async function signOut(): Promise<void> {
    await deps.controlPlane.auth.signOut()
  }
}

export interface GetSessionUseCaseDeps {
  controlPlane: ControlPlaneClient
}

export function createGetSessionUseCase(deps: GetSessionUseCaseDeps) {
  return async function getSession(): Promise<AuthSession | null> {
    return deps.controlPlane.auth.getSession()
  }
}
