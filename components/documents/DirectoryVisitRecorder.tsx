"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";

interface DirectoryVisitRecorderProps {
  directoryId: number | null;
  navigationSucceeded: boolean;
}

function createEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const value = Math.random() * 16 | 0;
    const replacement = character === "x" ? value : (value & 0x3) | 0x8;
    return replacement.toString(16);
  });
}

/** Records only a deliberate directory arrival after the filtered document query succeeds. */
export function DirectoryVisitRecorder({ directoryId, navigationSucceeded }: DirectoryVisitRecorderProps) {
  const eventRef = useRef<{ directoryId: number; eventId: string } | null>(null);
  const recordedRef = useRef<string | null>(null);
  const visit = useMutation({
    mutationFn: ({ id, eventId }: { id: number; eventId: string }) =>
      documentsService.recordDirectoryVisit(id, eventId),
    retry: 2,
  });

  useEffect(() => {
    if (directoryId === null || !navigationSucceeded) return;
    if (!eventRef.current || eventRef.current.directoryId !== directoryId) {
      eventRef.current = { directoryId, eventId: createEventId() };
      recordedRef.current = null;
    }
    const event = eventRef.current;
    if (recordedRef.current === event.eventId) return;
    recordedRef.current = event.eventId;
    visit.mutate({ id: event.directoryId, eventId: event.eventId });
  }, [directoryId, navigationSucceeded]);

  return null;
}
