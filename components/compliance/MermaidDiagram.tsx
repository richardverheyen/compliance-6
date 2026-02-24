"use client";

import { useEffect, useRef } from "react";

export default function MermaidDiagram({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ startOnLoad: false, theme: "default" });
      if (!containerRef.current || cancelled) return;
      const id = "mermaid-" + Math.random().toString(36).slice(2);
      const { svg } = await mermaid.render(id, content);
      if (containerRef.current && !cancelled) {
        containerRef.current.innerHTML = svg;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Process Flowchart
      </p>
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
}
