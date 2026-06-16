import { Component } from 'react'

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('[RouteErrorBoundary]', error)
  }

  render() {
    const { error } = this.state
    if (error) {
      return (
        <div className="mobile-bolt flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-bolt-bg px-6 text-center">
          <p className="text-base font-semibold text-ink">Something went wrong loading this page.</p>
          <p className="text-sm text-ink-secondary">Try refreshing, or go back to the home screen.</p>
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
