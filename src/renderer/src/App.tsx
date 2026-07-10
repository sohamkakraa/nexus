import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, Bot, ChevronDown, CircleStop, Command, FilePlus2, FlaskConical,
  Image, KeyRound, Menu, Mic, Moon, Paperclip, Plus, Search, Send,
  Settings2, Sparkles, Sun, TerminalSquare, Users, X
} from 'lucide-react'
import type {
  AppSnapshot,
  Attachment,
  Model,
  PrivacySettings,
  ProviderId
} from '../../shared/contracts'

const EMPTY: AppSnapshot = { conversations: [], models: [], configuredProviders: [], jobs: [], skills: [] }

export function App(): React.JSX.Element {
  const [snapshot, setSnapshot] = useState(EMPTY)
  const [activeId, setActiveId] = useState('')
  const [mode, setMode] = useState<'solo' | 'council'>('council')
  const [primaryModel, setPrimaryModel] = useState('')
  const [secondaryModel, setSecondaryModel] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [streamed, setStreamed] = useState<{ conversationId: string; text: string } | null>(null)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [callOpen, setCallOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const scrollRef = useRef<HTMLDivElement>(null)

  const active = snapshot.conversations.find((item) => item.id === activeId)
  const textModels = useMemo(() => snapshot.models.filter((model) => model.capabilities.includes('text')), [snapshot.models])
  const imageModels = snapshot.models.filter((model) => model.capabilities.includes('image'))
  const realtimeModels = snapshot.models.filter((model) => model.provider === 'openai' && model.capabilities.includes('realtime'))

  useEffect(() => {
    void window.nexus.getSnapshot().then(setSnapshot).catch((reason) => setError(messageOf(reason)))
    const removeSnapshot = window.nexus.onSnapshot(setSnapshot)
    const removeDelta = window.nexus.onChatDelta((event) => {
      setStreamed((current) => ({
        conversationId: event.conversationId,
        text: current?.conversationId === event.conversationId ? current.text + event.delta : event.delta
      }))
    })
    return () => { removeSnapshot(); removeDelta() }
  }, [])

  useEffect(() => {
    if (!activeId && snapshot.conversations[0]) setActiveId(snapshot.conversations[0].id)
    if (!primaryModel && textModels[0]) setPrimaryModel(textModels[0].id)
    if (!secondaryModel) {
      const other = textModels.find((model) => model.provider !== providerOf(primaryModel)) ?? textModels[1]
      if (other) setSecondaryModel(other.id)
    }
    if (snapshot.configuredProviders.length < 2 && snapshot.conversations.length === 0) setSettingsOpen(true)
  }, [snapshot, textModels, activeId, primaryModel, secondaryModel])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [active?.messages.length, sending])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function createConversation(nextMode = mode): Promise<void> {
    try {
      const conversation = await window.nexus.createConversation(nextMode)
      setActiveId(conversation.id)
      setMode(nextMode)
      setDraft('')
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  async function send(): Promise<void> {
    if (!draft.trim() || !primaryModel || sending) return
    setError('')
    setSending(true)
    setStreamed(null)
    try {
      let conversationId = activeId
      if (!conversationId) {
        const created = await window.nexus.createConversation(mode)
        conversationId = created.id
        setActiveId(created.id)
      }
      const content = draft.trim()
      setDraft('')
      await window.nexus.sendMessage({
        conversationId, content, mode, primaryModel,
        secondaryModel: mode === 'council' ? secondaryModel : undefined,
        attachmentIds: attachments.map((file) => file.id)
      })
      setAttachments([])
    } catch (reason) {
      setError(messageOf(reason))
    } finally {
      setSending(false)
      setStreamed(null)
    }
  }

  async function addFiles(): Promise<void> {
    try {
      const selected = await window.nexus.selectFiles()
      setAttachments((current) => [...current, ...selected].slice(0, 10))
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  function chooseModel(id: string, primary: boolean): void {
    if (primary) {
      setPrimaryModel(id)
      if (id === secondaryModel) setSecondaryModel(textModels.find((model) => model.id !== id)?.id ?? '')
    } else setSecondaryModel(id)
  }

  return (
    <div className={`app ${theme}`} data-testid="app">
      <aside className="sidebar">
        <div className="traffic-space" />
        <div className="brand">
          <NexusMark />
          <span>Nexus</span>
          <button className="icon-button sidebar-menu" aria-label="Open commands" onClick={() => setPaletteOpen(true)}><Menu size={17} /></button>
        </div>
        <button className="new-chat" onClick={() => void createConversation()}>
          <Plus size={16} /> New conversation <span>⌘N</span>
        </button>
        <div className="sidebar-label">Threads</div>
        <nav className="thread-list" aria-label="Conversation history">
          {snapshot.conversations.map((conversation) => (
            <button key={conversation.id} className={conversation.id === activeId ? 'thread active' : 'thread'} onClick={() => {
              setActiveId(conversation.id)
              setMode(conversation.mode)
            }}>
              {conversation.mode === 'council' ? <Users size={14} /> : <Bot size={14} />}
              <span>{conversation.title}</span>
              <time>{relativeTime(conversation.updatedAt)}</time>
            </button>
          ))}
          {!snapshot.conversations.length && <p className="empty-sidebar">Your work will collect here.</p>}
        </nav>
        <div className="sidebar-footer">
          <button onClick={() => setSettingsOpen(true)}><Settings2 size={16} /> Connections</button>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />} {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{mode === 'council' ? 'Two minds · one answer' : 'Direct session'}</p>
            <h1>{active?.title ?? 'A clearer way to think'}</h1>
          </div>
          <div className="top-actions">
            <button className="quiet-button" onClick={() => setCallOpen(true)}><Mic size={16} /> Call agent</button>
            <button className="icon-button" aria-label="Toggle activity panel" onClick={() => setInspectorOpen((value) => !value)}><Activity size={18} /></button>
          </div>
        </header>

        <div className="conversation" ref={scrollRef}>
          {!active?.messages.length ? <Welcome onPrompt={setDraft} /> : active.messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <div className="message-avatar">{message.role === 'user' ? 'You' : <NexusMark compact />}</div>
              <div className="message-body">
                <div className="message-meta">{message.author ?? (message.role === 'user' ? 'You' : 'Nexus')} <time>{timeOnly(message.createdAt)}</time></div>
                <div className="message-content">{message.content}</div>
                {!!message.attachments.length && <div className="message-files">{message.attachments.map((file) => <span key={file.id}><Paperclip size={12} />{file.name}</span>)}</div>}
              </div>
            </article>
          ))}
          {sending && <article className="message assistant thinking"><div className="message-avatar"><NexusMark compact /></div><div><div className="message-meta">Nexus Council</div>{streamed?.conversationId === activeId && streamed.text ? <div className="message-content">{streamed.text}</div> : <div className="thinking-line"><i /><i /><i /><span>Comparing perspectives</span></div>}</div></article>}
        </div>

        <section className="composer-shell" aria-label="Message composer">
          {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss"><X size={14} /></button></div>}
          {!!attachments.length && <div className="attachment-row">{attachments.map((file) => (
            <span key={file.id}><FilePlus2 size={13} />{file.name}<button aria-label={`Remove ${file.name}`} onClick={() => setAttachments((items) => items.filter((item) => item.id !== file.id))}><X size={12} /></button></span>
          ))}</div>}
          <div className="composer">
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask, build, investigate…" rows={2}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send()
                }
              }} />
            <div className="composer-tools">
              <button className="icon-button" onClick={() => void addFiles()} aria-label="Attach files"><Paperclip size={18} /></button>
              <button className="mode-switch" onClick={() => setMode(mode === 'solo' ? 'council' : 'solo')}>
                {mode === 'council' ? <Users size={15} /> : <Bot size={15} />}{mode === 'council' ? 'Council' : 'Solo'}<ChevronDown size={13} />
              </button>
              <div className="spacer" />
              <span className="file-count">{attachments.length}/10</span>
              <button className="send-button" onClick={() => void send()} disabled={!draft.trim() || !primaryModel || sending} aria-label="Send message"><Send size={17} /></button>
            </div>
          </div>
          <p className="composer-note">Nexus can make mistakes. Review consequential actions.</p>
        </section>
      </main>

      {inspectorOpen && <Inspector
        models={textModels} primary={primaryModel} secondary={secondaryModel} mode={mode}
        onModel={chooseModel} jobs={snapshot.jobs} imageModels={imageModels} skills={snapshot.skills}
        onError={setError} onClose={() => setInspectorOpen(false)}
      />}

      {settingsOpen && <Connections snapshot={snapshot} onClose={() => setSettingsOpen(false)} onError={setError} />}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} actions={[
        ['New Council thread', () => void createConversation('council')],
        ['New solo thread', () => void createConversation('solo')],
        ['Add files', () => void addFiles()],
        ['Open connections', () => setSettingsOpen(true)],
        ['Call agent', () => setCallOpen(true)]
      ]} />}
      {callOpen && <CallPanel models={realtimeModels} onClose={() => setCallOpen(false)} onError={setError} />}
    </div>
  )
}

