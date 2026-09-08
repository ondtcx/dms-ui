import api from "@/lib/axios";
import type {
  ApplicableWorkflowDefinition,
  CreateWorkflowVersionAdminDto,
  CreateWorkflowDefinitionDto,
  ReassignWorkflowAssignmentDto,
  StartWorkflowDto,
  WorkflowAssignment,
  WorkflowDefinition,
  WorkflowDefinitionDetail,
  WorkflowDefinitionVersion,
  WorkflowExecution,
  WorkflowValidationResult,
  UpdateWorkflowDefinitionMetadataDto,
  WorkflowTransitionDto,
} from "@/lib/types/workflows";

export const workflowsService = {
  async getDefinitions(): Promise<WorkflowDefinition[]> {
    return (await api.get<WorkflowDefinition[]>("/workflow-definitions")).data;
  },
  async getDefinition(id: number): Promise<WorkflowDefinitionDetail> {
    return (await api.get<WorkflowDefinitionDetail>(`/workflow-definitions/${id}`)).data;
  },
  async getStartableDefinitions(documentId: number): Promise<ApplicableWorkflowDefinition[]> {
    return (await api.get<ApplicableWorkflowDefinition[]>(`/documents/${documentId}/workflow-definitions`)).data;
  },
  async createDefinition(data: CreateWorkflowDefinitionDto): Promise<WorkflowDefinition> {
    return (await api.post<WorkflowDefinition>("/workflow-definitions", data)).data;
  },
  async updateMetadata(id: number, data: UpdateWorkflowDefinitionMetadataDto): Promise<WorkflowDefinition> {
    return (await api.patch<WorkflowDefinition>(`/workflow-definitions/${id}`, data)).data;
  },
  async createVersion(id: number, data: CreateWorkflowVersionAdminDto): Promise<WorkflowDefinitionVersion> {
    return (await api.post<WorkflowDefinitionVersion>(`/workflow-definitions/${id}/versions`, data)).data;
  },
  async validate(templateId: number, versionId: number): Promise<WorkflowValidationResult> {
    const response = await api.post<WorkflowValidationResult & { errors?: WorkflowValidationResult["issues"] }>(
      `/workflow-definitions/${templateId}/versions/${versionId}/validate`,
      { versionId },
    );
    return {
      versionId,
      valid: response.data.valid,
      issues: response.data.issues ?? response.data.errors ?? [],
    };
  },
  async activate(templateId: number, versionId: number): Promise<WorkflowDefinitionVersion> {
    return (await api.post<WorkflowDefinitionVersion>(`/workflow-definitions/${templateId}/versions/${versionId}/activate`)).data;
  },
  async deactivate(templateId: number, versionId: number): Promise<WorkflowDefinitionVersion> {
    return (await api.post<WorkflowDefinitionVersion>(`/workflow-definitions/${templateId}/versions/${versionId}/deactivate`)).data;
  },
  async start(documentId: number, data: StartWorkflowDto = {}): Promise<WorkflowExecution> {
    return (await api.post<WorkflowExecution>(`/documents/${documentId}/workflows`, data)).data;
  },
  async history(documentId: number): Promise<WorkflowExecution[]> {
    return (await api.get<WorkflowExecution[]>(`/documents/${documentId}/workflows`)).data;
  },
  async transition(id: number, data: WorkflowTransitionDto): Promise<WorkflowExecution> {
    return (await api.post<WorkflowExecution>(`/workflows/${id}/transitions`, data)).data;
  },
  async reassign(workflowId: number, assignmentId: number, data: ReassignWorkflowAssignmentDto): Promise<WorkflowAssignment> {
    return (await api.post<WorkflowAssignment>(`/workflows/${workflowId}/assignments/${assignmentId}/reassign`, data)).data;
  },
};
