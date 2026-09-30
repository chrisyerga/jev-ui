import { motion } from "motion/react";
import { EXAMPLES, type Example } from "../examples";
import { Link } from "../lib/router";

const STATS = [
  { value: "~400 ms", label: "to judge all 374 US places against one query" },
  { value: "~$0.0015", label: "for that same query, at $42 per billion input tokens" },
  { value: "0", label: "attributes stored on the candidates. Jev brings the world knowledge" },
];

const LIMITS = [
  { control: "A list view", idea: "that understands the data it holds" },
  { control: "A radio group", idea: "that infers meaning from where it sits on the page" },
  { control: "A button", idea: "that knows what its label promises" },
];

export default function Home() {
  return (
    <div className="relative z-10 mx-auto max-w-6xl px-4 pt-14 pb-24 sm:px-6">
      <header>
        <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.3em] text-accent uppercase">
          <span className="size-1.5 rounded-full bg-accent" /> Jev UI Playground
        </p>
        <h1 className="title-display editorial-glow mt-4 max-w-4xl text-6xl leading-[0.9] text-white sm:text-8xl">
          What if controls <span className="title-accent">understood</span> what they hold?
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
          Jev is fast and cheap per request, so a UI control can call AI on every keystroke and still feel responsive
          and cost almost nothing. Much of the intelligence we used to write into UI code can move out of the source and
          into calls to Jev. This playground collects experiments in that direction.
        </p>
      </header>

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.value} className="card p-5">
            <p className="font-mono text-2xl text-lime">{s.value}</p>
            <p className="mt-2 text-sm text-zinc-400">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <SectionLabel>Examples</SectionLabel>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map((example, i) => (
            <motion.div
              key={example.number}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.35 }}
              className="h-full"
            >
              <ExampleCard example={example} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mt-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <SectionLabel>The thought experiment</SectionLabel>
          <blockquote className="mt-5 text-2xl font-semibold leading-snug text-white sm:text-3xl">
            “What if the controls themselves were semantically aware and had intelligence?”
          </blockquote>
          <p className="mt-6 max-w-xl leading-relaxed text-zinc-400">
            A location picker usually ships with hand-built metadata: region tags, “is coastal” flags, synonym tables.
            Here the picker knows only place names, and Jev decides what “ski towns” means. Some of the ideas below are
            deliberately ridiculous. That's the point: taking them seriously pulls us past the first, obvious uses of
            Jev.
          </p>
        </div>
        <div className="card self-start p-6">
          <p className="font-mono text-[11px] tracking-[0.25em] text-zinc-500 uppercase">At the limit, a UI toolkit with</p>
          <ul className="mt-4 divide-y divide-white/5">
            {LIMITS.map((l) => (
              <li key={l.control} className="py-4 first:pt-0 last:pb-0">
                <span className="text-white">{l.control}</span> <span className="text-zinc-400">{l.idea}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-20 text-center text-xs text-zinc-600">
        Powered by Jev from{" "}
        <a href="https://typesafe.ai" className="text-zinc-400 hover:text-white">
          TypeSafe
        </a>
      </footer>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <h2 className="font-mono text-[11px] tracking-[0.3em] text-zinc-500 uppercase">{children}</h2>;
}

function ExampleCard({ example }: { example: Example }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-zinc-500">{example.number}</span>
        {example.path ? (
          <span className="flex items-center gap-1.5 rounded-full border border-lime/30 bg-lime/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-lime uppercase">
            <span className="size-1.5 rounded-full bg-lime" /> Live
          </span>
        ) : (
          <span className="rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
            Planned
          </span>
        )}
      </div>
      <h3 className="title-display mt-6 text-4xl leading-none text-white">
        {example.title} {example.titleAccent && <span className="title-accent">{example.titleAccent}</span>}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{example.summary}</p>
      <ul className="mt-5 flex flex-wrap gap-1.5">
        {example.concepts.map((c) => (
          <li key={c} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300">
            {c}
          </li>
        ))}
      </ul>
      {example.path && (
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent transition group-hover:gap-3">
          Open example <span aria-hidden>→</span>
        </span>
      )}
    </>
  );

  const base = "card flex h-full flex-col p-6";
  return example.path ? (
    <Link
      to={example.path}
      className={`${base} group transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-accent/10`}
    >
      {body}
    </Link>
  ) : (
    <div className={`${base} opacity-60`}>{body}</div>
  );
}
