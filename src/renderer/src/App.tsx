import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, Archive, ArchiveRestore, ArrowRight, Bot, ChevronDown, FilePlus2,
  KeyRound, Menu, Mic, Moon, Paperclip, Pin, PinOff, Plus, Send, ShieldCheck,
  Sparkles, Sun, Trash2, Users, X
} from 'lucide-react'
import type {
  AppSnapshot, Attachment, Conversation, Model, NexusApi, ReasoningEffort
} from '../../shared/contracts'
import { defaultModelForCapability } from '../../shared/models'
import { ContextInspector } from './components/ContextInspector'
import { CallPanel, CommandPalette, Connections, WorkflowEditor } from './components/Dialogs'
import { NexusMark } from './components/NexusMark'
import { DiagnosticsSurface, PreferenceStudio, WorkflowLibrary } from './components/WorkspaceSurfaces'
import { messageOf } from './errors'
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
  const [primaryReasoning, setPrimaryReasoning] = useState<ReasoningEffort | undefined>()
  const [secondaryReasoning, setSecondaryReasoning] = useState<ReasoningEffort | undefined>()
  const [reasoningMode, setReasoningMode] = useState<'standard' | 'pro'>('standard')
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
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null)
  const [mainView, setMainView] = useState<MainView>('work')
  const [workflow, setWorkflow] = useState<WorkflowDraft | null>(null)
  const [preferences, setPreferences] = useState<WorkspacePreferences>(() => loadPreferences())
  const [inspectorOpen, setInspectorOpen] = useState(() => loadPreferences().inspectorDefault === 'open')
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('nexus.theme') === 'light' ? 'light' : 'dark')
  const [online, setOnline] = useState(() => navigator.onLine)
  const scrollRef = useRef<HTMLDivElement>(null)

  const currentSnapshot = snapshot ?? EMPTY
  const active = currentSnapshot.conversations.find((item) => item.id === activeId)
  const visibleConversations = currentSnapshot.conversations.filter((item) => !item.archived)
  const archivedConversations = currentSnapshot.conversations.filter((item) => item.archived)
  const textModels = useMemo(() => {
    const capable = currentSnapshot.models.filter((model) => model.capabilities.includes('text'))
    const preferred = defaultModelForCapability(capable, 'text', 'openai')
    return preferred ? [preferred, ...capable.filter((model) => model.id !== preferred.id)] : capable
  }, [currentSnapshot.models])
  const imageModels = useMemo(() => {
    const capable = currentSnapshot.models.filter((model) => model.capabilities.includes('image'))
    const preferred = defaultModelForCapability(capable, 'image', 'openai')
    return preferred ? [preferred, ...capable.filter((model) => model.id !== preferred.id)] : capable
  }, [currentSnapshot.models])
  const realtimeModels = useMemo(() => {
    const capable = currentSnapshot.models.filter((model) => model.provider === 'openai' && model.capabilities.includes('realtime'))
    const preferred = defaultModelForCapability(capable, 'realtime', 'openai')
    return preferred ? [preferred, ...capable.filter((model) => model.id !== preferred.id)] : capable
  }, [currentSnapshot.models])

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
    const firstVisible = currentSnapshot.conversations.find((item) => !item.archived)
    if (!activeId && firstVisible) setActiveId(firstVisible.id)
    const selectedPrimary = textModels.find((model) => model.id === primaryModel)
    if (!selectedPrimary) {
      setPrimaryModel(textModels[0]?.id ?? '')
      return
    }
    if (selectedPrimary.reasoningEfforts?.length && !selectedPrimary.reasoningEfforts.includes(primaryReasoning ?? 'none')) {
      setPrimaryReasoning(defaultReasoning(selectedPrimary))
    } else if (!selectedPrimary.reasoningEfforts?.length && primaryReasoning) {
      setPrimaryReasoning(undefined)
    }
    const selectedSecondary = textModels.find((model) => model.id === secondaryModel)
    if (!selectedSecondary || selectedSecondary.provider === selectedPrimary.provider) {
      const other = textModels.find((model) => model.provider !== selectedPrimary.provider)
      setSecondaryModel(other?.id ?? '')
      setSecondaryReasoning(defaultReasoning(other))
    } else if (selectedSecondary.reasoningEfforts?.length && !selectedSecondary.reasoningEfforts.includes(secondaryReasoning ?? 'none')) {
      setSecondaryReasoning(defaultReasoning(selectedSecondary))
    } else if (!selectedSecondary.reasoningEfforts?.length && secondaryReasoning) {
      setSecondaryReasoning(undefined)
    }
  }, [
    activeId,
    currentSnapshot.conversations,
    primaryModel,
    primaryReasoning,
    secondaryModel,
    secondaryReasoning,
    textModels
  ])

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

  async function chooseWorkflow(definition: WorkflowDefinition): Promise<void> {
    const next = configureWorkflow(definition.id)
    const conversation = await createConversation(next.mode)
    if (!conversation) return
    setWorkflow(next)
    setMode(next.mode)
    setDraft(next.instruction)
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
      setAttachments([])
      setWorkflow(null)
      setMainView('work')
      return conversation
    } catch (reason) {
      setError(messageOf(reason))
      return null
    }
  }

  async function send(): Promise<void> {
    if (!draft.trim() || !primaryModel || sending) return
    if (mode === 'council' && !councilReady) {
      setError('Council mode needs one connected OpenAI model and one connected Anthropic model.')
      return
    }
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
        primaryReasoningEffort: primaryReasoning,
        secondaryReasoningEffort: mode === 'council' ? secondaryReasoning : undefined,
        reasoningMode: reasoningModeAvailable ? reasoningMode : undefined,
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
      setPrimaryReasoning(defaultReasoning(textModels.find((model) => model.id === id)))
      const provider = textModels.find((model) => model.id === id)?.provider
      const challenger = textModels.find((model) => model.provider !== provider)
      setSecondaryModel(challenger?.id ?? '')
      setSecondaryReasoning(defaultReasoning(challenger))
    } else {
      setSecondaryModel(id)
      setSecondaryReasoning(defaultReasoning(textModels.find((model) => model.id === id)))
    }
  }

  function openWork(conversation: Conversation): void {
    setActiveId(conversation.id)
    setMode(conversation.mode)
    setDraft('')
    setAttachments([])
    setWorkflow(null)
    setMainView('work')
  }

  async function togglePinned(conversation: Conversation): Promise<void> {
    try {
      await nexusApi.setConversationPinned(conversation.id, !conversation.pinned)
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  async function toggleArchived(conversation: Conversation): Promise<void> {
    try {
      await nexusApi.setConversationArchived(conversation.id, !conversation.archived)
      if (conversation.id === activeId) setActiveId('')
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  async function removeConversation(conversation: Conversation): Promise<void> {
    try {
      await nexusApi.deleteConversation(conversation.id)
      if (conversation.id === activeId) setActiveId('')
      setConversationToDelete(null)
    } catch (reason) {
      setError(messageOf(reason))
    }
  }

  const primaryProvider = textModels.find((model) => model.id === primaryModel)?.provider
  const secondaryProvider = textModels.find((model) => model.id === secondaryModel)?.provider
  const councilReady = Boolean(primaryModel && secondaryModel && primaryModel !== secondaryModel && primaryProvider !== secondaryProvider)
  const reasoningModeAvailable = Boolean(
    textModels.find((model) => model.id === primaryModel)?.reasoningModes?.length
    || (mode === 'council' && textModels.find((model) => model.id === secondaryModel)?.reasoningModes?.length)
  )

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
      <div className="brand"><NexusMark /><span><strong>Nexus</strong><small>Think with two models</small></span><button className="icon-button sidebar-menu" aria-label="Open commands" onClick={() => setPaletteOpen(true)}><Menu size={17} /></button></div>
      <button className="new-work" onClick={() => setLibraryOpen(true)}><Plus size={16} /><span>New conversation</span><kbd>⌘N</kbd></button>
      <div className="sidebar-label history-label">Conversations</div>
      <nav className="work-list" aria-label="Local work history">
        {visibleConversations.map((conversation) => <HistoryRow
          key={conversation.id}
          conversation={conversation}
          active={conversation.id === activeId && mainView === 'work'}
          onOpen={openWork}
          onPin={(item) => void togglePinned(item)}
          onArchive={(item) => void toggleArchived(item)}
          onDelete={setConversationToDelete}
        />)}
        {!visibleConversations.length && snapshot ? <p className="empty-sidebar">No conversations yet.</p> : null}
        {archivedConversations.length ? <details className="archived-history">
          <summary>Archived <span>{archivedConversations.length}</span></summary>
          <div>{archivedConversations.map((conversation) => <HistoryRow
            key={conversation.id}
            conversation={conversation}
            active={false}
            onOpen={openWork}
            onPin={(item) => void togglePinned(item)}
            onArchive={(item) => void toggleArchived(item)}
            onDelete={setConversationToDelete}
          />)}</div>
        </details> : null}
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
        <div><p className="eyebrow">{mainView === 'work' ? (workflow?.title ?? 'Conversation') : mainView === 'preferences' ? 'Appearance' : 'Diagnostics'}</p><h1>{mainView === 'work' ? (active?.title ?? 'New conversation') : mainView === 'preferences' ? 'Make Nexus feel like yours' : 'Check your setup'}</h1></div>
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
          <ModelControls
            models={textModels}
            mode={mode}
            primary={primaryModel}
            secondary={secondaryModel}
            primaryReasoning={primaryReasoning}
            secondaryReasoning={secondaryReasoning}
            reasoningMode={reasoningMode}
            onPrimary={(id) => chooseModel(id, true)}
            onSecondary={(id) => chooseModel(id, false)}
            onPrimaryReasoning={setPrimaryReasoning}
            onSecondaryReasoning={setSecondaryReasoning}
            onReasoningMode={setReasoningMode}
            onConnect={() => setSettingsOpen(true)}
          />
          {workflow ? <div className="workflow-strip"><div><Sparkles size={14} /><span><strong>{workflow.title}</strong>{workflow.context.join(' · ')}</span></div><button onClick={() => setEditorOpen(true)}>Edit method</button><button aria-label="Clear workflow" onClick={() => setWorkflow(null)}><X size={13} /></button></div> : null}
          {attachments.length ? <div className="attachment-row">{attachments.map((file) => <span key={file.id}><FilePlus2 size={13} />{file.name}<button aria-label={`Remove ${file.name}`} onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}><X size={12} /></button></span>)}</div> : null}
          <div className="composer">
            <div className="composer-rail" aria-hidden="true"><i /><i /><b /></div><label htmlFor="working-brief">Message</label>
            <textarea id="working-brief" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What would you like to work through?" rows={workflow ? 5 : 3} onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                void send()
              }
            }} />
            <div className="composer-tools"><button className="icon-button" onClick={() => void addFiles()} aria-label="Attach local files"><Paperclip size={18} /></button><button className="mode-switch" onClick={() => setMode(mode === 'solo' ? 'council' : 'solo')}>{mode === 'council' ? <Users size={15} /> : <Bot size={15} />}{mode === 'council' ? 'Council' : 'Solo'}<ChevronDown size={13} /></button><span className="composer-safety">{mode === 'council' ? (councilReady ? 'Two perspectives, one answer' : 'Connect OpenAI and Anthropic') : 'One model answers directly'}</span><div className="spacer" /><span className="file-count">{attachments.length}/10</span><button className="send-button" onClick={() => void send()} disabled={!draft.trim() || !primaryModel || sending || (mode === 'council' && !councilReady)}><span>{sending ? 'Working' : 'Send'}</span><Send size={16} /></button></div>
          </div>
          <p className="composer-note">⌘ Enter sends · consequential actions still ask for approval</p>
        </section>
      </> : null}
    </main>

    {inspectorOpen && mainView === 'work' ? <ContextInspector api={nexusApi} platform={currentSnapshot.platform} workflow={workflow} jobs={currentSnapshot.jobs} imageModels={imageModels} onError={setError} onClose={() => setInspectorOpen(false)} /> : null}
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
    {conversationToDelete ? <div className="modal-backdrop" onMouseDown={() => setConversationToDelete(null)}><div className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-conversation-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><p className="eyebrow">Delete local history</p><h2 id="delete-conversation-title">Delete this conversation?</h2></div></div><p className="modal-intro">“{conversationToDelete.title}” and its local messages will be permanently removed.</p><div className="modal-actions"><button onClick={() => setConversationToDelete(null)}>Cancel</button><button className="danger-button" onClick={() => void removeConversation(conversationToDelete)}>Delete conversation</button></div></div></div> : null}
  </div>
}

