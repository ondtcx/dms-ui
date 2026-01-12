import api from '../axios';
import {
  DashboardReport,
  WorkflowBottleneck,
  DocumentCompliance,
} from '../types';

export const reportsService = {
  // Obtener dashboard con todas las métricas
  async getDashboard(): Promise<DashboardReport> {
    const response = await api.get('/reports/dashboard');
    return response.data;
  },

  // Obtener cuellos de botella en workflows
  async getWorkflowBottlenecks(): Promise<WorkflowBottleneck[]> {
    const response = await api.get('/reports/workflow-bottlenecks');
    return response.data;
  },

  // Obtener reporte de compliance
  async getDocumentCompliance(): Promise<DocumentCompliance[]> {
    const response = await api.get('/reports/document-compliance');
    return response.data;
  },
};
