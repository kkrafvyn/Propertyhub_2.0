import { Component } from 'react'
import { isStaleChunkError, reloadOnceForStaleChunks } from '../lib/chunk-reload'

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, resetKey: props.resetKey }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) {
      return { error: null, resetKey: props.resetKey }
    }
    return null
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('[RouteErrorBoundary]', error)
    if (isStaleChunkError(error)) {
      reloadOnceForStaleChunks()
    }
  }

  render() {
    const { error } = this.state
    if (error) {
      const isChunk = isStaleChunkError(error)
      return (
        <div className="mobile-bolt flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-bolt-bg px-6 text-center">
          <p className="text-base font-semibold text-ink">
            {isChunk ? 'A new version is available' : 'Something went wrong loading this page.'}
          </p>
          <p className="text-sm text-ink-secondary">
            {isChunk
              ? 'Refresh once to load the latest app version.'
              : 'Try refreshing, or go back to the home screen.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-mobile-forest px-4 py-2.5 text-sm font-semibold text-white"
            >
              Refresh
            </button>
            <a
              href="/"
              className="rounded-xl border border-surface-border px-4 py-2.5 text-sm font-semibold text-ink"
            >
              Home
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
