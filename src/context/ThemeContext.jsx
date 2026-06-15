import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { syncNativeTheme } from '../lib/capacitor-init'

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('baytmiftah_theme') || 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.dataset.theme = theme
    try {
      localStorage.setItem('baytmiftah_theme', theme)
    } catch { /* ignore */ }
    syncNativeTheme(theme)
  }, [theme])

  const value = useMemo(() => ({
    theme,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
  }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
