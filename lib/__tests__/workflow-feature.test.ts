import { isWorkflowFeatureEnabled } from "@/lib/workflow-feature";

const originalValue = process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED;

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = originalValue;
  }
});

describe("workflow feature flag", () => {
  it("enables only for a case-insensitive true string", () => {
    expect(isWorkflowFeatureEnabled("true")).toBe(true);
    expect(isWorkflowFeatureEnabled("TRUE")).toBe(true);
    expect(isWorkflowFeatureEnabled("1")).toBe(false);
    expect(isWorkflowFeatureEnabled(true)).toBe(false);
    expect(isWorkflowFeatureEnabled(" true ")).toBe(false);
  });

  it("reads the public browser environment variable by default", () => {
    process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED = "TrUe";

    expect(isWorkflowFeatureEnabled()).toBe(true);
  });
});
