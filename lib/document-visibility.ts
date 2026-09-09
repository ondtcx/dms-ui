const residualWorkflowFilenamePattern = /^workflow-\d+-[a-z0-9]+\.pdf$/i;

export function isResidualWorkflowFilename(filename?: string | null): boolean {
  return residualWorkflowFilenamePattern.test(filename ?? "");
}