function HistoryRow({ conversation, active, onOpen, onPin, onArchive, onDelete }: {
  conversation: Conversation
  active: boolean
  onOpen: (conversation: Conversation) => void
  onPin: (conversation: Conversation) => void
  onArchive: (conversation: Conversation) => void
  onDelete: (conversation: Conversation) => void
}): React.JSX.Element {
  return <div className={active ? 'history-row active' : 'history-row'}>
    <button className="work-item" onClick={() => onOpen(conversation)}>
      <span className="work-mode">{conversation.mode === 'council' ? <Users size={14} /> : <Bot size={14} />}</span>
      <span>{conversation.title}</span>
      {conversation.pinned ? <Pin size={12} aria-label="Pinned" /> : <time>{relativeTime(conversation.updatedAt)}</time>}
    </button>
    <div className="history-actions">
      {!conversation.archived ? <button onClick={() => onPin(conversation)} aria-label={conversation.pinned ? `Unpin ${conversation.title}` : `Pin ${conversation.title}`}>{conversation.pinned ? <PinOff size={13} /> : <Pin size={13} />}</button> : null}
      <button onClick={() => onArchive(conversation)} aria-label={conversation.archived ? `Restore ${conversation.title}` : `Archive ${conversation.title}`}>{conversation.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}</button>
      <button onClick={() => onDelete(conversation)} aria-label={`Delete ${conversation.title}`}><Trash2 size={13} /></button>
    </div>
  </div>
}

