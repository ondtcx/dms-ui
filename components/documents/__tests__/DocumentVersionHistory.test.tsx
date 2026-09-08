import { getVersionTraceability } from "@/lib/document-traceability";

describe("document version traceability", () => {
  it("labels a version event with its supplied actor and timestamp", () => {
    expect(getVersionTraceability({ createdBy: { name: "Ana" }, createdAt: "2026-09-01T10:00:00.000Z" })).toEqual({
      actor: "Ana",
      time: "2026-09-01T10:00:00.000Z",
    });
  });

  it("identifies missing actor and timestamp without inventing values", () => {
    expect(getVersionTraceability({ createdBy: null, createdAt: null })).toEqual({
      actor: "Actor no disponible",
      time: "Fecha no disponible",
    });
  });
});
