import { Component } from 'react'

export class MapErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-[min(55vh,420px)] items-center justify-center bg-surface-subtle px-4 text-center text-sm text-ink-secondary">
          Map unavailable. Switch to list view or refresh the page.
        </div>
      )
    }
    return this.props.children
  }
}
