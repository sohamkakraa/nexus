import { useEffect, useRef, useState } from 'react'
import { CircleStop, Command, KeyRound, Mic, ShieldCheck, X } from 'lucide-react'
import type {
  AppSnapshot,
  Model,
  NexusApi,
  PrivacySettings,
  ProviderId
} from '../../../shared/contracts'
import type { WorkflowDraft } from '../workflows'
import { NexusMark } from './NexusMark'

export function WorkflowEditor({ workflow, onSave, onClose }: {
  workflow: WorkflowDraft
  onSave: (workflow: WorkflowDraft) => void
  onClose: () => void
}): React.JSX.Element {
  const [title, setTitle] = useState(workflow.title)
  const [mode, setMode] = useState(workflow.mode)
  const [instruction, setInstruction] = useState(workflow.instruction)
  const [context, setContext] = useState(workflow.context.join(', '))
  const dialogRef = useDialogFocus(onClose)
  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div ref={dialogRef} className="modal editor-modal" role="dialog" aria-modal="true" aria-labelledby="workflow-editor-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head">
        <div><p className="eyebrow">Editable setup</p><h2 id="workflow-editor-title">Tune the working method</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close workflow editor"><X size={18} /></button>
      </div>
      <div className="editor-fields">
        <label>Workflow name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>Council shape<select value={mode} onChange={(event) => setMode(event.target.value as 'solo' | 'council')}><option value="council">Council · lead and challenger</option><option value="solo">Solo · lead only</option></select></label>
        <label>Working instructions<textarea rows={8} value={instruction} onChange={(event) => setInstruction(event.target.value)} /></label>
        <label>Context labels<input value={context} onChange={(event) => setContext(event.target.value)} /></label>
        <p><ShieldCheck size={14} /> Saving only updates this local brief. It does not run a tool or contact a provider.</p>
      </div>
      <div className="modal-actions">
        <button onClick={onClose}>Cancel</button>
        <button className="primary-action" disabled={!title.trim() || !instruction.trim()} onClick={() => onSave({
          ...workflow,
          title: title.trim(),
          mode,
          instruction,
          context: context.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 8)
        })}>Save method</button>
      </div>
    </div>
  </div>
}

