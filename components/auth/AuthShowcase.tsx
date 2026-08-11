// Left-panel "showcase" for the split-screen auth layout. There's no real
// product screenshot checked into the repo yet, so this renders a CSS mockup
// of the dashboard (fake KPI tiles + chart bars) as a floating, tilted card.
// Swap the mockup block below for a real <img src="/dashboard-preview.png" />
// once a screenshot is available -- everything else (gradient, glow, copy)
// can stay as-is.
export function AuthShowcase() {
  return (
    <div className="relative hidden overflow-hidden bg-neutral-950 lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center lg:px-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(37,99,235,0.35), transparent 55%), radial-gradient(circle at 80% 80%, rgba(124,58,237,0.25), transparent 50%)",
        }}
      />

      <div className="relative z-10 mb-10 max-w-md text-center">
        <h2 className="text-2xl font-semibold text-white">Run your whole business from one place</h2>
        <p className="mt-3 text-sm text-neutral-400">
          Contacts, deals, projects, invoices and your team -- all in a single workspace.
        </p>
      </div>

      <div className="relative z-10 w-full max-w-md -rotate-3 rounded-2xl border border-white/10 bg-neutral-900/80 p-5 shadow-2xl shadow-black/50 backdrop-blur transition-transform duration-500 hover:rotate-0">
        <div className="mb-4 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-neutral-800/80 p-3">
            <div className="h-2 w-10 rounded bg-neutral-600" />
            <div className="mt-2 h-4 w-14 rounded bg-blue-500/70" />
          </div>
          <div className="rounded-lg bg-neutral-800/80 p-3">
            <div className="h-2 w-10 rounded bg-neutral-600" />
            <div className="mt-2 h-4 w-14 rounded bg-emerald-500/70" />
          </div>
          <div className="rounded-lg bg-neutral-800/80 p-3">
            <div className="h-2 w-10 rounded bg-neutral-600" />
            <div className="mt-2 h-4 w-14 rounded bg-purple-500/70" />
          </div>
        </div>

        <div className="mt-3 flex h-28 items-end gap-2 rounded-lg bg-neutral-800/80 p-3">
          {[40, 65, 45, 80, 55, 90, 60].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-blue-500/70" style={{ height: `${h}%` }} />
          ))}
        </div>

        <div className="mt-3 space-y-2 rounded-lg bg-neutral-800/80 p-3">
          <div className="h-2 w-3/4 rounded bg-neutral-600" />
          <div className="h-2 w-1/2 rounded bg-neutral-700" />
        </div>
      </div>

      <div
        aria-hidden
        className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl"
      />
    </div>
  );
}
