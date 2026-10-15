import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("document detail folder navigation boundary", () => {
  it("does not mount folder browsing controls on document detail", () => {
    const source = readFileSync(join(__dirname, "..", "page.tsx"), "utf8");

    expect(source).not.toContain("DirectoryNavigation");
  });
});
