import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowRight, Bot, ChevronDown, FilePlus2, KeyRound, Menu,
  Mic, Moon, Paperclip, Plus, Send, ShieldCheck, Sparkles, Sun, Users, X
} from 'lucide-react'
import type { AppSnapshot, Attachment, Conversation, NexusApi } from '../../shared/contracts'
import { ContextInspector } from './components/ContextInspector'
import { CallPanel, CommandPalette, Connections, WorkflowEditor } from './components/Dialogs'
import { NexusMark } from './components/NexusMark'
import { DiagnosticsSurface, PreferenceStudio, WorkflowLibrary } from './components/WorkspaceSurfaces'
import { loadPreferences, resetPreferences, savePreferences, type WorkspacePreferences } from './preferences'
import { configureWorkflow, WORKFLOWS, type WorkflowDefinition, type WorkflowDraft } from './workflows'

const EMPTY: AppSnapshot = {
  conversations: [],
  models: [],
  configuredProviders: [],
  jobs: [],
  skills: [],
  platform: {
    os: 'macos',
    architecture: 'other',
    credentialStore: 'operating system credential store',
    systemControls: false,
    systemControlsMessage: 'Checking platform capabilities…'
  }
}
type MainView = 'work' | 'preferences' | 'diagnostics'
type Theme = 'dark' | 'light'

