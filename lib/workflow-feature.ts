export function isWorkflowFeatureEnabled(
  value: unknown = process.env.NEXT_PUBLIC_WORKFLOW_FEATURE_ENABLED,
): boolean {
  return typeof value === "string" && value.toLowerCase() === "true";
}