function Welcome({ onPrompt }: { onPrompt: (value: string) => void }): React.JSX.Element {
  return <div className="welcome">
    <div className="council-orbit"><span /><span /><NexusMark /></div>
    <p className="eyebrow">Nexus Council is ready</p>
    <h2>Bring the difficult part.</h2>
    <p>Two frontier models can draft independently, challenge each other, and return one answer you can act on.</p>
    <div className="prompt-grid">
      {['Compare two approaches to a decision', 'Research a topic with cited sources', 'Review a document from both perspectives', 'Plan a project and challenge the assumptions'].map((prompt) => (
        <button key={prompt} onClick={() => onPrompt(prompt)}>{prompt}<span>↗</span></button>
      ))}
    </div>
  </div>
}

function Inspector({ models, primary, secondary, mode, onModel, jobs, imageModels, skills, onError, onClose }: {
  models: Model[]; primary: string; secondary: string; mode: 'solo' | 'council'
  onModel: (id: string, primary: boolean) => void; jobs: AppSnapshot['jobs']; imageModels: Model[]; skills: AppSnapshot['skills']
  onError: (value: string) => void; onClose: () => void
}): React.JSX.Element {
  const [researchQuery, setResearchQuery] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [command, setCommand] = useState('')
  const [terminalOutput, setTerminalOutput] = useState('')
  const [connectorUrl, setConnectorUrl] = useState('')
  const [connectorTools, setConnectorTools] = useState<string[]>([])
  const [skillDescription, setSkillDescription] = useState('')
  const openai = models.filter((model) => model.provider === 'openai')
  const anthropic = models.filter((model) => model.provider === 'anthropic')
  return <aside className="inspector">
    <div className="inspector-head"><div><p className="eyebrow">Session</p><h2>Activity</h2></div><button className="icon-button" onClick={onClose} aria-label="Close activity"><X size={17} /></button></div>
    <section>
      <div className="section-title"><Users size={15} /><span>Model council</span><b>{mode}</b></div>
      <ModelSelect label="Lead" value={primary} models={models} onChange={(id) => onModel(id, true)} />
      {mode === 'council' && <ModelSelect label="Reviewer" value={secondary} models={primary && providerOf(primary) === 'openai' ? anthropic : openai.length ? openai : models.filter((model) => model.id !== primary)} onChange={(id) => onModel(id, false)} />}
    </section>
    <section>
      <div className="section-title"><Search size={15} /><span>Research</span></div>
      <input value={researchQuery} onChange={(event) => setResearchQuery(event.target.value)} placeholder="What should Nexus investigate?" />
      <div className="button-pair">
        <button disabled={!researchQuery.trim()} onClick={() => {
          void window.nexus.startResearch({ conversationId: 'session', query: researchQuery, depth: 'quick' }).catch((reason) => onError(messageOf(reason)))
          setResearchQuery('')
        }}>Quick search</button>
        <button disabled={!researchQuery.trim()} onClick={() => {
          void window.nexus.startResearch({ conversationId: 'session', query: researchQuery, depth: 'deep' }).catch((reason) => onError(messageOf(reason)))
          setResearchQuery('')
        }}><FlaskConical size={13} /> Deep</button>
        <button disabled={!researchQuery.trim()} onClick={() => {
          void window.nexus.startResearch({ conversationId: 'session', query: researchQuery, depth: 'auto' }).catch((reason) => onError(messageOf(reason)))
          setResearchQuery('')
        }}>Auto</button>
      </div>
    </section>
    <section>
      <div className="section-title"><Image size={15} /><span>Image studio</span></div>
      <input value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} placeholder="Describe an image" />
      <button className="wide-button" disabled={!imagePrompt.trim() || !imageModels[0]} onClick={() => {
        void window.nexus.generateImage(imagePrompt, imageModels[0]?.id ?? '').catch((reason) => onError(messageOf(reason)))
        setImagePrompt('')
      }}><Sparkles size={14} /> Generate</button>
    </section>
    <section>
      <div className="section-title"><TerminalSquare size={15} /><span>Command line</span><b>approval</b></div>
      <input value={command} onChange={(event) => setCommand(event.target.value)} placeholder="git status" onKeyDown={(event) => {
        if (event.key === 'Enter' && command.trim()) void window.nexus.runCommand(command).then((result) => setTerminalOutput(result.stdout || result.stderr)).catch((reason) => onError(messageOf(reason)))
      }} />
      {terminalOutput && <pre className="terminal-output">{terminalOutput}</pre>}
    </section>
    <section>
      <div className="section-title"><Settings2 size={15} /><span>macOS controls</span><b>approval</b></div>
      <div className="button-pair system-actions">
        <button onClick={() => void window.nexus.runSystemAction('toggle-dark-mode').catch((reason) => onError(messageOf(reason)))}>Toggle appearance</button>
        <button onClick={() => void window.nexus.runSystemAction('open-app', 'Finder').catch((reason) => onError(messageOf(reason)))}>Open Finder</button>
      </div>
    </section>
    <section>
      <div className="section-title"><Bot size={15} /><span>MCP connector</span><b>HTTPS</b></div>
      <input value={connectorUrl} onChange={(event) => setConnectorUrl(event.target.value)} placeholder="https://server.example/mcp" />
      <button className="wide-button" disabled={!connectorUrl.trim()} onClick={() => {
        void window.nexus.connectMcp({ id: 'remote-session', name: 'Remote MCP', transport: 'http', url: connectorUrl })
          .then((tools) => setConnectorTools(tools.map((tool) => tool.name)))
          .catch((reason) => onError(messageOf(reason)))
      }}>Connect and inspect</button>
      {!!connectorTools.length && <p className="tool-list">{connectorTools.join(' · ')}</p>}
    </section>
    <section>
      <div className="section-title"><Sparkles size={15} /><span>Skills</span><b>{skills.length}</b></div>
      <input value={skillDescription} onChange={(event) => setSkillDescription(event.target.value)} placeholder="Create a skill that…" />
      <button className="wide-button" disabled={!skillDescription.trim() || !primary} onClick={() => {
        void window.nexus.generateSkill(skillDescription, primary)
          .then(() => setSkillDescription(''))
          .catch((reason) => onError(messageOf(reason)))
      }}>Generate safe skill</button>
      {skills.map((skill) => <div className="skill-row" key={skill.id}><span>{skill.name}</span><small>{skill.enabled ? 'enabled' : 'review needed'}</small></div>)}
    </section>
    <section className="job-section">
      <div className="section-title"><Activity size={15} /><span>Tasks</span><b>{jobs.filter((job) => job.status === 'running').length} live</b></div>
      {!jobs.length && <p className="muted">Background work appears here.</p>}
      {jobs.slice().reverse().map((job) => <div className="job" key={job.id}>
        <div><span>{job.label}</span><small>{job.status}</small></div>
        <div className="progress"><i style={{ width: `${job.progress}%` }} /></div>
        {job.result && <details><summary>Open result</summary>{job.kind === 'image' ? <img className="job-image" src={job.result} alt={job.label} /> : <p>{job.result}</p>}</details>}
      </div>)}
    </section>
  </aside>
}

