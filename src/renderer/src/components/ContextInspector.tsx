import { useState } from 'react'
import {
  Activity, FlaskConical, Image, Link2, Search, Settings2, Sparkles,
  SquareTerminal, Users, X
} from 'lucide-react'
import type {
  AppSnapshot,
  Model,
  NexusApi,
  PlatformCapabilities,
  ProviderId
} from '../../../shared/contracts'
import type { ModelBadgeStyle } from '../preferences'
import type { WorkflowDraft } from '../workflows'

export function ContextInspector({ api, platform, models, primary, secondary, mode, workflow, jobs, imageModels, badgeStyle, onModel, onError, onClose }: {
  api: NexusApi
  platform: PlatformCapabilities
  models: Model[]
  primary: string
  secondary: string
  mode: 'solo' | 'council'
  workflow: WorkflowDraft | null
  jobs: AppSnapshot['jobs']
  imageModels: Model[]
  badgeStyle: ModelBadgeStyle
  onModel: (id: string, primary: boolean) => void
  onError: (value: string) => void
  onClose: () => void
}): React.JSX.Element {
  const [researchQuery, setResearchQuery] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [command, setCommand] = useState('')
  const [terminalOutput, setTerminalOutput] = useState('')
  const [connectorUrl, setConnectorUrl] = useState('')
  const [connectorTools, setConnectorTools] = useState<string[]>([])
  const openai = models.filter((model) => model.provider === 'openai')
  const anthropic = models.filter((model) => model.provider === 'anthropic')
  const primaryProvider = models.find((model) => model.id === primary)?.provider
  const crossProviderModels = models.filter((model) => model.id !== primary && model.provider !== primaryProvider)
  const secondaryModels = crossProviderModels.length
    ? crossProviderModels
    : primaryProvider === 'openai' ? anthropic : openai.length ? openai : models.filter((model) => model.id !== primary)
  const advancedWorkflow = ['research', 'image', 'terminal', 'connector'].includes(workflow?.id ?? '')

  return <aside className="inspector" aria-label="Context inspector">
    <div className="inspector-head">
      <div><p className="eyebrow">At the table</p><h2>Context inspector</h2></div>
      <button className="icon-button" onClick={onClose} aria-label="Close context inspector"><X size={17} /></button>
    </div>

    <section className="council-seats">
      <div className="section-title"><Users size={15} /><span>Council seats</span><b>{mode}</b></div>
      <div className="seat-map" aria-label={`${mode === 'council' ? 'Two' : 'One'} model session`}>
        <ModelSelect label="Lead" value={primary} models={models} badgeStyle={badgeStyle} onChange={(id) => onModel(id, true)} />
        <span className="seat-merge" aria-hidden="true"><i /><i /><b /></span>
        {mode === 'council'
          ? <ModelSelect label="Challenger" value={secondary} models={secondaryModels} badgeStyle={badgeStyle} onChange={(id) => onModel(id, false)} />
          : <p className="solo-note">Solo mode returns the lead model directly.</p>}
      </div>
    </section>

    <section>
      <div className="section-title"><Sparkles size={15} /><span>Working method</span></div>
      {workflow
        ? <div className="workflow-context">
          <strong>{workflow.title}</strong>
          <div>{workflow.context.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
        : <p className="muted">Choose a workflow to pin its context here.</p>}
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
        {job.result ? <details><summary>Open result</summary>{job.kind === 'image' ? <img className="job-image" src={job.result} alt={job.label} /> : <p>{job.result}</p>}</details> : null}
      </div>)}
    </section>
  </aside>
}

function ModelSelect({ label, value, models, badgeStyle, onChange }: {
  label: string
  value: string
  models: Model[]
  badgeStyle: ModelBadgeStyle
  onChange: (value: string) => void
}): React.JSX.Element {
  const selected = models.find((model) => model.id === value)
  return <label className="model-seat">
    <span>{label}<ModelBadge model={selected} style={badgeStyle} /></span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Choose model</option>
      {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
    </select>
  </label>
}

function ModelBadge({ model, style }: { model?: Model; style: ModelBadgeStyle }): React.JSX.Element | null {
  if (!model || style === 'minimal') return null
  return <small>{style === 'provider' ? providerLabel(model.provider) : model.label}</small>
}

function providerLabel(provider: ProviderId): string {
  return provider === 'anthropic' ? 'Anthropic' : 'OpenAI'
}

function messageOf(reason: unknown): string {
  const value = reason instanceof Error ? reason.message : String(reason)
  return value.replace(/^Error invoking remote method '[^']+': Error: /, '')
}
