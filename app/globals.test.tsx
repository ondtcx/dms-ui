import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DEFAULT_APPEARANCE,
  resolveAppearanceColors,
  resolveColorForeground,
} from "@/lib/contexts/SettingsContext";
import type { AppearanceSettings } from "@/lib/services/settings.service";

describe("institutional theme defaults", () => {
  it("exposes readable semantic tokens for both themes", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

    expect(css).toContain("--institution-primary");
    expect(css).toContain("--institution-primary-foreground");
    expect(css).toContain("--institution-secondary-foreground");
    expect(css).toContain("--primary-foreground: var(--institution-primary-foreground)");
    expect(css).toContain("--accent-foreground: var(--institution-secondary-foreground)");
    expect(css).toContain("--sidebar: color-mix(in oklch, var(--institution-primary)");
    expect(css).toContain("--sidebar-accent: color-mix(in oklch, var(--institution-primary)");
    expect(css).toContain("--institution-surface");
    expect(css).toContain(".dark");
    expect(css).toContain("--space-shell");
  });

  it("keeps dashboard header controls on the institutional color contract", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

    expect(css).toContain(".dashboard-header");
    expect(css).toContain(".dashboard-header-search");
    expect(css).toContain('[data-slot="breadcrumb-page"]');
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

  it("normalizes legacy appearance values without preserving invalid or extra data", () => {
    expect(
      resolveAppearanceColors({
        primaryColor: "#abc",
        secondaryColor: "not-a-color",
        theme: "invalid",
        legacyColor: "#ffffff",
      } as unknown as Partial<AppearanceSettings>),
    ).toEqual({
      primaryColor: "#aabbcc",
      secondaryColor: DEFAULT_APPEARANCE.secondaryColor,
      theme: DEFAULT_APPEARANCE.theme,
    });
  });

  it("chooses foregrounds from relative luminance and safely handles invalid colors", () => {
    expect(DEFAULT_APPEARANCE.primaryColor).toBe("#1e3a5f");
    expect(resolveColorForeground("#1e3a5f")).toBe("oklch(0.985 0 0)");
    expect(resolveColorForeground("#fefefe")).toBe("oklch(0.145 0 0)");
    expect(resolveColorForeground("not-a-color")).toBe("oklch(0.985 0 0)");
  });
});
