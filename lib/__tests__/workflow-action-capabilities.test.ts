import { readWorkflowActionCapabilities } from "../workflow-action-capabilities";

const capabilities = {
  scope: "ordinary",
  submit: false,
  approve: true,
  requestChanges: false,
  reject: false,
  cancel: true,
  reassign: true,
  reassignAssignmentIds: [5],
};

describe("readWorkflowActionCapabilities", () => {
  it.each(["ordinary", "reception"])("preserves each explicit flag for %s", (scope) => {
    expect(readWorkflowActionCapabilities({ actionCapabilities: { ...capabilities, scope } }))
      .toEqual({ ...capabilities, scope });
  });

  it.each([
    undefined,
    null,
    {},
    [],
    { actionCapabilities: null },
    { actionCapabilities: [] },
    { actionCapabilities: { ...capabilities, scope: "unknown" } },
    { actionCapabilities: { ...capabilities, scope: undefined } },
    { actionCapabilities: { ...capabilities, scope: 1 } },
  ])("rejects unavailable or invalid scope readback %#", (execution) => {
    expect(readWorkflowActionCapabilities(execution)).toBeNull();
  });

  it.each(["submit", "approve", "requestChanges", "reject", "cancel"])(
    "requires an explicit boolean for %s", (flag) => {
      for (const value of [undefined, null, 1, "true", 0]) {
        expect(readWorkflowActionCapabilities({
          actionCapabilities: { ...capabilities, [flag]: value },
        })).toBeNull();
      }
    },
  );

  it("rejects a missing reassign flag or a non-array assignment list", () => {
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassign: undefined },
    })).toBeNull();
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassignAssignmentIds: undefined },
    })).toBeNull();
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassignAssignmentIds: 5 },
    })).toBeNull();
  });

  it.each([0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, "5", null, undefined, {}])(
    "rejects a non safe-positive assignment id %#",
    (id) => {
      expect(readWorkflowActionCapabilities({
        actionCapabilities: { ...capabilities, reassignAssignmentIds: [id] },
      })).toBeNull();
    },
  );

  it("deduplicates repeated assignment ids without losing the real one", () => {
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassignAssignmentIds: [5, 5, 7, 5] },
    })).toEqual({ ...capabilities, reassignAssignmentIds: [5, 7] });
  });

  it("fails closed when reassign disagrees with the assignment list", () => {
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassign: false, reassignAssignmentIds: [5] },
    })).toBeNull();
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassign: true, reassignAssignmentIds: [] },
    })).toBeNull();
  });

  it("accepts a disabled reassign with an empty assignment list", () => {
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassign: false, reassignAssignmentIds: [] },
    })).toEqual({ ...capabilities, reassign: false, reassignAssignmentIds: [] });
  });

  it("keeps the independent strictness conditions in one aggregated case", () => {
    // Ids repetidos se deduplican sin perder el real.
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassign: true, reassignAssignmentIds: [3, 3] },
    })?.reassignAssignmentIds).toEqual([3]);
    // El scope reception se conserva con banderas explícitas.
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, scope: "reception" },
    })?.scope).toBe("reception");
    // Una bandera con texto no booleano se rechaza sin coerción.
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, approve: "true" },
    })).toBeNull();
    // reassign=true sin ids y reassign=false con ids fallan cerrado.
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassign: true, reassignAssignmentIds: [] },
    })).toBeNull();
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassign: false, reassignAssignmentIds: [4] },
    })).toBeNull();
    expect(readWorkflowActionCapabilities({
      actionCapabilities: { ...capabilities, reassign: false, reassignAssignmentIds: [4], cancel: true },
    })).toBeNull();
  });
});
