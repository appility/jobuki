import OpenAI from 'openai'

let client: OpenAI | null = null
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, project: process.env.OPENAI_PROJECT_ID })
  return client
}

type JobContext = {
  title: string
  company: string | null
  description: string
  requirements?: string | null
  category?: string | null
}

type ProfileContext = {
  name?: string | null
  headline?: string | null
  bio?: string | null
  skills?: string[] | null
  cvText?: string | null
}

export type ApplyAiResult = {
  tips: string[]
  coverLetter?: string
  matchSummary?: string
}

export async function generateApplyContent(job: JobContext, profile?: ProfileContext): Promise<ApplyAiResult> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { tips: [] }

  const hasProfile = profile && (profile.bio || profile.skills?.length || profile.cvText)

  const systemPrompt = `You are a career coach helping job seekers apply effectively. Be specific, practical and concise. Never use generic platitudes.`

  const jobContext = `
Job title: ${job.title}
Company: ${job.company ?? 'Unknown'}
Category: ${job.category ?? 'Tech'}
Description: ${job.description.slice(0, 2000)}
${job.requirements ? `Requirements: ${job.requirements.slice(0, 1000)}` : ''}`

  const profileContext = hasProfile ? `
Candidate name: ${profile!.name ?? 'the candidate'}
Headline: ${profile!.headline ?? ''}
Bio: ${profile!.bio ?? ''}
Skills: ${(profile!.skills ?? []).join(', ')}
${profile!.cvText ? `CV extract: ${profile!.cvText.slice(0, 2000)}` : ''}` : ''

  const prompt = hasProfile
    ? `Given this job and candidate profile, provide:
1. A JSON object with:
   - "tips": array of 4 specific application tips for THIS role (not generic advice)
   - "matchSummary": 1-2 sentences on how this candidate's background fits the role and any key gaps
   - "coverLetter": a strong, specific cover letter (3 paragraphs, no placeholder text, use real details from the profile and job)

Job:${jobContext}

Candidate:${profileContext}

Return only valid JSON.`
    : `Given this job, provide a JSON object with:
- "tips": array of 4 specific application tips for THIS role (not generic advice)

Job:${jobContext}

Return only valid JSON.`

  try {
    const response = await getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1200,
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)
    return {
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 4) : [],
      coverLetter: parsed.coverLetter ?? undefined,
      matchSummary: parsed.matchSummary ?? undefined,
    }
  } catch {
    return { tips: [] }
  }
}
