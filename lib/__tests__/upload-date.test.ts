import { validOriginDate, inferredYearPreview } from "../upload-date";

describe("upload date preview", () => {
  it("accepts calendar dates only", () => {
    expect(validOriginDate("2024-02-29")).toBe(true);
    expect(validOriginDate("2026-02-29")).toBe(false);
    expect(validOriginDate("2026-01-01T00:00:00Z")).toBe(false);
  });
  it("projects upload instants and includes inactive periods", () => {
    const years = [
      {
        id: 3,
        name: "Historical",
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        isActive: false,
      },
    ];
    expect(
      inferredYearPreview(undefined, years, new Date("2026-01-01T04:59:59Z")),
    ).toContain("Historical");
    expect(
      inferredYearPreview("2025-12-31", [...years, { ...years[0], id: 4 }]),
    ).toContain("varios");
    expect(inferredYearPreview("2024-01-01", years)).toContain("Sin año");
  });
});
