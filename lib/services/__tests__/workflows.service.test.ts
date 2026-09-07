import {
  getWorkflowActionState,
  requiresWorkflowComment,
  WorkflowTransitionAction,
  WorkflowStatus,
} from "@/lib/types/workflows";

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
});
