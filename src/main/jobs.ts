import PQueue from 'p-queue'
import { nanoid } from 'nanoid'
import type { JobState } from '../shared/contracts'
import { createImage, research, transcribe } from './providers'

const queue = new PQueue({ concurrency: 3 })
const jobs = new Map<string, JobState>()
const controllers = new Map<string, AbortController>()
let onChange: () => void = () => undefined

export function configureJobNotifications(callback: () => void): void {
  onChange = callback
}

export function listJobs(): JobState[] {
  return [...jobs.values()]
}

export function startResearchJob(query: string, depth: 'quick' | 'deep' | 'auto'): JobState {
  const activeResearch = [...jobs.values()].filter((job) => job.kind === 'research' && ['queued', 'running'].includes(job.status))
  if (activeResearch.length >= 2) throw new Error('At most two research jobs may run at once.')
  return createJob('research', `${depth === 'quick' ? 'Search' : 'Research'}: ${query.slice(0, 42)}`, async (signal) => {
    updateProgress(signal, 20)
    const result = await research(query, depth, signal)
    updateProgress(signal, 90)
    return result
  })
}

export function startImageJob(prompt: string, model: string): JobState {
  return createJob('image', `Image: ${prompt.slice(0, 46)}`, (signal) => {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    return createImage(prompt, model)
  })
}

export function startTranscriptionJob(path: string, model: string): JobState {
  return createJob('transcription', 'Meeting transcript', (signal) => {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    return transcribe(path, model)
  })
}

export function cancelJob(id: string): void {
  controllers.get(id)?.abort()
  const job = jobs.get(id)
  if (job && ['queued', 'running'].includes(job.status)) {
    job.status = 'cancelled'
    job.progress = 0
    onChange()
  }
}

function createJob(kind: JobState['kind'], label: string, work: (signal: AbortSignal) => Promise<string>): JobState {
  pruneFinishedJobs()
  const id = nanoid()
  const job: JobState = { id, kind, label, status: 'queued', progress: 0 }
  const controller = new AbortController()
  jobs.set(id, job)
  controllers.set(id, controller)
  void queue.add(async () => {
    if (controller.signal.aborted) return
    Object.assign(job, { status: 'running', progress: 10 })
    onChange()
    try {
      const result = await work(controller.signal)
      if (!controller.signal.aborted) Object.assign(job, { status: 'completed', progress: 100, result })
    } catch (error) {
      if (!controller.signal.aborted) Object.assign(job, {
        status: 'failed', progress: 0, error: error instanceof Error ? error.message : 'Job failed.'
      })
    } finally {
      controllers.delete(id)
      onChange()
    }
  })
  onChange()
  return job
}

function pruneFinishedJobs(): void {
  const finished = [...jobs.values()].filter((job) => !['queued', 'running'].includes(job.status))
  for (const job of finished.slice(0, Math.max(0, jobs.size - 100))) jobs.delete(job.id)
}

function updateProgress(signal: AbortSignal, progress: number): void {
  const entry = [...controllers.entries()].find(([, controller]) => controller.signal === signal)
  if (!entry) return
  const job = jobs.get(entry[0])
  if (job) {
    job.progress = progress
    onChange()
  }
}
