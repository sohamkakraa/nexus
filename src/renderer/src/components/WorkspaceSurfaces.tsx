import { useState } from 'react'
import {
  Accessibility, Check, ChevronRight, Database, Gauge, Link2,
  Mic, Network, Palette, Paperclip, RotateCcw, ShieldCheck, SlidersHorizontal,
  Sparkles, SquareTerminal, X
} from 'lucide-react'
import type { AppSnapshot, NexusApi, ProviderId } from '../../../shared/contracts'
import {
  DEFAULT_PREFERENCES, explainPreferences, type AccentPalette, type WorkspacePreferences
} from '../preferences'
import { messageOf } from '../errors'
import { WORKFLOWS, type WorkflowDefinition } from '../workflows'

export function WorkflowLibrary({ onChoose, onClose }: {
  onChoose: (workflow: WorkflowDefinition) => void
  onClose?: () => void
}): React.JSX.Element {
  return <section className="library-surface" aria-labelledby="workflow-library-title">
    <div className="surface-heading">
      <div>
        <p className="eyebrow">Start with shape</p>
        <h2 id="workflow-library-title">Choose a working method</h2>
        <p>Each workflow prepares an editable brief and context. Nothing runs until you decide.</p>
      </div>
      {onClose ? <button autoFocus className="icon-button" onClick={onClose} aria-label="Close workflow library"><X size={18} /></button> : null}
    </div>
    <div className="workflow-library-grid">
      {WORKFLOWS.map((workflow, index) => <button key={workflow.id} className="workflow-card" onClick={() => onChoose(workflow)}>
        <span className="workflow-index">{String.fromCharCode(65 + index)}</span>
        <span className="workflow-card-copy">
          <strong>{workflow.title}</strong>
          <span>{workflow.description}</span>
          <small>{workflow.safety}</small>
        </span>
        <ChevronRight size={17} />
      </button>)}
    </div>
  </section>
}

export function PreferenceStudio({ preferences, onChange, onReset }: {
  preferences: WorkspacePreferences
  onChange: (preferences: WorkspacePreferences) => void
  onReset: () => void
}): React.JSX.Element {
  const [showWhy, setShowWhy] = useState(false)
  const update = <Key extends keyof WorkspacePreferences>(key: Key, value: WorkspacePreferences[Key]): void => {
    onChange({ ...preferences, [key]: value })
  }

  return <section className="settings-surface" aria-labelledby="preference-title">
    <div className="surface-heading">
      <div>
        <p className="eyebrow">Yours, locally</p>
        <h2 id="preference-title">Shape the workspace</h2>
        <p>These choices stay on this device. Nexus does not infer them from engagement or send behavior data.</p>
      </div>
      <button className="quiet-button" onClick={onReset}><RotateCcw size={15} /> Reset</button>
    </div>

    <div className="preference-groups">
      <PreferenceGroup icon={<Gauge size={17} />} title="Density" description="Adjust spacing without hiding information.">
        <Segmented
          value={preferences.density}
          options={[['comfortable', 'Comfortable'], ['compact', 'Compact']]}
          onChange={(value) => update('density', value)}
        />
      </PreferenceGroup>
      <PreferenceGroup icon={<Palette size={17} />} title="Accent palette" description="Choose the signal color used for focus and Council convergence.">
        <div className="palette-choices" role="radiogroup" aria-label="Accent palette">
          {([
            ['signal', 'Signal', '#7895ff', '#f1a35d'],
            ['tidal', 'Tidal', '#48c8b8', '#ff7d92'],
            ['orchid', 'Orchid', '#b58cff', '#75d4ff'],
            ['ember', 'Ember', '#ff775f', '#ffd166']
          ] as Array<[AccentPalette, string, string, string]>).map(([value, label, first, second]) => (
            <button
              key={value}
              role="radio"
              aria-checked={preferences.accent === value}
              className={preferences.accent === value ? 'palette-choice active' : 'palette-choice'}
              onClick={() => update('accent', value)}
            >
              <i style={{ background: first }} /><i style={{ background: second }} /><span>{label}</span>
              {preferences.accent === value ? <Check size={14} /> : null}
            </button>
          ))}
        </div>
      </PreferenceGroup>
      <PreferenceGroup icon={<SlidersHorizontal size={17} />} title="Layout emphasis" description="Give the working brief or context inspector more room.">
        <Segmented
          value={preferences.emphasis}
          options={[['brief', 'Brief'], ['balanced', 'Balanced'], ['context', 'Context']]}
          onChange={(value) => update('emphasis', value)}
        />
      </PreferenceGroup>
      <PreferenceGroup icon={<Sparkles size={17} />} title="Motion" description="Control the signature merge animation and transitions.">
        <Segmented
          value={preferences.motion}
          options={[['system', 'Follow system'], ['reduced', 'Reduced'], ['full', 'Full']]}
          onChange={(value) => update('motion', value)}
        />
      </PreferenceGroup>
      <PreferenceGroup icon={<Accessibility size={17} />} title="Inspector default" description="Choose whether new sessions begin with context visible.">
        <Segmented
          value={preferences.inspectorDefault}
          options={[['open', 'Open'], ['closed', 'Closed']]}
          onChange={(value) => update('inspectorDefault', value)}
        />
      </PreferenceGroup>
      <PreferenceGroup icon={<Sparkles size={17} />} title="Suggested workflows" description="Show or hide workflow invitations on an empty table.">
        <label className="switch-row">
          <input
            type="checkbox"
            checked={preferences.suggestedWorkflows}
            onChange={(event) => update('suggestedWorkflows', event.target.checked)}
          />
          <span>{preferences.suggestedWorkflows ? 'Suggestions shown' : 'Suggestions hidden'}</span>
        </label>
      </PreferenceGroup>
    </div>

    <div className="adaptation-note">
      <div>
        <ShieldCheck size={18} />
        <span><strong>Transparent adaptation</strong>Only explicit controls change this interface. Every choice is local, inspectable, and reversible.</span>
      </div>
      <button onClick={() => setShowWhy((value) => !value)}>{showWhy ? 'Hide explanation' : 'Explain my choices'}</button>
      {showWhy ? <ul>{explainPreferences(preferences).map((item) => <li key={item}>{item}</li>)}</ul> : null}
    </div>
  </section>
}