export function Connections({ api, snapshot, onClose, onError }: {
  api: NexusApi
  snapshot: AppSnapshot
  onClose: () => void
  onError: (value: string) => void
}): React.JSX.Element {
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
  const [connectionError, setConnectionError] = useState('')
  const dialogRef = useDialogFocus(onClose)
  const reportError = (reason: unknown): void => {
    const message = messageOf(reason)
    setConnectionError(message)
    onError(message)
  }

  useEffect(() => {
    void api.getPrivacySettings().then(setPrivacy).catch(reportError)
  }, [api, onError])

  async function savePrivacy(patch: Partial<PrivacySettings>): Promise<void> {
    const next = { ...privacy, ...patch }
    setPrivacy(next)
    try {
      setPrivacy(await api.updatePrivacySettings(next))
    } catch (reason) {
      reportError(reason)
    }
  }

  async function connect(provider: ProviderId): Promise<void> {
    setBusy(provider)
    try {
      await api.saveProviderKey(provider, keys[provider])
      setKeys((current) => ({ ...current, [provider]: '' }))
    } catch (reason) {
      reportError(reason)
    } finally {
      setBusy('')
    }
  }

  async function refresh(provider: ProviderId): Promise<void> {
    setBusy(provider)
    try {
      await api.discoverModels(provider)
    } catch (reason) {
      reportError(reason)
    } finally {
      setBusy('')
    }
  }

  async function remove(provider: ProviderId): Promise<void> {
    setBusy(provider)
    try {
      await api.removeProviderKey(provider)
    } catch (reason) {
      reportError(reason)
    } finally {
      setBusy('')
    }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}>
    <div ref={dialogRef} className="modal connections-modal" role="dialog" aria-modal="true" aria-labelledby="connections-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head">
        <div><p className="eyebrow">Bring your own models</p><h2 id="connections-title">Connections</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close connections"><X size={18} /></button>
      </div>
      <p className="modal-intro">Keys are stored in {snapshot.platform.credentialStore}. Connecting checks the provider’s model list; it does not make a generation request.</p>
      {connectionError ? <div className="modal-error" role="alert">{connectionError}<button onClick={() => setConnectionError('')} aria-label="Dismiss connection error"><X size={13} /></button></div> : null}
      {(['openai', 'anthropic'] as ProviderId[]).map((provider) => {
        const connected = snapshot.configuredProviders.includes(provider)
        return <div className="provider-card" key={provider}>
          <div className={`provider-glyph ${provider}`}>{provider === 'openai' ? 'O' : 'A'}</div>
          <div className="provider-copy">
            <h3>{provider === 'openai' ? 'OpenAI' : 'Anthropic'}</h3>
            <p>{connected ? `${snapshot.models.filter((model) => model.provider === provider).length} models mapped` : 'Add an API key to discover available models.'}</p>
          </div>
          {connected
            ? <div className="connection-actions">
                <button className="connected" disabled={busy === provider} onClick={() => void refresh(provider)}>{busy === provider ? 'Checking…' : 'Connected · refresh'}</button>
                <button disabled={busy === provider} onClick={() => void remove(provider)}>Remove</button>
              </div>
            : <div className="key-entry"><KeyRound size={15} /><input aria-label={`${provider} API key`} type="password" value={keys[provider]} placeholder={provider === 'openai' ? 'sk-…' : 'sk-ant-…'} onChange={(event) => setKeys((current) => ({ ...current, [provider]: event.target.value }))} /><button disabled={!keys[provider] || busy === provider} onClick={() => void connect(provider)}>{busy === provider ? 'Checking…' : 'Connect'}</button></div>}
        </div>
      })}
      <div className="privacy-note"><ShieldCheck size={17} /><div><strong>What stays local</strong><p>Work, imported files, preferences, and permission decisions remain on this device. Only requests you run go to the connection you choose.</p></div></div>
      <details className="connection-advanced">
        <summary>Local data, personalization, and feedback</summary>
        <section className="data-controls" aria-labelledby="local-data-title">
        <div>
          <p className="eyebrow">Local controls</p>
          <h3 id="local-data-title">Your data, on your terms</h3>
        </div>
        <label className="setting-row">
          <span><strong>History retention</strong><small>Expired work and its imported files are removed from this device.</small></span>
          <select value={privacy.historyRetentionDays} onChange={(event) => void savePrivacy({ historyRetentionDays: Number(event.target.value) as PrivacySettings['historyRetentionDays'] })}>
            <option value={0}>Keep until I delete</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
        </label>
        <label className="setting-row checkbox-row">
          <span><strong>Local personalization</strong><small>Optional notes stay on this device and go only to providers used for a request.</small></span>
          <input type="checkbox" checked={privacy.personalizationEnabled} onChange={(event) => void savePrivacy({ personalizationEnabled: event.target.checked })} />
        </label>
        {privacy.personalizationEnabled ? <div className="personalization-editor">
          <textarea value={privacy.personalizationNotes} maxLength={10_000} placeholder="Preferences Nexus should remember locally…" onChange={(event) => setPrivacy((current) => ({ ...current, personalizationNotes: event.target.value }))} />
          <div><button onClick={() => void savePrivacy({ personalizationNotes: privacy.personalizationNotes })}>Save notes</button><button onClick={() => void savePrivacy({ personalizationNotes: '' })}>Delete notes</button></div>
        </div> : null}
        <div className="data-actions">
          <button onClick={() => void api.exportLocalData().catch(reportError)}>Export history & files</button>
          <button className="danger-button" onClick={() => void api.deleteLocalData().then(onClose).catch(reportError)}>Delete local data</button>
        </div>
        </section>
        <section className="data-controls" aria-labelledby="feedback-title">
        <label className="setting-row checkbox-row">
          <span><strong id="feedback-title">Opt-in feedback packages</strong><small>Nexus creates a file for review and never uploads it automatically.</small></span>
          <input type="checkbox" checked={privacy.feedbackEnabled} onChange={(event) => void savePrivacy({ feedbackEnabled: event.target.checked })} />
        </label>
        {privacy.feedbackEnabled ? <div className="feedback-editor">
          <textarea value={feedbackSummary} maxLength={4_000} placeholder="Describe the bug or idea. Do not include secrets." onChange={(event) => setFeedbackSummary(event.target.value)} />
          <label><input type="checkbox" checked={includeDiagnostics} onChange={(event) => setIncludeDiagnostics(event.target.checked)} /> Include a redacted diagnostic excerpt</label>
          <div className="data-actions">
            <button disabled={feedbackSummary.trim().length < 10} onClick={() => void api.previewFeedback({ category: 'other', summary: feedbackSummary, includeDiagnostics }).then(setFeedbackPreview).catch(reportError)}>Preview package</button>
            <button disabled={!feedbackPreview} onClick={() => void api.exportFeedback({ category: 'other', summary: feedbackSummary, includeDiagnostics }).catch(reportError)}>Export reviewed package</button>
          </div>
          {feedbackPreview ? <pre className="feedback-preview">{feedbackPreview}</pre> : null}
          <small>Conversation text, prompts, responses, file names, and file contents are excluded by default.</small>
        </div> : null}
        </section>
      </details>
    </div>
  </div>
}

