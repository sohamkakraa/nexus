import Database from 'better-sqlite3'
import { app } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Attachment, Conversation, Message } from '../shared/contracts'

let db: Database.Database

export function openDatabase(): void {
  const dir = join(app.getPath('userData'), 'data')
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  db = new Database(join(dir, 'nexus.sqlite'))
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, mode TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0, archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL, content TEXT NOT NULL, author TEXT, created_at TEXT NOT NULL,
      attachments_json TEXT NOT NULL DEFAULT '[]'
    );
    CREATE VIRTUAL TABLE IF NOT EXISTS message_search USING fts5(message_id UNINDEXED, content);
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, path TEXT NOT NULL UNIQUE, mime TEXT NOT NULL,
      size INTEGER NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY, conversation_id TEXT NOT NULL, summary TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
  `)
  ensureConversationColumn('pinned', 'INTEGER NOT NULL DEFAULT 0')
  ensureConversationColumn('archived', 'INTEGER NOT NULL DEFAULT 0')
}

export function listConversations(): Conversation[] {
  const rows = db.prepare('SELECT * FROM conversations ORDER BY archived ASC, pinned DESC, updated_at DESC').all() as Array<Record<string, string | number>>
  const messageStatement = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at')
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    mode: String(row.mode) as Conversation['mode'],
    pinned: Boolean(row.pinned),
    archived: Boolean(row.archived),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    messages: (messageStatement.all(String(row.id)) as Array<Record<string, string>>).map(mapMessage)
  }))
}

export function insertConversation(conversation: Conversation): void {
  db.prepare(`INSERT INTO conversations (id, title, mode, pinned, archived, created_at, updated_at)
    VALUES (@id, @title, @mode, @pinned, @archived, @createdAt, @updatedAt)`).run({
      ...conversation,
      pinned: conversation.pinned ? 1 : 0,
      archived: conversation.archived ? 1 : 0
    })
}

export function insertMessage(message: Message): void {
  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO messages
      (id, conversation_id, role, content, author, created_at, attachments_json)
      VALUES (@id, @conversationId, @role, @content, @author, @createdAt, @attachmentsJson)`).run({
      ...message,
      author: message.author ?? null,
      attachmentsJson: JSON.stringify(message.attachments)
    })
    db.prepare('INSERT INTO message_search (message_id, content) VALUES (?, ?)').run(message.id, message.content)
    db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(message.createdAt, message.conversationId)
  })
  transaction()
}

export function renameConversation(id: string, title: string): void {
  db.prepare('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?').run(title, new Date().toISOString(), id)
}

export function setConversationPinned(id: string, pinned: boolean): void {
  db.prepare('UPDATE conversations SET pinned = ?, updated_at = ? WHERE id = ?').run(
    pinned ? 1 : 0,
    new Date().toISOString(),
    id
  )
}

export function setConversationArchived(id: string, archived: boolean): void {
  db.prepare('UPDATE conversations SET archived = ?, pinned = CASE WHEN ? = 1 THEN 0 ELSE pinned END, updated_at = ? WHERE id = ?').run(
    archived ? 1 : 0,
    archived ? 1 : 0,
    new Date().toISOString(),
    id
  )
}

export function deleteConversation(id: string): string[] {
  const messageRows = db.prepare('SELECT attachments_json FROM messages WHERE conversation_id = ?').all(id) as Array<{ attachments_json: string }>
  const attachmentIds = new Set(messageRows.flatMap((row) => safeAttachmentIds(row.attachments_json)))
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM message_search WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)').run(id)
    db.prepare('DELETE FROM memories WHERE conversation_id = ?').run(id)
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id)
  })
  transaction()
  return removeUnusedAttachments(attachmentIds)
}

export function saveAttachment(attachment: Attachment): void {
  db.prepare(`INSERT OR REPLACE INTO attachments (id, name, path, mime, size, kind, created_at)
    VALUES (@id, @name, @path, @mime, @size, @kind, @createdAt)`).run({
      ...attachment,
      createdAt: new Date().toISOString()
    })
}

export function getAttachments(ids: string[]): Attachment[] {
  if (!ids.length) return []
  const placeholders = ids.map(() => '?').join(',')
  return db.prepare(`SELECT * FROM attachments WHERE id IN (${placeholders})`).all(...ids).map((row) => {
    const value = row as Record<string, unknown>
    return {
      id: String(value.id), name: String(value.name), path: String(value.path),
      mime: String(value.mime), size: Number(value.size), kind: value.kind as Attachment['kind']
    }
  })
}

export function listAttachments(): Attachment[] {
  return (db.prepare('SELECT * FROM attachments ORDER BY created_at').all() as Array<Record<string, unknown>>).map((value) => ({
    id: String(value.id),
    name: String(value.name),
    path: String(value.path),
    mime: String(value.mime),
    size: Number(value.size),
    kind: value.kind as Attachment['kind']
  }))
}

