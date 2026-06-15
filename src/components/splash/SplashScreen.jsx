import { useCallback, useEffect, useRef, useState } from 'react'
import { hideNativeSplash } from '../../lib/capacitor-init'
import { dismissHtmlSplash } from '../../lib/pwa-splash'
import { isNativeApp } from '../../lib/platform'
import { NATIVE_SPLASH_COLORS, SPLASH_COLORS, SPLASH_DURATION_MS } from './constants'
import SplashLogoMark from './SplashLogoMark'
import SplashReflection from './SplashReflection'
import SplashTagline from './SplashTagline'
import SplashWordmark from './SplashWordmark'
import './splash.css'

const EXIT_MS = 420

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function shouldSkipSplash(skipIfSeen, sessionKey) {
  if (!skipIfSeen) return false
  try {
    return sessionStorage.getItem(sessionKey) === '1'
  } catch {
    return false
  }
}

/**
 * Full-screen premium logo reveal shown on app launch.
 * @param {object} props
 * @param {() => void} [props.onComplete] - Fired after animation + optional fade-out
 * @param {number} [props.durationMs] - Total hold duration before exit (default 3000)
 * @param {boolean} [props.fadeOut] - Fade overlay out when done (default true)
 * @param {boolean} [props.skipIfSeen] - Skip when sessionStorage key is set (default false)
 * @param {string} [props.sessionKey] - sessionStorage key for skipIfSeen
 */
export default function SplashScreen({
  onComplete,
  durationMs = SPLASH_DURATION_MS,
  fadeOut = true,
  skipIfSeen = false,
  sessionKey = 'baytmiftah.splash.seen',
  native = isNativeApp(),
}) {
  const colors = native ? NATIVE_SPLASH_COLORS : SPLASH_COLORS
  const [exiting, setExiting] = useState(false)
  const completedRef = useRef(false)
  const skip = shouldSkipSplash(skipIfSeen, sessionKey)

  const finish = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    if (skipIfSeen) {
      try {
        sessionStorage.setItem(sessionKey, '1')
      } catch {
        /* storage unavailable */
      }
    }
    onComplete?.()
    dismissHtmlSplash()
  }, [onComplete, sessionKey, skipIfSeen])

  useEffect(() => {
    if (skip) {
      finish()
      return undefined
    }

    dismissHtmlSplash()
    hideNativeSplash()

    const reduced = prefersReducedMotion()
    const holdMs = reduced ? 120 : durationMs
    const exitMs = fadeOut && !reduced ? EXIT_MS : 0

    const holdTimer = window.setTimeout(() => {
      if (fadeOut && !reduced) {
        setExiting(true)
        window.setTimeout(finish, exitMs)
      } else {
        finish()
      }
    }, holdMs)

    return () => window.clearTimeout(holdTimer)
  }, [durationMs, fadeOut, finish, skip])

  if (skip) return null

  return (
    <div
      className={`splash-screen${exiting ? ' splash-screen--exit' : ''}${native ? ' splash-screen--native' : ''}`}
      role="img"
      aria-label="BaytMiftah — unlocking property opportunities"
      style={{
        backgroundColor: colors.background,
        '--splash-primary': colors.primary,
        '--splash-bg': colors.background,
        '--splash-tagline': colors.tagline,
        '--splash-line': colors.line,
        '--splash-reflection': colors.reflection,
      }}
    >
      <div className={`splash-screen__stage${!exiting ? ' splash-screen__stage--polish' : ''}`}>
        <div className="splash-screen__mark-wrap">
          <SplashLogoMark primary={colors.primary} shadow={colors.shadow} />
        </div>

        <SplashWordmark />
        <SplashTagline />
        <SplashReflection primary={colors.primary} shadow={colors.shadow} />
      </div>
    </div>
  )
}
