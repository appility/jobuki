import { SignUp } from '@clerk/react-router'
import { useSearchParams } from 'react-router'
import { Link } from 'react-router'
import { clerkAuthAppearance } from '../lib/clerk-auth-appearance'

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type')
  const userType = type === 'job-seeker' || type === 'job-poster' ? type : 'board-creator'
  const afterSignUpUrl = userType === 'job-seeker'
    ? '/candidate/start'
    : userType === 'job-poster'
      ? '/posters/start'
      : '/dashboard'
  const accountTypeMetadata = userType === 'job-seeker'
    ? 'job_seeker'
    : userType === 'job-poster'
      ? 'job_poster'
      : 'board_creator'
  const signInUrl = `/sign-in?type=${userType}`

  return (
    <div className="auth-shell">
      <div className="auth-shell-inner">
        <aside className="auth-side-panel" aria-hidden>
          {userType === 'job-seeker' ? (
            <>
              <p className="auth-kicker">Job seeker account</p>
              <h1 className="auth-side-title">Track your applications in one place</h1>
              <p className="auth-side-copy">
                Create an account to manage your profile and follow the status of your applications.
              </p>
            </>
          ) : userType === 'job-poster' ? (
            <>
              <p className="auth-kicker">Job poster account</p>
              <h1 className="auth-side-title">Post paid listings with control</h1>
              <p className="auth-side-copy">
                Create an account to submit and manage job listings as an advertiser.
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

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/sign-up?type=board-creator" className="btn-outline text-xs px-3 py-1.5">Board creator</Link>
            <Link to="/sign-up?type=job-poster" className="btn-outline text-xs px-3 py-1.5">Job poster</Link>
            <Link to="/sign-up?type=job-seeker" className="btn-outline text-xs px-3 py-1.5">Job seeker</Link>
          </div>
        </aside>
        <section className="auth-form-panel">
          <div className="auth-clerk-slot">
            <SignUp
              afterSignUpUrl={afterSignUpUrl}
              signInUrl={signInUrl}
              unsafeMetadata={{ accountType: accountTypeMetadata }}
              appearance={clerkAuthAppearance}
            />
            <p className="text-sm mt-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
              Already have an account?{' '}
              <Link to={signInUrl} style={{ color: 'var(--color-primary)' }}>
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