export function pruneHistoryBefore(cutoff: string): string[] {
  const expired = db.prepare('SELECT id FROM conversations WHERE updated_at < ?').all(cutoff) as Array<{ id: string }>
  if (!expired.length) return []
  const ids = expired.map((row) => row.id)
  const placeholders = ids.map(() => '?').join(',')
  const messageRows = db.prepare(`SELECT attachments_json FROM messages WHERE conversation_id IN (${placeholders})`).all(...ids) as Array<{ attachments_json: string }>
  const attachmentIds = new Set(messageRows.flatMap((row) => safeAttachmentIds(row.attachments_json)))
  const transaction = db.transaction(() => {
    db.prepare(`DELETE FROM message_search WHERE message_id IN (SELECT id FROM messages WHERE conversation_id IN (${placeholders}))`).run(...ids)
    db.prepare(`DELETE FROM memories WHERE conversation_id IN (${placeholders})`).run(...ids)
    db.prepare(`DELETE FROM conversations WHERE id IN (${placeholders})`).run(...ids)
  })
  transaction()
  return removeUnusedAttachments(attachmentIds)
}

export function clearLocalDatabase(): string[] {
  const paths = listAttachments().map((attachment) => attachment.path)
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM message_search').run()
    db.prepare('DELETE FROM messages').run()
    db.prepare('DELETE FROM conversations').run()
    db.prepare('DELETE FROM memories').run()
    db.prepare('DELETE FROM attachments').run()
  })
  transaction()
  return paths
}

export function searchMemory(conversationId: string, query: string, limit = 6): string[] {
  const safeQuery = query.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
  if (!safeQuery) return []
  const rows = db.prepare(`SELECT m.content FROM message_search s
    JOIN messages m ON m.id = s.message_id
    WHERE m.conversation_id = ? AND message_search MATCH ?
    ORDER BY rank LIMIT ?`).all(conversationId, safeQuery.split(/\s+/).join(' OR '), limit) as Array<{ content: string }>
  return rows.map((row) => row.content)
}

export function refreshRollingMemory(conversationId: string): void {
  const rows = db.prepare(`SELECT role, content FROM messages WHERE conversation_id = ?
    ORDER BY created_at DESC LIMIT -1 OFFSET 14`).all(conversationId) as Array<{ role: string; content: string }>
  if (!rows.length) return
  const summary = rows.reverse().map((row) => `${row.role}: ${row.content}`).join('\n').slice(-12_000)
  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM memories WHERE conversation_id = ? AND pinned = 0').run(conversationId)
    db.prepare('INSERT INTO memories (conversation_id, summary, pinned, created_at) VALUES (?, ?, 0, ?)').run(
      conversationId, summary, new Date().toISOString()
    )
  })
  transaction()
}

export function rollingMemory(conversationId: string): string {
  const row = db.prepare('SELECT summary FROM memories WHERE conversation_id = ? ORDER BY pinned DESC, created_at DESC LIMIT 1').get(conversationId) as { summary?: string } | undefined
  return row?.summary ?? ''
}

function mapMessage(row: Record<string, string>): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as Message['role'],
    content: row.content,
    author: row.author ?? undefined,
    createdAt: row.created_at,
    attachments: JSON.parse(row.attachments_json) as Attachment[]
  }
}

function ensureConversationColumn(name: 'pinned' | 'archived', definition: string): void {
  const columns = db.pragma('table_info(conversations)') as Array<{ name: string }>
  if (!columns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE conversations ADD COLUMN ${name} ${definition}`)
  }
}

function safeAttachmentIds(raw: string): string[] {
  try {
    const value = JSON.parse(raw) as Array<{ id?: unknown }>
    return Array.isArray(value) ? value.flatMap((entry) => typeof entry?.id === 'string' ? [entry.id] : []) : []
  } catch {
    return []
  }
}

function removeUnusedAttachments(candidates: Set<string>): string[] {
  if (!candidates.size) return []
  const used = new Set(
    (db.prepare('SELECT attachments_json FROM messages').all() as Array<{ attachments_json: string }>)
      .flatMap((row) => safeAttachmentIds(row.attachments_json))
  )
  const removable = [...candidates].filter((id) => !used.has(id))
  if (!removable.length) return []
  const placeholders = removable.map(() => '?').join(',')
  const rows = db.prepare(`SELECT path FROM attachments WHERE id IN (${placeholders})`).all(...removable) as Array<{ path: string }>
  db.prepare(`DELETE FROM attachments WHERE id IN (${placeholders})`).run(...removable)
  return rows.map((row) => row.path)
}
