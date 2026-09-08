import { getDocumentTraceability } from "@/lib/document-traceability";

describe("document detail traceability", () => {
  it("returns supplied identity and current version", () => {
    expect(getDocumentTraceability({ documentNumber: "DOC-12", currentVersion: 4 })).toEqual({
      number: "DOC-12",
      version: "Versión 4",
    });
  });

  it("returns formal unavailable fallbacks for absent optional metadata", () => {
    expect(getDocumentTraceability({ documentNumber: null, currentVersion: null })).toEqual({
      number: "Número no disponible",
      version: "Versión no disponible",
    });
  });
});