export function App({ api }: { api?: NexusApi }): React.JSX.Element {
  const nexusApi = useMemo(() => api ?? window.nexus, [api])
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null)
  const [loadError, setLoadError] = useState('')
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
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [callOpen, setCallOpen] = useState(false)
  const [mainView, setMainView] = useState<MainView>('work')
  const [workflow, setWorkflow] = useState<WorkflowDraft | null>(null)
  const [preferences, setPreferences] = useState<WorkspacePreferences>(() => loadPreferences())
  const [inspectorOpen, setInspectorOpen] = useState(() => loadPreferences().inspectorDefault === 'open')
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('nexus.theme') === 'light' ? 'light' : 'dark')
  const [online, setOnline] = useState(() => navigator.onLine)
  const scrollRef = useRef<HTMLDivElement>(null)

  const currentSnapshot = snapshot ?? EMPTY
  const active = currentSnapshot.conversations.find((item) => item.id === activeId)
  const textModels = useMemo(() => currentSnapshot.models.filter((model) => model.capabilities.includes('text')), [currentSnapshot.models])
  const imageModels = useMemo(() => currentSnapshot.models.filter((model) => model.capabilities.includes('image')), [currentSnapshot.models])
  const realtimeModels = useMemo(() => currentSnapshot.models.filter((model) => model.provider === 'openai' && model.capabilities.includes('realtime')), [currentSnapshot.models])

  useEffect(() => {
    let mounted = true
    void nexusApi.getSnapshot().then((value) => {
      if (mounted) {
        setSnapshot(value)
        setLoadError('')
      }
    }).catch((reason) => {
      if (mounted) {
        setSnapshot(EMPTY)
        setLoadError(messageOf(reason))
      }
    })
    const removeSnapshot = nexusApi.onSnapshot((value) => {
      setSnapshot(value)
      setLoadError('')
    })
    const removeDelta = nexusApi.onChatDelta((event) => {
      setStreamed((current) => ({
        conversationId: event.conversationId,
        text: current?.conversationId === event.conversationId ? current.text + event.delta : event.delta
      }))
    })
    return () => {
      mounted = false
      removeSnapshot()
      removeDelta()
    }
  }, [nexusApi])

  useEffect(() => {
    if (!activeId && currentSnapshot.conversations[0]) setActiveId(currentSnapshot.conversations[0].id)
    if (!primaryModel && textModels[0]) setPrimaryModel(textModels[0].id)
    if (!secondaryModel || secondaryModel === primaryModel) {
      const primaryProvider = textModels.find((model) => model.id === primaryModel)?.provider
      const other = textModels.find((model) => model.id !== primaryModel && model.provider !== primaryProvider)
        ?? textModels.find((model) => model.id !== primaryModel)
      if (other) setSecondaryModel(other.id)
    }
  }, [activeId, currentSnapshot.conversations, primaryModel, secondaryModel, textModels])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: preferences.motion === 'reduced' ? 'auto' : 'smooth'
    })
  }, [active?.messages.length, preferences.motion, sending])

  useEffect(() => {
    const goOnline = (): void => setOnline(true)
    const goOffline = (): void => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((value) => !value)
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        setLibraryOpen(true)
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false)
        setLibraryOpen(false)
        setEditorOpen(false)
        setCallOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function chooseWorkflow(definition: WorkflowDefinition): void {
    const next = configureWorkflow(definition.id)
    setWorkflow(next)
    setMode(next.mode)
    setDraft(next.instruction)
    setInspectorOpen(true)
    setMainView('work')
    setLibraryOpen(false)
  }

  function updatePreferences(next: WorkspacePreferences): void {
    savePreferences(next)
    setPreferences(next)
  }

  async function createConversation(nextMode = mode): Promise<Conversation | null> {
    try {
      const conversation = await nexusApi.createConversation(nextMode)
      setActiveId(conversation.id)
      setMode(nextMode)
      setDraft('')
      setMainView('work')
      return conversation
    } catch (reason) {
      setError(messageOf(reason))
      return null
    }
  }

  async function send(): Promise<void> {
    if (!draft.trim() || !primaryModel || sending) return
    setError('')
    setSending(true)
    setStreamed(null)
    let submittedBrief = ''
    try {
      let conversationId = activeId
      if (!conversationId) {
        const conversation = await nexusApi.createConversation(mode)
        conversationId = conversation.id
        setActiveId(conversation.id)
      }
      const content = draft.trim()
      submittedBrief = content
      setDraft('')
      await nexusApi.sendMessage({
        conversationId,
        content,
        mode,
        primaryModel,
        secondaryModel: mode === 'council' ? secondaryModel : undefined,
        attachmentIds: attachments.map((file) => file.id)
      })
      setAttachments([])
    } catch (reason) {
      setError(messageOf(reason))
      setDraft((value) => value || submittedBrief || workflow?.instruction || '')
    } finally {
      setSending(false)
      setStreamed(null)
    }
  }

  async function addFiles(): Promise<void> {
    try {
      const files = await nexusApi.selectFiles()
      setAttachments((current) => [...current, ...files].slice(0, 10))
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  function chooseModel(id: string, primary: boolean): void {
    if (primary) {
      setPrimaryModel(id)
      if (id === secondaryModel) setSecondaryModel(textModels.find((model) => model.id !== id)?.id ?? '')
    } else {
      setSecondaryModel(id)
    }
  }

  function openWork(conversation: Conversation): void {
    setActiveId(conversation.id)
    setMode(conversation.mode)
    setMainView('work')
  }

  const commandActions: Array<[string, () => void]> = [
    ['Open workflow library', () => setLibraryOpen(true)],
    ['New Council work item', () => void createConversation('council')],
    ['New solo work item', () => void createConversation('solo')],
    ['Attach local files', () => void addFiles()],
    ['Open connections', () => setSettingsOpen(true)],
    ['Open workspace choices', () => setMainView('preferences')],
    ['Open self-test', () => setMainView('diagnostics')]
  ]
  if (realtimeModels.length) commandActions.push(['Start voice session', () => setCallOpen(true)])

  return <div className={`app theme-${theme} platform-${currentSnapshot.platform.os}${inspectorOpen && mainView === 'work' ? ' inspector-visible' : ''}`} data-testid="app" data-density={preferences.density} data-accent={preferences.accent} data-emphasis={preferences.emphasis} data-motion={preferences.motion} data-inspector={inspectorOpen && mainView === 'work' ? 'open' : 'closed'}>
    <a className="skip-link" href="#main-content">Skip to workspace</a>
    <aside className="sidebar" aria-label="Nexus navigation">
      <div className="traffic-space" />
      <div className="brand"><NexusMark /><span><strong>Nexus</strong><small>Council workspace</small></span><button className="icon-button sidebar-menu" aria-label="Open commands" onClick={() => setPaletteOpen(true)}><Menu size={17} /></button></div>
      <button className="new-work" onClick={() => setLibraryOpen(true)}><Plus size={16} /><span>New work item</span><kbd>⌘N</kbd></button>
      <div className="sidebar-label history-label">Local work</div>
      <nav className="work-list" aria-label="Local work history">
        {currentSnapshot.conversations.map((conversation) => <button key={conversation.id} className={conversation.id === activeId && mainView === 'work' ? 'work-item active' : 'work-item'} onClick={() => openWork(conversation)}><span className="work-mode">{conversation.mode === 'council' ? <Users size={13} /> : <Bot size={13} />}</span><span>{conversation.title}</span><time>{relativeTime(conversation.updatedAt)}</time></button>)}
        {!currentSnapshot.conversations.length && snapshot ? <p className="empty-sidebar">No saved work yet.</p> : null}
      </nav>
      <div className="sidebar-footer">
        <details className="local-history"><summary><ShieldCheck size={14} /> Stored on this device</summary><p>Work history and permissions stay local. Requests go only to providers and connectors you explicitly use.</p></details>
        <div><button onClick={() => setSettingsOpen(true)}><KeyRound size={15} /> Connections</button><button onClick={() => {
          const next = theme === 'dark' ? 'light' : 'dark'
          setTheme(next)
          localStorage.setItem('nexus.theme', next)
        }} aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} appearance`}>{theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />} {theme === 'dark' ? 'Dark' : 'Light'}</button></div>
      </div>
    </aside>

    <main className="workspace" id="main-content" aria-label="Council workspace">
      <header className="topbar">
        <div><p className="eyebrow">{mainView === 'work' ? (workflow?.title ?? 'Open table') : mainView === 'preferences' ? 'Workspace choices' : 'Local diagnostics'}</p><h1>{mainView === 'work' ? (active?.title ?? 'Untitled work item') : mainView === 'preferences' ? 'Make Nexus fit your work' : 'Check before you rely on it'}</h1></div>
        <div className="top-actions">{!online ? <span className="offline-chip"><i /> Offline</span> : null}{mainView === 'work' ? <>{realtimeModels.length ? <button className="quiet-button" onClick={() => setCallOpen(true)}><Mic size={16} /> Voice</button> : null}<button className="quiet-button" onClick={() => setLibraryOpen(true)}><Sparkles size={16} /> Workflow</button><button className="icon-button" aria-label={inspectorOpen ? 'Hide context inspector' : 'Show context inspector'} onClick={() => setInspectorOpen((value) => !value)}><Activity size={18} /></button></> : null}</div>
      </header>
      {!online ? <div className="offline-banner" role="status"><strong>You are offline.</strong> Local history and workspace choices still work. Provider and connector actions will wait for a connection.</div> : null}
      {mainView === 'preferences' ? <div className="surface-scroll"><PreferenceStudio preferences={preferences} onChange={updatePreferences} onReset={() => {
        const next = resetPreferences()
        setPreferences(next)
        setInspectorOpen(next.inspectorDefault === 'open')
      }} /></div> : null}
      {mainView === 'diagnostics' ? <div className="surface-scroll"><DiagnosticsSurface api={nexusApi} snapshot={currentSnapshot} onOpenConnections={() => setSettingsOpen(true)} onUseConversation={(id) => {
        setActiveId(id)
        setMainView('work')
      }} /></div> : null}
      {mainView === 'work' ? <>
        <div className="conversation" ref={scrollRef} aria-live="polite">
          {!snapshot ? <LoadingWorkspace /> : loadError ? <LoadFailure message={loadError} onRetry={() => {
            setSnapshot(null)
            setLoadError('')
            void nexusApi.getSnapshot().then(setSnapshot).catch((reason) => {
              setSnapshot(EMPTY)
              setLoadError(messageOf(reason))
            })
          }} /> : !active?.messages.length ? <Welcome configuredProviders={currentSnapshot.configuredProviders.length} showSuggestions={preferences.suggestedWorkflows} onWorkflow={chooseWorkflow} onBrowse={() => setLibraryOpen(true)} onConnect={() => setSettingsOpen(true)} /> : <div className="work-ledger">
            <div className="ledger-rule"><span>Working record</span><i /></div>
            {active.messages.map((message) => <article key={message.id} className={`message ${message.role}`}><div className="message-marker">{message.role === 'user' ? <span>You</span> : <NexusMark compact />}</div><div className="message-body"><div className="message-meta"><span>{message.author ?? (message.role === 'user' ? 'Your brief' : 'Council synthesis')}</span><time>{timeOnly(message.createdAt)}</time></div><div className="message-content">{message.content}</div>{message.attachments.length ? <div className="message-files">{message.attachments.map((file) => <span key={file.id}><Paperclip size={12} />{file.name}</span>)}</div> : null}</div></article>)}
            {sending ? <article className="message assistant thinking"><div className="message-marker"><NexusMark compact /></div><div className="message-body"><div className="message-meta"><span>Council synthesis</span></div>{streamed?.conversationId === activeId && streamed.text ? <div className="message-content">{streamed.text}</div> : <div className="merge-progress"><i /><i /><b /><span>{mode === 'council' ? 'Comparing positions' : 'Drafting response'}</span></div>}</div></article> : null}
          </div>}
        </div>
        <section className="composer-shell" aria-label="Brief composition area">
          {error ? <div className="error-banner" role="alert"><span><strong>Action did not complete.</strong>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div> : null}
          {workflow ? <div className="workflow-strip"><div><Sparkles size={14} /><span><strong>{workflow.title}</strong>{workflow.context.join(' · ')}</span></div><button onClick={() => setEditorOpen(true)}>Edit method</button><button aria-label="Clear workflow" onClick={() => setWorkflow(null)}><X size={13} /></button></div> : null}
          {attachments.length ? <div className="attachment-row">{attachments.map((file) => <span key={file.id}><FilePlus2 size={13} />{file.name}<button aria-label={`Remove ${file.name}`} onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}><X size={12} /></button></span>)}</div> : null}
          <div className="composer">
            <div className="composer-rail" aria-hidden="true"><i /><i /><b /></div><label htmlFor="working-brief">Working brief</label>
            <textarea id="working-brief" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Describe the outcome, context, and constraints…" rows={workflow ? 5 : 3} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                void send()
              }
            }} />
            <div className="composer-tools"><button className="icon-button" onClick={() => void addFiles()} aria-label="Attach local files"><Paperclip size={18} /></button><button className="mode-switch" onClick={() => setMode(mode === 'solo' ? 'council' : 'solo')}>{mode === 'council' ? <Users size={15} /> : <Bot size={15} />}{mode === 'council' ? 'Council' : 'Solo'}<ChevronDown size={13} /></button><span className="composer-safety">{mode === 'council' ? 'Two models → one synthesis' : 'Direct lead model'}</span><div className="spacer" /><span className="file-count">{attachments.length}/10</span><button className="send-button" onClick={() => void send()} disabled={!draft.trim() || !primaryModel || sending}><span>{sending ? 'Working' : 'Send brief'}</span><Send size={16} /></button></div>
          </div>
          <p className="composer-note">⌘ Enter sends · consequential actions still ask for approval</p>
        </section>
      </> : null}
    </main>

    {inspectorOpen && mainView === 'work' ? <ContextInspector api={nexusApi} platform={currentSnapshot.platform} models={textModels} primary={primaryModel} secondary={secondaryModel} mode={mode} workflow={workflow} jobs={currentSnapshot.jobs} imageModels={imageModels} badgeStyle={preferences.modelBadges} onModel={chooseModel} onError={setError} onClose={() => setInspectorOpen(false)} /> : null}
    {settingsOpen ? <Connections api={nexusApi} snapshot={currentSnapshot} onClose={() => setSettingsOpen(false)} onError={setError} /> : null}
    {libraryOpen ? <div className="modal-backdrop" onMouseDown={() => setLibraryOpen(false)}><div className="modal workflow-modal" role="dialog" aria-modal="true" aria-label="Workflow library" onMouseDown={(event) => event.stopPropagation()}><WorkflowLibrary onChoose={chooseWorkflow} onClose={() => setLibraryOpen(false)} /></div></div> : null}
    {editorOpen && workflow ? <WorkflowEditor workflow={workflow} onClose={() => setEditorOpen(false)} onSave={(next) => {
      setWorkflow(next)
      setMode(next.mode)
      setDraft(next.instruction)
      setEditorOpen(false)
    }} /> : null}
    {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} actions={commandActions} /> : null}
    {callOpen ? <CallPanel api={nexusApi} models={realtimeModels} onClose={() => setCallOpen(false)} onError={setError} /> : null}
  </div>
}

function Welcome({ configuredProviders, showSuggestions, onWorkflow, onBrowse, onConnect }: {
  configuredProviders: number
  showSuggestions: boolean
  onWorkflow: (workflow: WorkflowDefinition) => void
  onBrowse: () => void
  onConnect: () => void
}): React.JSX.Element {
  return <section className="welcome" aria-labelledby="welcome-title">
    <div className="council-table" aria-label="Two model perspectives converge into one synthesis"><div className="model-position first"><i />Lead perspective</div><div className="model-position second"><i />Challenge perspective</div><div className="convergence" aria-hidden="true"><i /><i /><b /></div><div className="synthesis-position"><NexusMark compact />Synthesis</div></div>
    <p className="eyebrow">A table for difficult work</p><h2 id="welcome-title">Set the table.</h2><p>Give two models a shared brief. One develops the case, one tests it, and Nexus returns one clear synthesis.</p>
    <div className="welcome-actions"><button className="primary-action" onClick={onBrowse}>Choose a workflow <ArrowRight size={16} /></button>{configuredProviders < 1 ? <button className="secondary-action" onClick={onConnect}>Connect models</button> : null}</div>
    {showSuggestions ? <div className="suggestion-row" aria-label="Suggested workflows">{WORKFLOWS.slice(0, 3).map((item) => <button key={item.id} onClick={() => onWorkflow(item)}><span>{item.shortLabel}</span><small>{item.description}</small></button>)}</div> : null}
  </section>
}

function LoadingWorkspace(): React.JSX.Element {
  return <div className="state-surface loading-state" role="status"><div className="loading-rail"><i /><i /><b /></div><p className="eyebrow">Opening local workspace</p><h2>Setting the table…</h2><p>Reading saved work and model capabilities from this device.</p></div>
}

function LoadFailure({ message, onRetry }: { message: string; onRetry: () => void }): React.JSX.Element {
  return <div className="state-surface failure-state" role="alert"><p className="eyebrow">Workspace unavailable</p><h2>Local data could not be opened.</h2><p>{message}</p><button className="primary-action" onClick={onRetry}>Try again</button></div>
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
