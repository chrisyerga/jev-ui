import { useEffect, type ComponentType } from "react";
import { Link, usePathname } from "./lib/router";
import Home from "./pages/Home";
import SmartTable from "./pages/SmartTable";
import TargetingLab from "./pages/TargetingLab";

const ROUTES: Record<string, { title: string; Page: ComponentType }> = {
  "/": { title: "Jev UI Playground", Page: Home },
  "/targeting": { title: "Targeting Lab · Jev UI Playground", Page: TargetingLab },
  "/tables": { title: "Self-aware Tables · Jev UI Playground", Page: SmartTable },
};

export default function App() {
  const pathname = usePathname();
  const route = ROUTES[pathname.replace(/\/+$/, "") || "/"];

  useEffect(() => {
    document.title = route?.title ?? "Not found · Jev UI Playground";
  }, [route]);

  return route ? <route.Page /> : <NotFound />;
}

function NotFound() {
  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-[11px] tracking-[0.3em] text-accent uppercase">404</p>
      <h1 className="mt-3 font-display text-6xl text-white">
        No such <em className="text-glow">experiment</em>
      </h1>
      <Link to="/" className="mt-8 text-sm font-medium text-accent hover:text-glow">
        ← Back to the playground
      </Link>
    </div>
  );
}
