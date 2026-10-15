import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DocumentSettingsForm } from "../DocumentSettingsForm";
import { settingsService } from "@/lib/services/settings.service";

jest.mock("@/lib/contexts/SettingsContext", () => {
  const settings = { documents: { maxFileSizeMb: 50, allowedMimeTypes: [], trashRetentionDays: 30, maxVersionsPerDocument: 17 } };
  return { useSettings: () => ({ settings, refresh: jest.fn() }) };
});
jest.mock("@/lib/services/settings.service", () => ({ settingsService: { updateDocuments: jest.fn().mockResolvedValue({}) } }));

it("defaults legacy settings to 30 days and never submits the count cap", async () => {
  render(<QueryClientProvider client={new QueryClient()}><DocumentSettingsForm /></QueryClientProvider>);
  expect(screen.getByLabelText("Retención de versiones (días)")).toHaveValue(30);
  expect(screen.queryByLabelText("Versiones máximas")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Guardar cambios"));
  await waitFor(() => expect(settingsService.updateDocuments).toHaveBeenCalledWith({ maxFileSizeMb: 50, allowedMimeTypes: [], trashRetentionDays: 30, versionRetentionDays: 30 }));
});

it("constrains days to integer values from 1 to 3650", () => {
  render(<QueryClientProvider client={new QueryClient()}><DocumentSettingsForm /></QueryClientProvider>);
  const input = screen.getByLabelText("Retención de versiones (días)");
  for (const value of ["0", "3651", "1.5", ""]) {
    fireEvent.change(input, { target: { value } });
    expect(input).toBeInvalid();
  }
  fireEvent.change(input, { target: { value: "3650" } });
  expect(input).toBeValid();
});
