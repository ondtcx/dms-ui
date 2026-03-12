"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import OnlyOfficeEditor from "@/components/documents/OnlyOfficeEditor";
import api from "@/lib/axios";

export default function EditDocumentPage() {
  const { id } = useParams();
  const [config, setConfig] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/onlyoffice/config/${id}`)
      .then((res) => setConfig(res.data))
      .catch(() => setError("No se pudo cargar el editor"));
  }, [id]);

  if (error) return <div>{error}</div>;
  if (!config) return <div>Cargando editor...</div>;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <OnlyOfficeEditor config={config} />
    </div>
  );
}
