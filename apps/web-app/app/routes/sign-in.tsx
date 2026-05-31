import { SignIn } from '@clerk/react-router'
import { useSearchParams } from 'react-router'
import { clerkAuthAppearance } from '../lib/clerk-auth-appearance'

function toSafeLocalPath(input: string | null): string | null {
  if (!input) return null
  if (!input.startsWith('/')) return null
  if (input.startsWith('//')) return null
  return input
}

export default function SignInPage() {
  const [searchParams] = useSearchParams()
  const requestedPath =
    toSafeLocalPath(searchParams.get('redirectTo'))
    ?? toSafeLocalPath(searchParams.get('redirectPath'))
  const redirectTarget = requestedPath ?? '/dashboard'

  return (
    <div className="auth-shell">
      <div className="auth-shell-inner">
        <aside className="auth-side-panel" aria-hidden>
          <p className="auth-kicker">Admin access</p>
          <h1 className="auth-side-title">Welcome back to Jobuki</h1>
          <p className="auth-side-copy">
            Sign in to manage boards, post jobs, and track applications in one place.
          </p>
        </aside>
        <section className="auth-form-panel">
          <div className="auth-clerk-slot">
            <SignIn
              afterSignInUrl={redirectTarget}
              fallbackRedirectUrl={redirectTarget}
              forceRedirectUrl={redirectTarget}
              signUpUrl="/sign-up"
              appearance={clerkAuthAppearance}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
