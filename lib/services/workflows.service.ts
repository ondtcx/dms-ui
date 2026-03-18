import api from '../axios';
import {
  DocumentWorkflow,
  WorkflowTemplate,
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
  ApprovalAction,
} from '../types';

export const workflowsService = {
  // ===== TEMPLATES =====

  // Obtener todos los templates de workflow
  async getTemplates(): Promise<WorkflowTemplate[]> {
    const response = await api.get('/workflows/templates');
    return response.data;
  },

  // Obtener template por ID
  async getTemplateById(id: number): Promise<WorkflowTemplate> {
    const response = await api.get(`/workflows/templates/${id}`);
    return response.data;
  },

  // Crear template de workflow
  async createTemplate(data: CreateWorkflowTemplateDto): Promise<WorkflowTemplate> {
    const response = await api.post('/workflows/templates', data);
    return response.data;
  },

  // Actualizar template de workflow
  async updateTemplate(id: number, data: UpdateWorkflowTemplateDto): Promise<WorkflowTemplate> {
    const response = await api.patch(`/workflows/templates/${id}`, data);
    return response.data;
  },

  // Eliminar template de workflow
  async deleteTemplate(id: number): Promise<{ message: string }> {
    const response = await api.delete(`/workflows/templates/${id}`);
    return response.data;
  },

  // ===== DOCUMENT WORKFLOWS =====

  // Iniciar workflow para un documento
  async initiate(documentId: number, templateId: number): Promise<DocumentWorkflow> {
    const response = await api.post(`/workflows/documents/${documentId}/initiate`, {
      templateId,
    });
    return response.data;
  },

  // Obtener workflow de un documento
  async getDocumentWorkflow(documentId: number): Promise<DocumentWorkflow | null> {
    try {
      const response = await api.get(`/workflows/documents/${documentId}`, {
        silentErrors: [404],
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  // Obtener workflows pendientes del usuario actual
  async getPendingApprovals(): Promise<DocumentWorkflow[]> {
    const response = await api.get('/workflows/pending');
    return response.data;
  },

  // ===== APPROVAL ACTIONS =====

  // Aprobar/Rechazar/Solicitar cambios/Comentar un workflow
  async approve(
    workflowId: number,
    action: ApprovalAction,
    comment?: string,
  ): Promise<{ status: string; message: string }> {
    const response = await api.post(`/workflows/${workflowId}/approve`, {
      action,
      comment,
    });
    return response.data;
  },

  // Cancelar un workflow
  async cancel(workflowId: number): Promise<{ message: string }> {
    const response = await api.patch(`/workflows/${workflowId}/cancel`);
    return response.data;
  },

  // Reenviar un workflow para revisión después de aplicar cambios
  async resubmit(workflowId: number): Promise<{ status: string; message: string }> {
    const response = await api.patch(`/workflows/${workflowId}/resubmit`);
    return response.data;
  },

  // Obtener workflows iniciados por el usuario actual
  async getMyInitiatedWorkflows(params?: {
    status?: 'all' | 'active' | 'completed' | 'cancelled';
    page?: number;
    limit?: number;
  }): Promise<{
    data: DocumentWorkflow[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const response = await api.get('/workflows/my-initiated', { params });
    return response.data;
  },
};
