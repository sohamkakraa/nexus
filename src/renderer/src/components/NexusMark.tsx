export function NexusMark({ compact = false }: { compact?: boolean }): React.JSX.Element {
  return <span className={compact ? 'nexus-mark compact' : 'nexus-mark'} aria-hidden="true"><i /><i /></span>
}
