"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/contexts/AuthContext";
import { documentsService } from "@/lib/services/documents.service";
import { readDocumentActionCapabilities } from "@/lib/document-action-capabilities";

export function useDocumentActionGuard(
  documentId: number,
  action: "editMetadata" | "editContent",
  open: boolean,
  authorize?: () => boolean,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["document-action-readback", user?.id, documentId];
  const identity = `${user?.id ?? ""}:${documentId}:${open}`;
  const session = useRef({ identity, open });
  if (open && !session.current.open) session.current.identity = identity;
  session.current.open = open;
  const state = useRef({ identity, epoch: {}, alive: true, allowed: false });
  if (state.current.identity !== identity) {
    state.current = { identity, epoch: {}, alive: true, allowed: false };
  }
  useEffect(() => {
    state.current.alive = true;
    return () => { state.current.alive = false; };
  }, []);
  const query = useQuery({
    queryKey,
    queryFn: () => documentsService.getOne(documentId),
    enabled: open && !!user?.id,
    staleTime: 0,
    retry: false,
    placeholderData: () => undefined,
  });
  state.current.allowed = session.current.identity === identity && !!user?.id && open && query.isSuccess && !query.isFetching &&
    query.data?.id === documentId &&
    readDocumentActionCapabilities(query.data)?.[action] === true &&
    (authorize?.() ?? true);
  const isCurrent = (epoch: object) => {
    const currentQuery = queryClient.getQueryState(queryKey);
    const currentDocument = queryClient.getQueryData<{ id: number }>(queryKey);
    return state.current.alive && state.current.epoch === epoch && state.current.allowed &&
      currentQuery?.fetchStatus === "idle" && !currentQuery.isInvalidated &&
      currentDocument?.id === documentId && readDocumentActionCapabilities(currentDocument)?.[action] === true &&
      (authorize?.() ?? true);
  };
  return {
    identity,
    canAct: state.current.allowed,
    capture: () => state.current.epoch,
    isCurrent,
    assert: (epoch: object) => {
      if (!isCurrent(epoch) || !state.current.allowed || !(authorize?.() ?? true)) {
        throw new Error("Los permisos del documento no están disponibles o han cambiado.");
      }
    },
  };
}
