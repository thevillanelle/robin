import { create } from 'zustand'

export const THEMES = {
  dark: {
    label: 'dark',
    vars: {
      '--c-bg':                   '#0D0F0E',
      '--c-fg':                   '#FAF7F2',
      '--c-accent':               '#C4717A',
      '--c-muted':                '#5a5048',
      '--c-muted2':               '#8B7E72',
      '--c-dim':                  '#3a3028',
      '--c-up':                   '#6AAD8A',
      '--c-amber':                '#C4A85A',
      '--c-body-text':            '#C8BFB0',
      '--c-purple':               '#A89BC4',
      '--c-surface-1':            'rgba(255,255,255,0.025)',
      '--c-surface-2':            'rgba(255,255,255,0.03)',
      '--c-surface-3':            'rgba(255,255,255,0.04)',
      '--c-surface-4':            'rgba(255,255,255,0.08)',
      '--c-border-1':             'rgba(255,255,255,0.05)',
      '--c-border-2':             'rgba(255,255,255,0.07)',
      '--c-border-3':             'rgba(255,255,255,0.1)',
      '--c-border-4':             'rgba(255,255,255,0.2)',
      '--c-overlay':              'rgba(0,0,0,0.8)',
      '--c-input-bg':             'rgba(0,0,0,0.4)',
      '--c-modal-bg':             '#171410',
      '--c-accent-subtle':        'rgba(196,113,122,0.06)',
      '--c-accent-soft':          'rgba(196,113,122,0.1)',
      '--c-accent-medium':        'rgba(196,113,122,0.15)',
      '--c-accent-border':        'rgba(196,113,122,0.25)',
      '--c-accent-border-strong': 'rgba(196,113,122,0.35)',
      '--c-up-subtle':            'rgba(106,173,138,0.06)',
      '--c-up-border':            'rgba(106,173,138,0.15)',
      '--c-scrollbar':            'rgba(255,255,255,0.08)',
    },
  },
  light: {
    label: 'light',
    vars: {
      '--c-bg':                   '#F5F0E8',
      '--c-fg':                   '#1C1815',
      '--c-accent':               '#B5606A',
      '--c-muted':                '#5C504A',
      '--c-muted2':               '#4E433D',
      '--c-dim':                  '#7A6E66',
      '--c-up':                   '#2D7A4F',
      '--c-amber':                '#8B6E1F',
      '--c-body-text':            '#4A403A',
      '--c-purple':               '#6E5FA8',
      '--c-surface-1':            'rgba(0,0,0,0.035)',
      '--c-surface-2':            'rgba(0,0,0,0.05)',
      '--c-surface-3':            'rgba(0,0,0,0.06)',
      '--c-surface-4':            'rgba(0,0,0,0.09)',
      '--c-border-1':             'rgba(0,0,0,0.07)',
      '--c-border-2':             'rgba(0,0,0,0.09)',
      '--c-border-3':             'rgba(0,0,0,0.13)',
      '--c-border-4':             'rgba(0,0,0,0.22)',
      '--c-overlay':              'rgba(0,0,0,0.45)',
      '--c-input-bg':             'rgba(0,0,0,0.04)',
      '--c-modal-bg':             '#EDE8E0',
      '--c-accent-subtle':        'rgba(181,96,106,0.07)',
      '--c-accent-soft':          'rgba(181,96,106,0.1)',
      '--c-accent-medium':        'rgba(181,96,106,0.14)',
      '--c-accent-border':        'rgba(181,96,106,0.25)',
      '--c-accent-border-strong': 'rgba(181,96,106,0.38)',
      '--c-up-subtle':            'rgba(45,122,79,0.08)',
      '--c-up-border':            'rgba(45,122,79,0.2)',
      '--c-scrollbar':            'rgba(0,0,0,0.12)',
    },
  },
  villain: {
    label: 'villain',
    vars: {
      '--c-bg':                   '#07030D',
      '--c-fg':                   '#EDE5FF',
      '--c-accent':               '#9D4EDD',
      '--c-muted':                '#5a4875',
      '--c-muted2':               '#7A6898',
      '--c-dim':                  '#2D1F45',
      '--c-up':                   '#39D353',
      '--c-amber':                '#FFB86C',
      '--c-body-text':            '#C8B8E8',
      '--c-purple':               '#C4A8F4',
      '--c-surface-1':            'rgba(157,78,221,0.05)',
      '--c-surface-2':            'rgba(157,78,221,0.07)',
      '--c-surface-3':            'rgba(157,78,221,0.09)',
      '--c-surface-4':            'rgba(157,78,221,0.14)',
      '--c-border-1':             'rgba(157,78,221,0.12)',
      '--c-border-2':             'rgba(157,78,221,0.17)',
      '--c-border-3':             'rgba(157,78,221,0.24)',
      '--c-border-4':             'rgba(157,78,221,0.38)',
      '--c-overlay':              'rgba(7,3,13,0.9)',
      '--c-input-bg':             'rgba(0,0,0,0.5)',
      '--c-modal-bg':             '#12082A',
      '--c-accent-subtle':        'rgba(157,78,221,0.08)',
      '--c-accent-soft':          'rgba(157,78,221,0.12)',
      '--c-accent-medium':        'rgba(157,78,221,0.18)',
      '--c-accent-border':        'rgba(157,78,221,0.3)',
      '--c-accent-border-strong': 'rgba(157,78,221,0.48)',
      '--c-up-subtle':            'rgba(57,211,83,0.06)',
      '--c-up-border':            'rgba(57,211,83,0.2)',
      '--c-scrollbar':            'rgba(157,78,221,0.2)',
    },
  },
}

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem('robin_theme') ?? 'dark',
  view:  localStorage.getItem('robin_view')  ?? 'dashboard',

  setTheme: (theme) => {
    localStorage.setItem('robin_theme', theme)
    const vars = THEMES[theme]?.vars ?? THEMES.dark.vars
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
    set({ theme })
  },

  setView: (view) => {
    localStorage.setItem('robin_view', view)
    set({ view })
  },
}))

// apply on init
const initTheme = localStorage.getItem('robin_theme') ?? 'dark'
const initVars  = THEMES[initTheme]?.vars ?? THEMES.dark.vars
Object.entries(initVars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v))