export function CommandPalette({ actions, onClose }: {
  actions: Array<[string, () => void]>
  onClose: () => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const dialogRef = useDialogFocus(onClose)
  return <div className="modal-backdrop palette-backdrop" onMouseDown={onClose}>
    <div ref={dialogRef} className="palette" role="dialog" aria-modal="true" aria-label="Command menu" onMouseDown={(event) => event.stopPropagation()}>
      <div className="palette-input"><Command size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a workspace action…" /><kbd>esc</kbd></div>
      <div className="palette-list">{actions.filter(([label]) => label.toLowerCase().includes(query.toLowerCase())).map(([label, action]) => <button key={label} onClick={() => {
        action()
        onClose()
      }}>{label}<span>↵</span></button>)}</div>
    </div>
  </div>
}

export function CallPanel({ api, models, onClose, onError }: {
  api: NexusApi
  models: Model[]
  onClose: () => void
  onError: (value: string) => void
}): React.JSX.Element {
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
  const [callError, setCallError] = useState('')
  const reportError = (reason: unknown): void => {
    const message = messageOf(reason)
    setCallError(message)
    onError(message)
  }
  const requestClose = (): void => {
    if (connected) void stop().then(onClose).catch(reportError)
    else onClose()
  }
  const dialogRef = useDialogFocus(onClose)

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
      const session = await api.createRealtimeSession(model)
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
        session: { instructions: 'Act as the Nexus lead. Clarify the brief, surface assumptions, and never claim an action without a tool result.' }
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
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunksRef.current.push(event.data)
        }
        recorder.start(1000)
        recorderRef.current = recorder
      }
      setConnected(true)
      setElapsed(0)
    } catch (reason) {
      peerRef.current?.close()
      streamRef.current?.getTracks().forEach((track) => track.stop())
      reportError(reason)
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
      await api.saveRecording(new Uint8Array(await blob.arrayBuffer()), recorder.mimeType)
    }
    peerRef.current?.close()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    peerRef.current = null
    streamRef.current = null
    recorderRef.current = null
    setConnected(false)
  }

  return <div className="modal-backdrop" onMouseDown={requestClose}>
    <div ref={dialogRef} className="modal call-panel" role="dialog" aria-modal="true" aria-labelledby="call-title" onMouseDown={(event) => event.stopPropagation()}>
      <audio ref={remoteAudioRef} autoPlay />
      <button className="icon-button call-close" onClick={requestClose} aria-label="Close voice session"><X size={18} /></button>
      <div className="call-orbit"><NexusMark /><i /><i /></div>
      <p className="eyebrow">{connected ? 'Live voice workspace' : 'Explicit realtime session'}</p>
      <h2 id="call-title">{connected ? formatDuration(elapsed) : 'Talk through the brief'}</h2>
      <p>{connected ? 'Audio is using a short-lived provider connection.' : 'Starting requests microphone access and creates a provider session. Recording remains off unless selected.'}</p>
      {callError ? <div className="modal-error" role="alert">{callError}<button onClick={() => setCallError('')} aria-label="Dismiss voice error"><X size={13} /></button></div> : null}
      {!connected ? <div className="call-options">
        <select aria-label="Realtime model" value={model} onChange={(event) => setModel(event.target.value)}><option value="">Choose a realtime model</option>{models.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
        <label><input type="checkbox" checked={saveTranscript} onChange={(event) => setSaveTranscript(event.target.checked)} /> Save a local recording for transcription</label>
      </div> : null}
      <div className={connected ? 'wave active' : 'wave'}>{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 40}ms` }} />)}</div>
      <div className="call-actions"><button className={connected ? 'record-button active' : 'record-button'} disabled={connecting || (!connected && !model)} onClick={() => void (connected ? stop() : start()).catch(reportError)}>{connected ? <CircleStop size={22} /> : <Mic size={22} />}</button><span>{connecting ? 'Connecting…' : connected ? 'End session' : 'Start voice session'}</span></div>
    </div>
  </div>
}

function useDialogFocus(onClose: () => void): React.RefObject<HTMLDivElement | null> {
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusableSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    const preferred = dialog.querySelector<HTMLElement>('[autofocus]') ?? dialog.querySelector<HTMLElement>(focusableSelector)
    preferred?.focus()
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const items = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [onClose])
  return dialogRef
}

function messageOf(reason: unknown): string {
  const value = reason instanceof Error ? reason.message : String(reason)
  return value.replace(/^Error invoking remote method '[^']+': Error: /, '')
}

function formatDuration(seconds: number): string {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
