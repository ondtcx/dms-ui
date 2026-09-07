import api from "@/lib/axios";
import type {
  CreateWorkflowDefinitionDto,
  CreateWorkflowVersionDto,
  ReassignWorkflowAssignmentDto,
  StartWorkflowDto,
  WorkflowAssignment,
  WorkflowDefinition,
  WorkflowDefinitionVersion,
  WorkflowExecution,
  WorkflowTransitionDto,
} from "@/lib/types/workflows";

export const workflowsService = {
  async getDefinitions(): Promise<WorkflowDefinition[]> {
    return (await api.get<WorkflowDefinition[]>("/workflow-definitions")).data;
  },
  async createDefinition(data: CreateWorkflowDefinitionDto): Promise<WorkflowDefinition> {
    return (await api.post<WorkflowDefinition>("/workflow-definitions", data)).data;
  },
  async createVersion(id: number, data: CreateWorkflowVersionDto): Promise<WorkflowDefinitionVersion> {
    return (await api.post<WorkflowDefinitionVersion>(`/workflow-definitions/${id}/versions`, data)).data;
  },
  async activate(id: number): Promise<WorkflowDefinitionVersion> {
    return (await api.post<WorkflowDefinitionVersion>(`/workflow-definitions/${id}/activate`)).data;
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
