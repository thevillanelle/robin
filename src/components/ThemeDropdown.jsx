import { useThemeStore } from '../stores/useThemeStore'

export default function ThemeDropdown() {
  const { theme, setTheme } = useThemeStore()
  return (
    <select
      value={theme}
      onChange={e => setTheme(e.target.value)}
      style={{
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
      }}
    >
      <option value="dark">dark</option>
      <option value="light">light</option>
      <option value="villain">villain</option>
    </select>
  )
}
