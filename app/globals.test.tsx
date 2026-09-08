import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_APPEARANCE, resolveAppearanceColors } from "@/lib/contexts/SettingsContext";

describe("institutional theme defaults", () => {
  it("exposes readable semantic tokens for both themes", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

    expect(css).toContain("--institution-primary");
    expect(css).toContain("--institution-surface");
    expect(css).toContain(".dark");
    expect(css).toContain("--space-shell");
  });

  it("uses curated colors when appearance data is missing or incomplete", () => {
    expect(resolveAppearanceColors()).toEqual(DEFAULT_APPEARANCE);
    expect(resolveAppearanceColors({ primaryColor: "#123456" })).toEqual({
      ...DEFAULT_APPEARANCE,
      primaryColor: "#123456",
    });
    expect(resolveAppearanceColors({ secondaryColor: "" }).secondaryColor).toBe(
      DEFAULT_APPEARANCE.secondaryColor,
    );
  });
});
