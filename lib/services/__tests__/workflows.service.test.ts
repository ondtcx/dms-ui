import {
  type CreateWorkflowVersionAdminDto,
  getWorkflowActionState,
  requiresWorkflowComment,
  WorkflowTransitionAction,
  WorkflowStatus,
  workflowErrorMessage,
} from "@/lib/types/workflows";
import { workflowsService } from "@/lib/services/workflows.service";

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn(), post: jest.fn() },
}));

import api from "@/lib/axios";

describe("workflow UI contracts", () => {
  it("requires comments only for destructive workflow actions", () => {
    expect(requiresWorkflowComment(WorkflowTransitionAction.REQUEST_CHANGES)).toBe(true);
    expect(requiresWorkflowComment(WorkflowTransitionAction.REJECT)).toBe(true);
    expect(requiresWorkflowComment(WorkflowTransitionAction.CANCEL)).toBe(true);
    expect(requiresWorkflowComment(WorkflowTransitionAction.APPROVE)).toBe(false);
  });

  it("disables actions for terminal executions and exposes actionable assignment actions", () => {
    expect(getWorkflowActionState(WorkflowStatus.APPROVED, true)).toEqual({
      canApprove: false,
      canRequestChanges: false,
      canReject: false,
      canCancel: false,
      canSubmit: false,
    });
    expect(getWorkflowActionState(WorkflowStatus.IN_PROGRESS, true)).toEqual({
      canApprove: true,
      canRequestChanges: true,
      canReject: true,
      canCancel: true,
      canSubmit: false,
    });
    expect(getWorkflowActionState(WorkflowStatus.IN_PROGRESS, false).canApprove).toBe(false);
  });

  it("uses the document-scoped applicable-definition endpoint", async () => {
    jest.mocked(api.get).mockResolvedValue({ data: [] });

    await workflowsService.getStartableDefinitions(123);

    expect(api.get).toHaveBeenCalledWith("/documents/123/workflow-definitions");
  });

  it("uses a Spanish workflow fallback while preserving API messages", () => {
    expect(workflowErrorMessage({})).toBe("No se pudo actualizar el flujo de trabajo");
    expect(workflowErrorMessage({ response: { data: { message: "No hay flujo de trabajo aplicable" } } })).toBe("No hay flujo de trabajo aplicable");
  });

  it("uses explicit definition and version paths for administration", async () => {
    const versionPayload: CreateWorkflowVersionAdminDto = {
      baseVersionId: 12,
      stages: [{ order: 1, roleKey: "rector" }],
    };
    jest.mocked(api.get).mockResolvedValue({ data: { id: 7, versions: [] } });
    jest.mocked(api.patch).mockResolvedValue({ data: { id: 7 } });
    jest.mocked(api.post)
      .mockResolvedValueOnce({ data: { id: 12 } })
      .mockResolvedValueOnce({ data: { versionId: 12, valid: true, issues: [] } })
      .mockResolvedValueOnce({ data: { id: 12, isActive: true } })
      .mockResolvedValueOnce({ data: { id: 12, isActive: false } });

    await workflowsService.getDefinition(7);
    await workflowsService.updateMetadata(7, { name: "Aprobación" });
    await workflowsService.createVersion(7, versionPayload);
    await workflowsService.validate(7, 12);
    await workflowsService.activate(7, 12);
    await workflowsService.deactivate(7, 12);

    expect(api.get).toHaveBeenCalledWith("/workflow-definitions/7");
    expect(api.patch).toHaveBeenCalledWith("/workflow-definitions/7", { name: "Aprobación" });
    expect(api.post).toHaveBeenNthCalledWith(1, "/workflow-definitions/7/versions", versionPayload);
    expect(api.post).toHaveBeenNthCalledWith(2, "/workflow-definitions/7/versions/12/validate", { versionId: 12 });
    expect(api.post).toHaveBeenNthCalledWith(3, "/workflow-definitions/7/versions/12/activate");
    expect(api.post).toHaveBeenNthCalledWith(4, "/workflow-definitions/7/versions/12/deactivate");
  });

  it("normalizes backend validation errors into actionable issues", async () => {
    jest.mocked(api.post).mockResolvedValue({
      data: { valid: false, errors: [{ code: "NO_STAGES", path: "stages", message: "Falta una etapa" }] },
    });

    await expect(workflowsService.validate(7, 13)).resolves.toEqual({
      versionId: 13,
      valid: false,
      issues: [{ code: "NO_STAGES", path: "stages", message: "Falta una etapa" }],
    });
  });
});