function ModelSelect({ label, value, models, onChange }: { label: string; value: string; models: Model[]; onChange: (value: string) => void }): React.JSX.Element {
  return <label className="model-select"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">Choose model</option>{models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
  </select></label>
}

function Connections({ snapshot, onClose, onError }: { snapshot: AppSnapshot; onClose: () => void; onError: (value: string) => void }): React.JSX.Element {
  const [keys, setKeys] = useState<Record<ProviderId, string>>({ openai: '', anthropic: '' })
  const [busy, setBusy] = useState<ProviderId | ''>('')
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    historyRetentionDays: 0,
    personalizationEnabled: false,
    personalizationNotes: '',
    feedbackEnabled: false
  })
  const [feedbackSummary, setFeedbackSummary] = useState('')
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false)
  const [feedbackPreview, setFeedbackPreview] = useState('')
  useEffect(() => {
    void window.nexus.getPrivacySettings().then(setPrivacy).catch((reason) => onError(messageOf(reason)))
  }, [onError])
  async function savePrivacy(patch: Partial<PrivacySettings>): Promise<void> {
    const next = { ...privacy, ...patch }
    setPrivacy(next)
    try {
      setPrivacy(await window.nexus.updatePrivacySettings(next))
    } catch (reason) {
      onError(messageOf(reason))
    }
  }
  async function connect(provider: ProviderId): Promise<void> {
    setBusy(provider)
    try {
      await window.nexus.saveProviderKey(provider, keys[provider])
      setKeys((current) => ({ ...current, [provider]: '' }))
    } catch (reason) {
      onError(messageOf(reason))
    } finally {
      setBusy('')
    }
  }
  async function refresh(provider: ProviderId): Promise<void> {
    setBusy(provider)
    try {
      await window.nexus.discoverModels(provider)
    } catch (reason) {
      onError(messageOf(reason))
    } finally {
      setBusy('')
    }
  }
  async function remove(provider: ProviderId): Promise<void> {
    setBusy(provider)
    try {
      await window.nexus.removeProviderKey(provider)
    } catch (reason) {
      onError(messageOf(reason))
    } finally {
      setBusy('')
    }
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal connections-modal" onMouseDown={(event) => event.stopPropagation()}>
    <div className="modal-head"><div><p className="eyebrow">Private by design</p><h2>Connect your models</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
    <p className="modal-intro">Keys stay in macOS Keychain. Nexus sends content directly to the provider you choose.</p>
    {(['openai', 'anthropic'] as ProviderId[]).map((provider) => {
      const connected = snapshot.configuredProviders.includes(provider)
      return <div className="provider-card" key={provider}>
        <div className={`provider-glyph ${provider}`}>{provider === 'openai' ? 'O' : 'A'}</div>
        <div className="provider-copy"><h3>{provider === 'openai' ? 'OpenAI' : 'Anthropic'}</h3><p>{connected ? `${snapshot.models.filter((model) => model.provider === provider).length} models available` : 'Add an API key to discover available models.'}</p></div>
        {connected ? <div className="connection-actions"><button className="connected" disabled={busy === provider} onClick={() => void refresh(provider)}>{busy === provider ? 'Checking…' : 'Connected · refresh'}</button><button disabled={busy === provider} onClick={() => void remove(provider)}>Remove</button></div> : <div className="key-entry"><KeyRound size={15} /><input type="password" value={keys[provider]} placeholder={provider === 'openai' ? 'sk-…' : 'sk-ant-…'} onChange={(event) => setKeys((current) => ({ ...current, [provider]: event.target.value }))} /><button disabled={!keys[provider] || busy === provider} onClick={() => void connect(provider)}>{busy === provider ? 'Testing…' : 'Connect'}</button></div>}
      </div>
    })}
    <div className="privacy-note"><span>01</span><div><strong>Local history</strong><p>Chats, files, and permissions remain on this Mac. No Nexus account required.</p></div></div>
    <section className="data-controls" aria-labelledby="local-data-title">
      <div>
        <p className="eyebrow">Local controls</p>
        <h3 id="local-data-title">Your data, on your terms</h3>
      </div>
      <label className="setting-row">
        <span><strong>History retention</strong><small>Expired conversations and their imported files are removed on this Mac.</small></span>
        <select value={privacy.historyRetentionDays} onChange={(event) => void savePrivacy({ historyRetentionDays: Number(event.target.value) as PrivacySettings['historyRetentionDays'] })}>
          <option value={0}>Keep until I delete</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={365}>1 year</option>
        </select>
      </label>
      <label className="setting-row checkbox-row">
        <span><strong>Local personalization</strong><small>Optional notes stay on this Mac and are sent only to the providers you choose with each request.</small></span>
        <input type="checkbox" checked={privacy.personalizationEnabled} onChange={(event) => void savePrivacy({ personalizationEnabled: event.target.checked })} />
      </label>
      {privacy.personalizationEnabled && <div className="personalization-editor">
        <textarea value={privacy.personalizationNotes} maxLength={10_000} placeholder="Preferences Nexus should remember locally…" onChange={(event) => setPrivacy((current) => ({ ...current, personalizationNotes: event.target.value }))} />
        <div><button onClick={() => void savePrivacy({ personalizationNotes: privacy.personalizationNotes })}>Save notes</button><button onClick={() => void savePrivacy({ personalizationNotes: '' })}>Delete notes</button></div>
      </div>}
      <div className="data-actions">
        <button onClick={() => void window.nexus.exportLocalData().catch((reason) => onError(messageOf(reason)))}>Export history & files</button>
        <button className="danger-button" onClick={() => void window.nexus.deleteLocalData().then(onClose).catch((reason) => onError(messageOf(reason)))}>Delete local data</button>
      </div>
    </section>
    <section className="data-controls" aria-labelledby="feedback-title">
      <label className="setting-row checkbox-row">
        <span><strong id="feedback-title">Opt-in feedback packages</strong><small>Nexus creates a file for you to review. It does not upload anything automatically.</small></span>
        <input type="checkbox" checked={privacy.feedbackEnabled} onChange={(event) => void savePrivacy({ feedbackEnabled: event.target.checked })} />
      </label>
      {privacy.feedbackEnabled && <div className="feedback-editor">
        <textarea value={feedbackSummary} maxLength={4_000} placeholder="Describe the bug or idea. Do not include secrets." onChange={(event) => setFeedbackSummary(event.target.value)} />
        <label><input type="checkbox" checked={includeDiagnostics} onChange={(event) => setIncludeDiagnostics(event.target.checked)} /> Include a redacted diagnostic excerpt</label>
        <div className="data-actions">
          <button disabled={feedbackSummary.trim().length < 10} onClick={() => void window.nexus.previewFeedback({ category: 'other', summary: feedbackSummary, includeDiagnostics }).then(setFeedbackPreview).catch((reason) => onError(messageOf(reason)))}>Preview package</button>
          <button disabled={!feedbackPreview} onClick={() => void window.nexus.exportFeedback({ category: 'other', summary: feedbackSummary, includeDiagnostics }).catch((reason) => onError(messageOf(reason)))}>Export reviewed package</button>
        </div>
        {feedbackPreview && <pre className="feedback-preview">{feedbackPreview}</pre>}
        <small>Conversation text, prompts, model responses, file names, and file contents are excluded by default.</small>
      </div>}
    </section>
  </div></div>
}

