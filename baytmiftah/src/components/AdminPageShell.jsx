import Header from './Header'
import Navigation from './Navigation'

export default function AdminPageShell({ title, children }) {
  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title={title} />
        <div className="px-4 pt-24 md:px-8">
          <div className="mx-auto max-w-container">{children}</div>
        </div>
      </main>
    </div>
  )
}
