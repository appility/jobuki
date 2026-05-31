import { SignUp } from '@clerk/react-router'
import { clerkAuthAppearance } from '../lib/clerk-auth-appearance'

export default function SignUpPage() {
  return (
    <div className="auth-shell">
      <div className="auth-shell-inner">
        <aside className="auth-side-panel" aria-hidden>
          <p className="auth-kicker">Create your workspace</p>
          <h1 className="auth-side-title">Start building your hiring hub</h1>
          <p className="auth-side-copy">
            Create your account and launch branded job boards under your own domain.
          </p>
        </aside>
        <section className="auth-form-panel">
          <div className="auth-clerk-slot">
            <SignUp
              afterSignUpUrl="/dashboard"
              signInUrl="/sign-in"
              appearance={clerkAuthAppearance}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
