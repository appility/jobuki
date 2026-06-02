import { SignUp } from '@clerk/react-router'
import { useSearchParams } from 'react-router'
import { clerkAuthAppearance } from '../lib/clerk-auth-appearance'

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const isJobSeeker = searchParams.get('role') === 'job-seeker'
  const afterSignUpUrl = isJobSeeker ? '/candidate/start' : '/dashboard'

  return (
    <div className="auth-shell">
      <div className="auth-shell-inner">
        <aside className="auth-side-panel" aria-hidden>
          {isJobSeeker ? (
            <>
              <p className="auth-kicker">Job seeker account</p>
              <h1 className="auth-side-title">Track your applications in one place</h1>
              <p className="auth-side-copy">
                Create an account to manage your profile and follow the status of your applications.
              </p>
            </>
          ) : (
            <>
              <p className="auth-kicker">Create your workspace</p>
              <h1 className="auth-side-title">Start building your hiring hub</h1>
              <p className="auth-side-copy">
                Create your account and launch branded job boards under your own domain.
              </p>
            </>
          )}
        </aside>
        <section className="auth-form-panel">
          <div className="auth-clerk-slot">
            <SignUp
              afterSignUpUrl={afterSignUpUrl}
              signInUrl="/sign-in"
              appearance={clerkAuthAppearance}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
