"use client";

import { useEffect, useRef } from "react";

interface Props {
  config: any;
}

export default function OnlyOfficeEditor({ config }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!config || !containerRef.current) return;

    // Limpiar editor anterior
    const container = document.getElementById("onlyoffice-editor");
    if (container) container.innerHTML = "";

    const script = document.createElement("script");
    script.src = `${process.env.NEXT_PUBLIC_ONLYOFFICE_URL}/web-apps/apps/api/documents/api.js`;

    script.onload = () => {
      new (window as any).DocsAPI.DocEditor("onlyoffice-editor", {
        ...config,
        width: "100%",
        height: "100%",
        events: {
          onError: (e: any) => console.error("OnlyOffice error:", e),
        },
      });
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [config]);

  return (
    <div
      id="onlyoffice-editor"
      ref={containerRef}
      style={{ width: "100%", height: "85vh" }}
    />
  );
}
