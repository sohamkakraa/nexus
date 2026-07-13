import { useState } from 'react'
import {
  Activity, FlaskConical, Image, Link2, Search, Settings2, Sparkles,
  SquareTerminal, X
} from 'lucide-react'
import type {
  AppSnapshot,
  Model,
  NexusApi,
  PlatformCapabilities
} from '../../../shared/contracts'
import type { WorkflowDraft } from '../workflows'
import { messageOf } from '../errors'

export function ContextInspector({ api, platform, workflow, jobs, imageModels, onError, onClose }: {
  api: NexusApi
  platform: PlatformCapabilities
  workflow: WorkflowDraft | null
  jobs: AppSnapshot['jobs']
  imageModels: Model[]
  onError: (value: string) => void
  onClose: () => void
}): React.JSX.Element {
  const [researchQuery, setResearchQuery] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [command, setCommand] = useState('')
  const [terminalOutput, setTerminalOutput] = useState('')
  const [connectorUrl, setConnectorUrl] = useState('')
  const [connectorTools, setConnectorTools] = useState<string[]>([])
  const advancedWorkflow = ['research', 'image', 'terminal', 'connector'].includes(workflow?.id ?? '')

  return <aside className="inspector" aria-label="Context inspector">
    <div className="inspector-head">
      <div><p className="eyebrow">Optional</p><h2>Details & tools</h2></div>
      <button className="icon-button" onClick={onClose} aria-label="Close context inspector"><X size={17} /></button>
    </div>

    <section>
      <div className="section-title"><Sparkles size={15} /><span>Current workflow</span></div>
      {workflow
        ? <div className="workflow-context">
          <strong>{workflow.title}</strong>
          <div>{workflow.context.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        : <p className="muted">No workflow selected. You can simply write a message.</p>}
    </section>

    <details className="advanced-tool-dock" open={advancedWorkflow}>
      <summary className="advanced-tool-summary"><Activity size={15} /><span><strong>Advanced tools</strong><small>Research, image, terminal, and connectors</small></span></summary>
      <section className="tool-dock">
      <details open={workflow?.id === 'research'}>
        <summary><Search size={14} /> Research</summary>
        <input value={researchQuery} onChange={(event) => setResearchQuery(event.target.value)} placeholder="Question to investigate" />
        <div className="button-pair">
          <button disabled={!researchQuery.trim()} onClick={() => {
            void api.startResearch({ conversationId: 'session', query: researchQuery, depth: 'quick' }).catch((reason) => onError(messageOf(reason)))
            setResearchQuery('')
          }}>Quick search</button>
          <button disabled={!researchQuery.trim()} onClick={() => {
            void api.startResearch({ conversationId: 'session', query: researchQuery, depth: 'deep' }).catch((reason) => onError(messageOf(reason)))
            setResearchQuery('')
          }}><FlaskConical size={13} /> Deep research</button>
        </div>
      </details>

      <details open={workflow?.id === 'image'}>
        <summary><Image size={14} /> Image studio</summary>
        <input value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Generation prompt" />
        <button className="wide-button" disabled={!imagePrompt.trim() || !imageModels[0]} onClick={() => {
          void api.generateImage(imagePrompt, imageModels[0]?.id ?? '').catch((reason) => onError(messageOf(reason)))
          setImagePrompt('')
        }}>Generate image</button>
        {!imageModels.length ? <small className="tool-hint">Connect an image-capable model first.</small> : null}
      </details>

      <details open={workflow?.id === 'terminal'}>
        <summary><SquareTerminal size={14} /> Terminal / system</summary>
        <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Allowlisted command, e.g. git status" />
        <button className="wide-button" disabled={!command.trim()} onClick={() => {
          void api.runCommand(command).then((result) => setTerminalOutput(result.stdout || result.stderr)).catch((reason) => onError(messageOf(reason)))
        }}>Request command approval</button>
        {terminalOutput ? <pre className="terminal-output">{terminalOutput}</pre> : null}
        <div className="button-pair system-actions">
          <button disabled={!platform.systemControls} onClick={() => void api.runSystemAction('toggle-dark-mode').catch((reason) => onError(messageOf(reason)))}>Toggle appearance</button>
          <button disabled={!platform.systemControls} onClick={() => void api.runSystemAction('open-app', 'Finder').catch((reason) => onError(messageOf(reason)))}>Open Finder</button>
        </div>
        <small className="tool-hint">{platform.systemControlsMessage}</small>
      </details>

      <details open={workflow?.id === 'connector'}>
        <summary><Link2 size={14} /> MCP connector</summary>
        <input value={connectorUrl} onChange={(event) => setConnectorUrl(event.target.value)} placeholder="https://server.example/mcp" />
        <button className="wide-button" disabled={!connectorUrl.trim()} onClick={() => {
          void api.connectMcp({ id: 'remote-session', name: 'Remote MCP', transport: 'http', url: connectorUrl })
            .then((tools) => setConnectorTools(tools.map((tool) => tool.name)))
            .catch((reason) => onError(messageOf(reason)))
        }}>Connect and inspect tools</button>
        {connectorTools.length ? <p className="tool-list">{connectorTools.join(' · ')}</p> : null}
      </details>

      </section>
    </details>

    <section className="job-section">
      <div className="section-title"><Settings2 size={15} /><span>Background work</span><b>{jobs.filter((job) => job.status === 'running').length} live</b></div>
      {!jobs.length ? <p className="muted">Jobs appear here with progress and cancellation controls.</p> : null}
      {jobs.slice().reverse().map((job) => <div className="job" key={job.id}>
        <div><span>{job.label}</span><small>{job.status}</small></div>
        <div className="progress"><i style={{ width: `${job.progress}%` }} /></div>
        {job.status === 'running' || job.status === 'queued'
          ? <button className="cancel-job" onClick={() => void api.cancelJob(job.id).catch((reason) => onError(messageOf(reason)))}>Cancel job</button>
          : null}
        {job.error ? <p className="job-error" role="alert">{job.error}</p> : null}
        {job.result ? <details><summary>Open result</summary>{job.kind === 'image' ? <img className="job-image" src={job.result} alt={job.label} /> : <p>{job.result}</p>}</details> : null}
      </div>)}
    </section>
  </aside>
}
