import { useState, useEffect, useRef } from "react";
import { documentsService } from "@/lib/services/documents.service";
import type { Document } from "@/lib/types";

type ThumbnailMap = Record<number, { url: string; updatedAt: string }>;

export function useDocumentThumbnails(documents: Document[] | undefined) {
  const [thumbnailUrls, setThumbnailUrls] = useState<ThumbnailMap>({});
  const blobUrlsRef = useRef<string[]>([]);

  // Revocar todos los blob URLs al desmontar
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => window.URL.revokeObjectURL(url));
    };
  }, []);

  // Cargar thumbnails para PDFs e imágenes
  useEffect(() => {
    const loadThumbnails = async () => {
      if (!documents) return;

      for (const doc of documents) {
        if (!((doc?.versions?.[0]?.mimetype) ?? '').startsWith("image/") && ((doc?.versions?.[0]?.mimetype) ?? '') !== "application/pdf") continue;
        if (thumbnailUrls[doc.id]?.updatedAt === doc.updatedAt) continue;

        try {
          const blob = await documentsService.getThumbnail(doc.id, doc.updatedAt);
          const url = window.URL.createObjectURL(blob);
          blobUrlsRef.current.push(url);
          setThumbnailUrls((prev) => ({ ...prev, [doc.id]: { url, updatedAt: doc.updatedAt } }));
        } catch {
          // Si falla se mostrará el icono por defecto
        }
      }
    };

    loadThumbnails();
  }, [documents]);

  return { thumbnailUrls };
}
