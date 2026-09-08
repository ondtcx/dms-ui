import { getWorkflowTraceability } from "@/lib/document-traceability";

describe("workflow event traceability", () => {
  it("keeps workflow events separate and labels supplied actor and timestamp", () => {
    expect(getWorkflowTraceability({ action: "APPROVE", performedBy: "Ana", createdAt: "2026-09-01T10:00:00.000Z" })).toEqual({
      label: "Aprobar",
      actor: "Ana",
      time: "2026-09-01T10:00:00.000Z",
    });
  });

  it("uses explicit fallbacks for partial workflow metadata", () => {
    expect(getWorkflowTraceability({ action: "REJECT", performedBy: null, createdAt: null })).toEqual({
      label: "Rechazar",
      actor: "Actor no disponible",
      time: "Fecha no disponible",
    });
  });
});
