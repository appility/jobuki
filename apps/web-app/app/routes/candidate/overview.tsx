import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, savedJobs, applications, candidateProfiles, jobAlerts, jobs } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'
import { publicJobPath } from '../../lib/public-job-path'
import { CvUploadCard } from '../../components/cv-upload-card'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'candidate' })
  const db = getDb()
  let profile = null
  try {
    profile = await db.query.candidateProfiles.findFirst({ where: eq(candidateProfiles.userId, user.id) })
  } catch (err: any) {
    if (err?.code === '42703') {
      // Column doesn't exist yet (cv_extracted_text migration not run) — fetch without that column
      profile = await db.select({
        id: candidateProfiles.id,
        userId: candidateProfiles.userId,
        name: candidateProfiles.name,
        headline: candidateProfiles.headline,
        location: candidateProfiles.location,
        bio: candidateProfiles.bio,
        skills: candidateProfiles.skills,
        cvUrl: candidateProfiles.cvUrl,
        linkedinUrl: candidateProfiles.linkedinUrl,
        publicProfileEnabled: candidateProfiles.publicProfileEnabled,
        createdAt: candidateProfiles.createdAt,
        updatedAt: candidateProfiles.updatedAt,
      }).from(candidateProfiles).where(eq(candidateProfiles.userId, user.id)).then(r => r[0] || null)
    } else {
      throw err
    }
  }

  const [saved, applied] = await Promise.all([
    db.select({ saved: savedJobs, job: jobs }).from(savedJobs).innerJoin(jobs, eq(savedJobs.jobId, jobs.id)).where(eq(savedJobs.userId, user.id)),
    db.select({ app: applications, job: jobs }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(eq(applications.candidateEmail, user.email)),
  ])

  let alertCount = 0
  try {
    const alerts = await db.select().from(jobAlerts).where(eq(jobAlerts.userId, user.id))
    alertCount = alerts.length
  } catch (error: any) {
    if (error?.code !== '42P01') throw error
  }

  const profileComplete = profile
    ? [profile.name, profile.headline, profile.bio, profile.cvUrl, profile.linkedinUrl].filter(Boolean).length
    : 0
  const profileNeedsUpdate = pct < 100 || (profile && profile.updatedAt
    ? new Date().getTime() - new Date(profile.updatedAt).getTime() > 90 * 24 * 60 * 60 * 1000
    : !profile)

  const cvNeedsUpdate = profile && profile.updatedAt
    ? new Date().getTime() - new Date(profile.updatedAt).getTime() > 90 * 24 * 60 * 60 * 1000
    : !profile?.cvUrl

  // Remove applied jobs from saved list
  const appliedJobIds = new Set(applied.map(a => a.job.id))
  const savedJobsOnly = saved.filter(s => !appliedJobIds.has(s.job.id))

  return { user, savedJobs: savedJobsOnly, applications: applied, alertCount, profileComplete, profileTotal: 5, profileNeedsUpdate }
}

export default function CandidateOverview() {
  const { user, savedJobs, applications, alertCount, profileComplete, profileTotal, profileNeedsUpdate } = useLoaderData<typeof loader>()
  const pct = Math.round((profileComplete / profileTotal) * 100)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--color-text-muted)' }}>Overview</p>
        <h1 className="text-2xl font-extrabold font-display" style={{ color: 'var(--color-text-primary)' }}>
          Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Saved jobs', value: savedJobs.length, href: '/candidate/saved' },
          { label: 'Applications', value: applications.length, href: '/candidate/applications' },
          { label: 'Email alerts', value: alertCount, href: '/candidate/alerts' },
        ].map(stat => (
          <Link key={stat.label} to={stat.href} className="card no-underline hover:-translate-y-px transition-transform block">
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
            <p className="text-3xl font-extrabold font-display mt-1" style={{ color: 'var(--color-text-primary)' }}>{stat.value}</p>
          </Link>
        ))}
      </div>

      {profileNeedsUpdate && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Update your profile</p>
            <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: 'var(--color-primary)' }} />
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
            Keep your profile fresh for better matches and opportunities.
          </p>
          <Link to="/candidate/profile" className="btn-primary inline-block mt-4 text-sm px-4 py-2">Update profile →</Link>
        </div>
      )}

      {cvNeedsUpdate && (
        <CvUploadCard
          cvUrl={profile?.cvUrl}
          cvExtractedText={profile?.cvExtractedText}
          lastUpdated={profile?.updatedAt}
        />
      )}

      {applications.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recent applications</h3>
          <div className="space-y-2">
            {applications.slice(0, 3).map(({ app, job }) => (
              <Link key={app.id} to={publicJobPath(job)} className="card p-4 no-underline hover:opacity-80 transition-opacity block">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{job.title}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {[job.company, job.location].filter(Boolean).join(' · ')}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {savedJobs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Saved jobs</h3>
          <div className="space-y-2">
            {savedJobs.slice(0, 3).map(({ saved, job }) => (
              <Link key={saved.id} to={publicJobPath(job)} className="card p-4 no-underline hover:opacity-80 transition-opacity block">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{job.title}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {[job.company, job.location].filter(Boolean).join(' · ')}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
