"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditDocumentPage() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/documents/${id}?edit=metadata`);
  }, [id, router]);

  return (
    <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
      Redirigiendo al editor de metadatos del piloto...
    </div>
  );
}
