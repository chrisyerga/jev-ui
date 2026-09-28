import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { clearCalls, useCallLogs, type CallLog } from "../lib/inspector";

export function Inspector() {
  const logs = useCallLogs();
  const [open, setOpen] = useState(false);
  const totalTokens = logs.reduce((n, l) => n + (l.debug && !l.debug.cached ? l.debug.inputTokens : 0), 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label="Close inspector"
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-7xl px-4">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="relative z-10 ml-auto flex items-center gap-3 rounded-t-2xl border border-b-0 border-white/10 bg-ink-800/95 px-4 py-2 font-mono text-xs text-zinc-300 backdrop-blur"
          >
            <span className="size-2 rounded-full bg-accent shadow-[0_0_10px] shadow-accent" />
            Inspector · {logs.length} calls · {totalTokens.toLocaleString()} tokens
            <span className="text-zinc-500">{open ? "Hide" : "Show"}</span>
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "46vh" }}
              exit={{ height: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative z-10 overflow-hidden border-t border-white/10 bg-ink-950/95 backdrop-blur-xl"
            >
              <div className="scroll-thin mx-auto flex h-full max-w-7xl flex-col px-4 py-4">
                <div className="mb-3 flex shrink-0 items-start justify-between gap-4">
                  <p className="text-xs text-zinc-500">
                    Every call the page makes to its server, and the Jev request behind it. Question lists are truncated to the
                    first few. Press <kbd className="rounded border border-white/15 px-1 font-mono text-[10px] text-zinc-400">Esc</kbd> or click outside to close.
                  </p>
                  <div className="flex shrink-0 items-center gap-3">
                    <button type="button" onClick={clearCalls} className="text-xs text-zinc-500 hover:text-zinc-200">
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-zinc-200 hover:border-white/30 hover:bg-white/5"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scroll-thin">
                  {logs.length === 0 && <p className="py-10 text-center text-sm text-zinc-600">No calls yet. Type in a filter.</p>}
                  {logs.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function LogRow({ log }: { log: CallLog }) {
  const [expanded, setExpanded] = useState(false);
  const d = log.debug;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02]">
      <button onClick={() => setExpanded((e) => !e)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-left font-mono text-xs">
        <span className="text-zinc-600">{log.at.toLocaleTimeString()}</span>
        <span className="text-glow">POST {log.endpoint}</span>
        <span className="truncate text-zinc-400">{summarizeBody(log.body)}</span>
        <span className="ml-auto flex gap-4 text-zinc-500">
          {log.error ? (
            <span className="text-red-400">{log.error}</span>
          ) : d ? (
            <>
              {d.cached ? <span className="text-lime">cache hit</span> : <span>{d.latencyMs} ms jev</span>}
              <span>{log.roundTripMs} ms total</span>
              <span>{d.questions} questions</span>
              <span>{d.chunks} req</span>
              <span>{d.inputTokens.toLocaleString()} tok</span>
              <span className="text-zinc-600">{d.model}</span>
            </>
          ) : null}
        </span>
      </button>
      {expanded && (
        <div className="grid gap-3 border-t border-white/5 p-4 lg:grid-cols-3">
          <Json title="Page → server" value={log.body} />
          <Json title="Server → Jev (first request)" value={d?.sampleRequest} />
          <Json title="Jev answers (sample)" value={d?.sampleAnswers} />
        </div>
      )}
    </div>
  );
}

function Json({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 font-mono text-[10px] tracking-[0.2em] text-zinc-500 uppercase">{title}</p>
      <pre className="scroll-thin max-h-72 overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
        {value === undefined ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function summarizeBody(body: unknown) {
  if (typeof body !== "object" || !body) return "";
  const b = body as Record<string, unknown>;
  if (typeof b.query === "string") return `${String(b.kind)} · "${b.query}"`;
  if (typeof b.brief === "string") return `"${b.brief.slice(0, 60)}${b.brief.length > 60 ? "…" : ""}"`;
  if (Array.isArray(b.selections)) return `${b.selections.length} selections`;
  return "";
}
