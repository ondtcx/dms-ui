import api from '../axios';
import {
  DocumentWorkflow,
  WorkflowTemplate,
  WorkflowApproval,
  ApprovalAction,
} from '../types';

export const workflowsService = {
  // Obtener aprobaciones pendientes del usuario actual
  async getPendingApprovals(): Promise<WorkflowApproval[]> {
    const response = await api.get('/workflows/pending');
    return response.data;
  },

  // Obtener workflow de un documento
  async getDocumentWorkflow(documentId: number): Promise<DocumentWorkflow | null> {
    try {
      const response = await api.get(`/workflows/document/${documentId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Iniciar workflow para un documento
  async initiate(documentId: number, templateId?: number): Promise<DocumentWorkflow> {
    const response = await api.post('/workflows/initiate', {
      documentId,
      templateId,
    });
    return response.data;
  },

  // Aprobar/Rechazar un workflow
  async approve(
    workflowId: number,
    action: ApprovalAction,
    comment?: string
  ): Promise<WorkflowApproval> {
    const response = await api.post(`/workflows/${workflowId}/approve`, {
      action,
      comment,
    });
    return response.data;
  },

  // Obtener templates de workflow
  async getTemplates(): Promise<WorkflowTemplate[]> {
    const response = await api.get('/workflows/templates');
    return response.data;
  },

  // Cancelar un workflow
  async cancel(workflowId: number): Promise<DocumentWorkflow> {
    const response = await api.patch(`/workflows/${workflowId}/cancel`);
    return response.data;
  },
};
