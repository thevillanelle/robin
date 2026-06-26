import { useThemeStore } from '../stores/useThemeStore'

const sel = {
  fontFamily: 'monospace',
  fontSize: '0.6rem',
  letterSpacing: '0.15em',
  color: 'var(--c-muted)',
  background: 'var(--c-surface-1)',
  border: '1px solid var(--c-border-2)',
  borderRadius: '4px',
  padding: '0.35rem 0.75rem',
  cursor: 'pointer',
  outline: 'none',
}

export default function ThemeDropdown() {
  const { theme, setTheme, view, setView } = useThemeStore()
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <select value={theme} onChange={e => setTheme(e.target.value)} style={sel}>
        <option value="dark">dark</option>
        <option value="light">light</option>
        <option value="villain">villain</option>
      </select>
      <select value={view} onChange={e => setView(e.target.value)} style={sel}>
        <option value="dashboard">dashboard</option>
        <option value="magazine">magazine</option>
      </select>
    </div>
  )
}
