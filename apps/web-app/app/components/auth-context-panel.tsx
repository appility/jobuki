import { Link } from 'react-router'
import { buildAuthPath, type AuthMode, type AuthUserType } from '../lib/auth-flow'

type AuthContextPanelProps = {
  userType: AuthUserType
  mode: AuthMode
  redirectTo?: string | null
}

type Copy = {
  kicker: string
  title: string
  copy: string
}

const SIGN_IN_COPY: Record<AuthUserType, Copy> = {
  'candidate': {
    kicker: 'Candidate access',
    title: 'Welcome back',
    copy: 'Sign in to track applications and manage your candidate profile.',
  },
  'publisher': {
    kicker: 'Publisher access',
    title: 'Welcome back',
    copy: 'Sign in to manage submitted listings and paid posting activity.',
  },
  'board-creator': {
    kicker: 'Board creator access',
    title: 'Welcome back to Jobuki',
    copy: 'Sign in to manage boards, post jobs, and track applications in one place.',
  },
}

const SIGN_UP_COPY: Record<AuthUserType, Copy> = {
  'candidate': {
    kicker: 'Candidate account',
    title: 'Track your applications in one place',
    copy: 'Create an account to manage your profile and follow the status of your applications.',
  },
  'publisher': {
    kicker: 'Publisher account',
    title: 'Post paid listings with control',
    copy: 'Create an account to submit and manage job listings as an advertiser.',
  },
  'board-creator': {
    kicker: 'Create your workspace',
    title: 'Start building your hiring hub',
    copy: 'Create your account and launch branded job boards under your own domain.',
  },
}

function getCopy(userType: AuthUserType, mode: AuthMode): Copy {
  return mode === 'sign-up' ? SIGN_UP_COPY[userType] : SIGN_IN_COPY[userType]
}

export function AuthContextPanel({ userType, mode, redirectTo }: AuthContextPanelProps) {
  const text = getCopy(userType, mode)

  return (
    <aside className="auth-side-panel" aria-hidden>
      <p className="auth-kicker">{text.kicker}</p>
      <h1 className="auth-side-title">{text.title}</h1>
      <p className="auth-side-copy">{text.copy}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link to={buildAuthPath({ type: 'board-creator', mode, redirectTo })} className="btn-outline text-xs px-3 py-1.5">
          Board creator
        </Link>
        <Link to={buildAuthPath({ type: 'publisher', mode, redirectTo })} className="btn-outline text-xs px-3 py-1.5">
          Publisher
        </Link>
        <Link to={buildAuthPath({ type: 'candidate', mode, redirectTo })} className="btn-outline text-xs px-3 py-1.5">
          Candidate
        </Link>
      </div>
    </aside>
  )
}
