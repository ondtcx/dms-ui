import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AppearanceForm } from "@/components/settings/AppearanceForm";
import { settingsService } from "@/lib/services/settings.service";

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/lib/services/settings.service", () => ({
  settingsService: { updateAppearance: jest.fn() },
}));

const mockSettings = {
  appearance: {
    primaryColor: "not-a-color",
    secondaryColor: "",
    theme: "invalid",
    legacyColor: "#ffffff",
  },
};
const mockRefresh = jest.fn();

jest.mock("@/lib/contexts/SettingsContext", () => {
  const actual = jest.requireActual("@/lib/contexts/SettingsContext");

  return {
    ...actual,
    useSettings: () => ({
      settings: mockSettings,
      refresh: mockRefresh,
    }),
  };
});

const mockedUpdateAppearance = settingsService.updateAppearance as jest.MockedFunction<
  typeof settingsService.updateAppearance
>;
const mockedToast = toast as unknown as { error: jest.Mock; success: jest.Mock };

function renderAppearanceForm() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AppearanceForm />
    </QueryClientProvider>,
  );
}

describe("AppearanceForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUpdateAppearance.mockResolvedValue({} as never);
  });

  it("starts with safe normalized values from persisted appearance settings", () => {
    renderAppearanceForm();

    expect(screen.getAllByDisplayValue("#1e3a5f")).toHaveLength(2);
    expect(screen.getAllByDisplayValue("#047857")).toHaveLength(2);
    expect(screen.getByRole("combobox")).toHaveTextContent("Sistema (automático)");
  });

  it("prevents invalid colors and sends only the validated appearance payload", async () => {
    renderAppearanceForm();

    const colorInputs = screen.getAllByRole("textbox");
    fireEvent.change(colorInputs[0], { target: { value: " #abc " } });
    fireEvent.change(colorInputs[1], { target: { value: "invalid" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(mockedUpdateAppearance).not.toHaveBeenCalled();
    expect(mockedToast.error).toHaveBeenCalledWith("Introduce colores hexadecimales válidos.");

    fireEvent.change(colorInputs[1], { target: { value: " #123456 " } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mockedUpdateAppearance).toHaveBeenCalledWith({
        primaryColor: "#aabbcc",
        secondaryColor: "#123456",
        theme: "system",
      }),
    );
  });
});
