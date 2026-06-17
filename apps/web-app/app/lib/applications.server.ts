import { getDb, applications, jobs, boards, jobBoardListings, applicationStatusHistory } from '@jobuki/db'
import { eq, and, inArray } from 'drizzle-orm'

export type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired'

export async function getApplicationsForBoardAdmin(boardId: string, jobIdFilter?: string, statusFilter?: string) {
  const db = getDb()

  // Get all jobs on this board
  const boardJobs = await db
    .select({ id: jobs.id, title: jobs.title })
    .from(jobs)
    .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
    .where(eq(jobBoardListings.boardId, boardId))

  if (boardJobs.length === 0) {
    return { jobs: [], applications: [], jobStats: new Map(), selectedJobId: null }
  }

  const jobIds = boardJobs.map(j => j.id)

  // Get applications for these jobs
  const allApps = await db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      status: applications.status,
    })
    .from(applications)
    .where(inArray(applications.jobId, jobIds))

  // Determine selected job
  const selectedJobId = jobIdFilter && jobIds.includes(jobIdFilter) ? jobIdFilter : jobIds[0]
  const filter = statusFilter || 'new'

  // Count per job and status
  const jobStats = new Map<string, Record<ApplicationStatus, number>>()
  const statuses: ApplicationStatus[] = ['new', 'reviewing', 'shortlisted', 'rejected', 'hired']
  statuses.forEach(s => {
    boardJobs.forEach(job => {
      if (!jobStats.has(job.id)) jobStats.set(job.id, {} as any)
      jobStats.get(job.id)![s] = allApps.filter(
        a => a.jobId === job.id && a.status === s
      ).length
    })
  })

  // Filter by selected job and status
  const filtered = allApps.filter(a => a.jobId === selectedJobId && a.status === filter)

  return { jobs: boardJobs, applications: filtered, jobStats, selectedJobId, statusFilter: filter }
}

export async function getApplicationsForPublisher(publisherId: string, boardId?: string, jobIdFilter?: string, statusFilter?: string) {
  const db = getDb()

  // Get jobs posted by this publisher
  let jobQuery = db
    .select({ id: jobs.id, title: jobs.title, boardId: jobBoardListings.boardId })
    .from(jobs)
    .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
    .innerJoin(boards, eq(jobBoardListings.boardId, boards.id))
    .where(eq(boards.workspaceId, publisherId))

  // If boardId specified, filter to that board
  if (boardId) {
    jobQuery = jobQuery.where(eq(jobBoardListings.boardId, boardId)) as any
  }

  const publisherJobs = await jobQuery

  if (publisherJobs.length === 0) {
    return { jobs: [], applications: [], jobStats: new Map(), selectedJobId: null }
  }

  const jobIds = publisherJobs.map(j => j.id)

  // Get applications for these jobs
  const allApps = await db
    .select({
      id: applications.id,
      jobId: applications.jobId,
      status: applications.status,
    })
    .from(applications)
    .where(inArray(applications.jobId, jobIds))

  // Determine selected job
  const selectedJobId = jobIdFilter && jobIds.includes(jobIdFilter) ? jobIdFilter : jobIds[0]
  const filter = statusFilter || 'new'

  // Count per job and status
  const jobStats = new Map<string, Record<ApplicationStatus, number>>()
  const statuses: ApplicationStatus[] = ['new', 'reviewing', 'shortlisted', 'rejected', 'hired']
  statuses.forEach(s => {
    publisherJobs.forEach(job => {
      if (!jobStats.has(job.id)) jobStats.set(job.id, {} as any)
      jobStats.get(job.id)![s] = allApps.filter(
        a => a.jobId === job.id && a.status === s
      ).length
    })
  })

  // Filter by selected job and status
  const filtered = allApps.filter(a => a.jobId === selectedJobId && a.status === filter)

  return { jobs: publisherJobs, applications: filtered, jobStats, selectedJobId, statusFilter: filter }
}

export async function updateApplicationStatus(applicationId: string, status: string, note: string | undefined, userId: string) {
  const db = getDb()

  // Update application
  await db.update(applications)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(applications.id, applicationId))

  // Insert history record
  await db.insert(applicationStatusHistory).values({
    applicationId,
    status: status as any,
    changedByUserId: userId,
    note: note || undefined,
  })
}