function ModelControls({ models, mode, primary, secondary, primaryReasoning, secondaryReasoning, reasoningMode, onPrimary, onSecondary, onPrimaryReasoning, onSecondaryReasoning, onReasoningMode, onConnect }: {
  models: Model[]
  mode: 'solo' | 'council'
  primary: string
  secondary: string
  primaryReasoning?: ReasoningEffort
  secondaryReasoning?: ReasoningEffort
  reasoningMode: 'standard' | 'pro'
  onPrimary: (id: string) => void
  onSecondary: (id: string) => void
  onPrimaryReasoning: (effort: ReasoningEffort | undefined) => void
  onSecondaryReasoning: (effort: ReasoningEffort | undefined) => void
  onReasoningMode: (mode: 'standard' | 'pro') => void
  onConnect: () => void
}): React.JSX.Element {
  const lead = models.find((model) => model.id === primary)
  const challenger = models.find((model) => model.id === secondary)
  const challengerModels = models.filter((model) => model.provider !== lead?.provider)
  const proSupported = lead?.reasoningModes?.includes('pro') || challenger?.reasoningModes?.includes('pro')

  if (!models.length) {
    return <div className="model-controls empty-models"><span>Connect a provider to choose models.</span><button onClick={onConnect}>Connect providers</button></div>
  }

  return <section className="model-controls" aria-label="Conversation models">
    <SeatModelControl label="Lead" model={lead} models={models} value={primary} reasoning={primaryReasoning} onModel={onPrimary} onReasoning={onPrimaryReasoning} />
    {mode === 'council' ? <SeatModelControl label="Challenger" model={challenger} models={challengerModels} value={secondary} reasoning={secondaryReasoning} onModel={onSecondary} onReasoning={onSecondaryReasoning} /> : null}
    {proSupported ? <label className="reasoning-mode-control"><span>Mode</span><select value={reasoningMode} onChange={(event) => onReasoningMode(event.target.value as 'standard' | 'pro')}><option value="standard">Standard</option><option value="pro">Pro</option></select></label> : null}
  </section>
}