type DiagnosticStatus = 'idle' | 'running' | 'pass' | 'attention'
type DiagnosticResult = { status: DiagnosticStatus; detail: string }

const IDLE: DiagnosticResult = { status: 'idle', detail: 'Not run' }

export function DiagnosticsSurface({ api, snapshot, onUseConversation, onOpenConnections }: {
  api: NexusApi
  snapshot: AppSnapshot
  onUseConversation: (id: string) => void
  onOpenConnections: () => void
}): React.JSX.Element {
  const [results, setResults] = useState<Record<string, DiagnosticResult>>({})
  const [provider, setProvider] = useState<ProviderId>('openai')
  const [connectorUrl, setConnectorUrl] = useState('')

  const resultFor = (id: string): DiagnosticResult => results[id] ?? IDLE
  const run = async (id: string, action: () => Promise<string>): Promise<void> => {
    setResults((current) => ({ ...current, [id]: { status: 'running', detail: 'Checking…' } }))
    try {
      const detail = await action()
      setResults((current) => ({ ...current, [id]: { status: 'pass', detail } }))
    } catch (reason) {
      setResults((current) => ({ ...current, [id]: { status: 'attention', detail: messageOf(reason) } }))
    }
  }

  const checks = [
    {
      id: 'database',
      icon: <Database size={17} />,
      title: 'Database read / write',
      description: 'Reads the snapshot and creates one empty local work item. No provider is contacted.',
      action: 'Create local test item',
      onRun: () => run('database', async () => {
        await api.getSnapshot()
        const created = await api.createConversation('council')
        onUseConversation(created.id)
        return 'Read succeeded; an empty Council work item was written locally.'
      })
    },
    {
      id: 'models',
      icon: <Gauge size={17} />,
      title: 'Model capability mapping',
      description: 'Checks discovered models for declared text, image, realtime, and tool capabilities.',
      action: 'Inspect mapping',
      onRun: () => run('models', async () => {
        if (!snapshot.models.length) throw new Error('No models are configured. Connect a provider, then run again.')
        const unmapped = snapshot.models.filter((model) => model.capabilities.length === 0)
        if (unmapped.length) throw new Error(`${unmapped.length} model${unmapped.length === 1 ? '' : 's'} have no mapped capabilities.`)
        return `${snapshot.models.length} model${snapshot.models.length === 1 ? '' : 's'} have explicit capability maps.`
      })
    },
    {
      id: 'attachments',
      icon: <Paperclip size={17} />,
      title: 'Attachment intake',
      description: 'Opens the local file picker and validates the returned attachment metadata.',
      action: 'Choose test file',
      onRun: () => run('attachments', async () => {
        const files = await api.selectFiles()
        if (!files.length) throw new Error('No file selected; nothing was imported.')
        return `${files.length} attachment${files.length === 1 ? '' : 's'} imported with local metadata.`
      })
    },
    {
      id: 'recording',
      icon: <Mic size={17} />,
      title: 'Recording permission',
      description: 'Reads the operating system microphone permission state. This check does not start recording.',
      action: 'Read permission',
      onRun: () => run('recording', async () => {
        if (!navigator.permissions?.query) throw new Error('Permission state is unavailable in this runtime.')
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        return `Microphone permission is ${permission.state}.`
      })
    },
    {
      id: 'jobs',
      icon: <X size={17} />,
      title: 'Job cancellation',
      description: 'Cancels one running background job only after you request this check.',
      action: 'Cancel running job',
      onRun: () => run('jobs', async () => {
        const job = snapshot.jobs.find((item) => item.status === 'running' || item.status === 'queued')
        if (!job) throw new Error('No running job is available to cancel.')
        await api.cancelJob(job.id)
        return `Cancellation requested for “${job.label}”.`
      })
    },
    {
      id: 'approval',
      icon: <SquareTerminal size={17} />,
      title: 'Command approval boundary',
      description: 'Requests the harmless “pwd” command. The native approval prompt must appear before it runs.',
      action: 'Request approval test',
      onRun: () => run('approval', async () => {
        const value = await api.runCommand('pwd')
        if (value.code !== 0) throw new Error(value.stderr || 'The approved command did not complete.')
        return 'Approval completed and the allowlisted command returned successfully.'
      })
    }
  ]

  return <section className="diagnostics-surface" aria-labelledby="diagnostics-title">
    <div className="surface-heading">
      <div>
        <p className="eyebrow">On-device checks</p>
        <h2 id="diagnostics-title">Workspace diagnostics</h2>
        <p>Checks run one at a time and only when requested. Nexus never changes security settings or spends provider credits here.</p>
      </div>
      <span className="local-pill"><ShieldCheck size={14} /> Local first</span>
    </div>

    <div className="diagnostic-grid">
      {checks.map((check) => {
        const result = resultFor(check.id)
        return <article className="diagnostic-card" key={check.id}>
          <div className="diagnostic-icon">{check.icon}</div>
          <div>
            <h3>{check.title}</h3>
            <p>{check.description}</p>
            <DiagnosticResultView result={result} />
          </div>
          <button disabled={result.status === 'running'} onClick={() => void check.onRun()}>{check.action}</button>
        </article>
      })}

      <article className="diagnostic-card external-check">
        <div className="diagnostic-icon"><Network size={17} /></div>
        <div>
          <h3>Provider connectivity</h3>
          <p>Refresh checks the account model list without generation. Response test sends one tiny paid request only when you click it.</p>
          <div className="inline-controls">
            <select aria-label="Provider to test" value={provider} onChange={(event) => setProvider(event.target.value as ProviderId)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
            <button onClick={() => onOpenConnections()}>Connections</button>
          </div>
          <DiagnosticResultView result={resultFor('provider')} />
          <DiagnosticResultView result={resultFor('provider-response')} />
        </div>
        <div className="diagnostic-actions">
          <button onClick={() => void run('provider', async () => {
            if (!snapshot.configuredProviders.includes(provider)) throw new Error(`${provider === 'openai' ? 'OpenAI' : 'Anthropic'} is not connected.`)
            const models = await api.discoverModels(provider)
            return `${models.length} models returned. No generation request was made.`
          })}>Refresh models</button>
          <button onClick={() => void run('provider-response', async () => {
            if (!snapshot.configuredProviders.includes(provider)) throw new Error(`${provider === 'openai' ? 'OpenAI' : 'Anthropic'} is not connected.`)
            const models = await api.discoverModels(provider)
            const model = models.find((item) => item.capabilities.includes('text'))
            if (!model) throw new Error('No text model is available for this API project.')
            return `${model.label}: ${await api.testModelResponse(model.id)}`
          })}>Test response</button>
        </div>
      </article>

      <article className="diagnostic-card external-check">
        <div className="diagnostic-icon"><Link2 size={17} /></div>
        <div>
          <h3>MCP reachability</h3>
          <p>Connects to the HTTPS endpoint and lists tools. It does not call a tool.</p>
          <input
            aria-label="MCP endpoint"
            placeholder="https://server.example/mcp"
            value={connectorUrl}
            onChange={(event) => setConnectorUrl(event.target.value)}
          />
          <DiagnosticResultView result={resultFor('mcp')} />
        </div>
        <button disabled={!connectorUrl.trim()} onClick={() => void run('mcp', async () => {
          const tools = await api.connectMcp({ id: `diagnostic-${Date.now()}`, name: 'Diagnostic connector', transport: 'http', url: connectorUrl.trim() })
          return `Endpoint reached; ${tools.length} tool${tools.length === 1 ? '' : 's'} listed and none called.`
        })}>Check endpoint</button>
      </article>
    </div>
  </section>
}

function PreferenceGroup({ icon, title, description, children }: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return <div className="preference-group">
    <div className="preference-label">{icon}<span><strong>{title}</strong><small>{description}</small></span></div>
    <div>{children}</div>
  </div>
}

function Segmented<Value extends string>({ value, options, onChange }: {
  value: Value
  options: Array<[Value, string]>
  onChange: (value: Value) => void
}): React.JSX.Element {
  return <div className="segmented">
    {options.map(([option, label]) => <button
      key={option}
      className={value === option ? 'active' : ''}
      aria-pressed={value === option}
      onClick={() => onChange(option)}
    >{label}</button>)}
  </div>
}

function DiagnosticResultView({ result }: { result: DiagnosticResult }): React.JSX.Element {
  return <p className={`diagnostic-result ${result.status}`} aria-live="polite">
    <i />{result.detail}
  </p>
}

export { DEFAULT_PREFERENCES }