function CommandPalette({ actions, onClose }: { actions: Array<[string, () => void]>; onClose: () => void }): React.JSX.Element {
  const [query, setQuery] = useState('')
  return <div className="modal-backdrop palette-backdrop" onMouseDown={onClose}><div className="palette" onMouseDown={(event) => event.stopPropagation()}>
    <div className="palette-input"><Command size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type a command…" /><kbd>esc</kbd></div>
    <div className="palette-list">{actions.filter(([label]) => label.toLowerCase().includes(query.toLowerCase())).map(([label, action]) => <button key={label} onClick={() => { action(); onClose() }}>{label}<span>↵</span></button>)}</div>
  </div></div>
}

function CallPanel({ models, onClose, onError }: { models: Model[]; onClose: () => void; onError: (value: string) => void }): React.JSX.Element {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [saveTranscript, setSaveTranscript] = useState(false)
  const [model, setModel] = useState(models[0]?.id ?? '')
  const [elapsed, setElapsed] = useState(0)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (!connected) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [connected])
  useEffect(() => () => {
    peerRef.current?.close()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])
  async function start(): Promise<void> {
    if (!model) return
    setConnecting(true)
    try {
      const session = await window.nexus.createRealtimeSession(model)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      streamRef.current = stream
      const peer = new RTCPeerConnection()
      peerRef.current = peer
      stream.getTracks().forEach((track) => peer.addTrack(track, stream))
      peer.ontrack = (event) => {
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = event.streams[0]
      }
      const channel = peer.createDataChannel('oai-events')
      channel.addEventListener('open', () => channel.send(JSON.stringify({
        type: 'session.update',
        session: { instructions: 'You are Nexus. Be concise, ask one clarification when needed, and never claim an action was taken unless a tool result confirms it.' }
      })))
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      const response = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.clientSecret}`, 'Content-Type': 'application/sdp' },
        body: offer.sdp
      })
      if (!response.ok) throw new Error((await response.text()) || 'Realtime connection failed.')
      await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() })
      if (saveTranscript) {
        const recorder = new MediaRecorder(stream)
        chunksRef.current = []
        recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
        recorder.start(1000)
        recorderRef.current = recorder
      }
      setConnected(true)
      setElapsed(0)
    } catch (reason) {
      peerRef.current?.close()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      onError(messageOf(reason))
    } finally {
      setConnecting(false)
    }
  }
  async function stop(): Promise<void> {
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') {
      await new Promise<void>((resolve) => {
        recorder.addEventListener('stop', () => resolve(), { once: true })
        recorder.stop()
      })
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      await window.nexus.saveRecording(new Uint8Array(await blob.arrayBuffer()), recorder.mimeType)
    }
    peerRef.current?.close()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    peerRef.current = null
    streamRef.current = null
    recorderRef.current = null
    setConnected(false)
  }
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal call-panel" onMouseDown={(event) => event.stopPropagation()}>
    <audio ref={remoteAudioRef} autoPlay />
    <button className="icon-button call-close" onClick={() => { if (connected) void stop(); onClose() }} aria-label="Close call"><X size={18} /></button>
    <div className="call-orbit"><NexusMark /><i /><i /></div>
    <p className="eyebrow">{connected ? 'Live session' : 'Voice workspace'}</p>
    <h2>{connected ? formatDuration(elapsed) : 'Call Nexus'}</h2>
    <p>{connected ? 'Listening through a short-lived realtime connection.' : 'Speak naturally with an account-supported OpenAI realtime model.'}</p>
    {!connected && <div className="call-options">
      <select value={model} onChange={(event) => setModel(event.target.value)}><option value="">Choose a realtime model</option>{models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <label><input type="checkbox" checked={saveTranscript} onChange={(event) => setSaveTranscript(event.target.checked)} /> Record my microphone and create a transcript</label>
    </div>}
    <div className={connected ? 'wave active' : 'wave'}>{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 40}ms` }} />)}</div>
    <div className="call-actions"><button className={connected ? 'record-button active' : 'record-button'} disabled={connecting || (!connected && !model)} onClick={() => void (connected ? stop() : start())}>{connected ? <CircleStop size={22} /> : <Mic size={22} />}</button><span>{connecting ? 'Connecting…' : connected ? 'End call' : 'Start call'}</span></div>
  </div></div>
}

function NexusMark({ compact = false }: { compact?: boolean }): React.JSX.Element {
  return <span className={compact ? 'nexus-mark compact' : 'nexus-mark'} aria-hidden="true"><i /><i /></span>
}

function providerOf(model: string): ProviderId | '' {
  if (!model) return ''
  return model.toLowerCase().includes('claude') ? 'anthropic' : 'openai'
}
function messageOf(reason: unknown): string {
  const value = reason instanceof Error ? reason.message : String(reason)
  return value.replace(/^Error invoking remote method '[^']+': Error: /, '')
}
function relativeTime(value: string): string {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)
  return days < 1 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d`
}
function timeOnly(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDuration(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
