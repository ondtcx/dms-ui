import type { WorkflowTransitionAction } from '@/lib/types/workflows';

export function getDocumentTraceability(document: { documentNumber?: string | null; currentVersion?: number | null }) {
  return {
    number: document.documentNumber || 'Número no disponible',
    version: document.currentVersion ? `Versión ${document.currentVersion}` : 'Versión no disponible',
  };
}

export function getVersionTraceability(version: { createdBy?: { name?: string } | null; createdAt?: string | null }) {
  return {
    actor: version.createdBy?.name || 'Actor no disponible',
    time: version.createdAt || 'Fecha no disponible',
  };
}

const ACTION_LABELS: Partial<Record<WorkflowTransitionAction, string>> = {
  APPROVE: 'Aprobar',
  REQUEST_CHANGES: 'Solicitar cambios',
  REJECT: 'Rechazar',
  CANCEL: 'Cancelar workflow',
  SUBMIT: 'Reenviar versión corregida',
};

export function getWorkflowTraceability(event: { action: string; performedBy?: string | null; createdAt?: string | null }) {
  return {
    label: ACTION_LABELS[event.action as WorkflowTransitionAction] ?? event.action,
    actor: event.performedBy || 'Actor no disponible',
    time: event.createdAt || 'Fecha no disponible',
  };
}