function SeatModelControl({ label, model, models, value, reasoning, onModel, onReasoning }: {
  label: string
  model?: Model
  models: Model[]
  value: string
  reasoning?: ReasoningEffort
  onModel: (id: string) => void
  onReasoning: (effort: ReasoningEffort | undefined) => void
}): React.JSX.Element {
  return <div className="seat-control">
    <label><span>{label}</span><select aria-label={`${label} model`} value={value} onChange={(event) => onModel(event.target.value)}><option value="">Choose model</option>{models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <div className="model-facts"><span>{model?.provider === 'openai' ? 'OpenAI' : model?.provider === 'anthropic' ? 'Anthropic' : 'Not selected'}</span>{model?.contextWindow ? <span>{formatTokens(model.contextWindow)} context</span> : null}</div>
    {model?.reasoningEfforts?.length ? <label className="reasoning-control"><span>Thinking</span><select aria-label={`${label} reasoning effort`} value={reasoning ?? defaultReasoning(model)} onChange={(event) => onReasoning(event.target.value as ReasoningEffort)}>{model.reasoningEfforts.map((effort) => <option key={effort} value={effort}>{effort === 'xhigh' ? 'Extra high' : effort[0].toUpperCase() + effort.slice(1)}</option>)}</select></label> : null}
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
    <p className="eyebrow">OpenAI and Anthropic, together</p><h2 id="welcome-title">Start with a question.</h2><p>Use one model for a quick answer, or let two models challenge each other before Nexus responds.</p>
    <div className="welcome-actions"><button className="primary-action" onClick={onBrowse}>Start with a workflow <ArrowRight size={16} /></button>{configuredProviders < 2 ? <button className="secondary-action" onClick={onConnect}>Connect providers</button> : null}</div>
    {showSuggestions ? <div className="suggestion-row" aria-label="Suggested workflows">{WORKFLOWS.slice(0, 3).map((item) => <button key={item.id} onClick={() => onWorkflow(item)}><span>{item.shortLabel}</span><small>{item.description}</small></button>)}</div> : null}
  </section>
}

function LoadingWorkspace(): React.JSX.Element {
  return <div className="state-surface loading-state" role="status"><div className="loading-rail"><i /><i /><b /></div><p className="eyebrow">Opening Nexus</p><h2>Loading your conversations…</h2><p>Reading local history and available models from this device.</p></div>
}

function LoadFailure({ message, onRetry }: { message: string; onRetry: () => void }): React.JSX.Element {
  return <div className="state-surface failure-state" role="alert"><p className="eyebrow">Workspace unavailable</p><h2>Local data could not be opened.</h2><p>{message}</p><button className="primary-action" onClick={onRetry}>Try again</button></div>
}

function defaultReasoning(model?: Model): ReasoningEffort | undefined {
  if (!model?.reasoningEfforts?.length) return undefined
  return model.reasoningEfforts.includes('high') ? 'high' : model.reasoningEfforts[0]
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`
  return `${Math.round(tokens / 1_000)}K`
}

function relativeTime(value: string): string {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000)
  return days < 1 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d`
}

function timeOnly(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
