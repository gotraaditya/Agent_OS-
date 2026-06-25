import { BackendStatus } from "@/components/backend-status";

export default function Home() {
  return (
    <main className="app-shell">
      <header className="placeholder header">
        <div>
          <p className="eyebrow">Phase 1 foundation</p>
          <h1>AI Team Manager</h1>
        </div>
        <BackendStatus />
      </header>

      <section className="workspace" aria-label="Future application layout">
        <aside className="placeholder left-panel">
          <h2>Project navigator</h2>
          <p>Files, tasks, and knowledge will be added in later phases.</p>
        </aside>

        <section className="placeholder center-panel">
          <h2>Codex activity feed</h2>
          <p>The desktop, frontend, backend, and database foundation is running.</p>
          <div className="future-input">Message Codex… (coming in a later phase)</div>
        </section>

        <aside className="placeholder right-panel">
          <h2>Agent status</h2>
          <p>Real agent registration and adapters are not connected yet.</p>
        </aside>
      </section>

      <footer className="placeholder inspector">
        <h2>Bottom inspector</h2>
        <p>Changes, logs, reviews, terminal output, and files will appear here.</p>
      </footer>
    </main>
  );
}

