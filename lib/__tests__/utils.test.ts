import { isTextEditable } from "@/lib/utils";

describe("isTextEditable", () => {
  it("accepts the supported text and structured MIME types", () => {
    expect(isTextEditable("text/plain")).toBe(true);
    expect(isTextEditable("application/json")).toBe(true);
    expect(isTextEditable("application/xml")).toBe(true);
    expect(isTextEditable("application/javascript")).toBe(true);
    expect(isTextEditable("application/csv")).toBe(true);
  });

  it("rejects unsupported document MIME types", () => {
    expect(isTextEditable("application/pdf")).toBe(false);
    expect(isTextEditable("image/png")).toBe(false);
  });
});
