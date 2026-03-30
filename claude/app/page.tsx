const marketplaceSections = [
  {
    title: 'Marketplace web app',
    description: 'App Router foundation ready for hosted Supabase-backed discovery and auth.',
  },
  {
    title: 'CLI workspace',
    description: 'Reserved structure for the published mockly CLI and filesystem install flows.',
  },
  {
    title: 'Supabase project',
    description: 'Hosted project wiring and migrations continue under the existing supabase directory.',
  },
] as const

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12">
        <section className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
            Mockly MVP Foundation
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Next.js 15 baseline for the hosted marketplace and CLI mission.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            This repo now contains the canonical App Router, TypeScript, Tailwind, testing, and
            linting foundation that later auth, marketplace, and CLI features will extend.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {marketplaceSections.map((section) => (
            <article
              key={section.title}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/30"
            >
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{section.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
