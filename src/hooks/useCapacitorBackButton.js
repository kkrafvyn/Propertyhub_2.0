import { useEffect } from 'react'
import { isNativeApp } from '../lib/platform'

export function useCapacitorBackButton() {
  useEffect(() => {
    if (!isNativeApp()) return undefined

    let listener

    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back()
        } else {
          App.exitApp()
        }
      }).then((handle) => {
        listener = handle
      })
    })

    return () => {
      listener?.remove()
    }
  }, [])
}
