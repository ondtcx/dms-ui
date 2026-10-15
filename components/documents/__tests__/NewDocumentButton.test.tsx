import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { NewDocumentButton } from "../NewDocumentButton";
import { UserRole } from "@/lib/types";

// El menú compartido no depende del rol: aun con un rol autorizado debe mostrar
// únicamente las dos opciones de carga.
jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1", name: "Ana", role: UserRole.ADMIN },
  }),
}));

function renderButton(options: { uploadDisabled?: boolean } = {}) {
  const onUploadSingle = jest.fn();
  const onUploadMultiple = jest.fn();
  render(
    <NewDocumentButton
      aria-label="Nuevo documento"
      onUploadSingle={onUploadSingle}
      onUploadMultiple={onUploadMultiple}
      uploadDisabled={options.uploadDisabled}
    />,
  );
  return { onUploadSingle, onUploadMultiple };
}

describe("NewDocumentButton", () => {
  it("shows only the single-file and multiple-file upload choices", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "Nuevo documento" }));

    expect(await screen.findByText("Subir Archivo")).toBeInTheDocument();
    expect(screen.getByText("Subir Múltiples Archivos")).toBeInTheDocument();
    expect(screen.queryByText("Desde Plantilla")).not.toBeInTheDocument();
    expect(screen.queryByText("Crear en Editor")).not.toBeInTheDocument();
    expect(screen.queryByText("Generar en Lote")).not.toBeInTheDocument();
    expect(screen.queryByText("Escanear Documento")).not.toBeInTheDocument();
  });

  it("invokes the single upload callback without touching the multiple callback", async () => {
    const user = userEvent.setup();
    const { onUploadSingle, onUploadMultiple } = renderButton();

    await user.click(screen.getByRole("button", { name: "Nuevo documento" }));
    await user.click(await screen.findByText("Subir Archivo"));

    expect(onUploadSingle).toHaveBeenCalledTimes(1);
    expect(onUploadMultiple).not.toHaveBeenCalled();
  });

  it("invokes the multiple upload callback without touching the single callback", async () => {
    const user = userEvent.setup();
    const { onUploadSingle, onUploadMultiple } = renderButton();

    await user.click(screen.getByRole("button", { name: "Nuevo documento" }));
    await user.click(await screen.findByText("Subir Múltiples Archivos"));

    expect(onUploadMultiple).toHaveBeenCalledTimes(1);
    expect(onUploadSingle).not.toHaveBeenCalled();
  });

  it("disables both upload choices when uploadDisabled is set", async () => {
    const user = userEvent.setup();
    renderButton({ uploadDisabled: true });

    await user.click(screen.getByRole("button", { name: "Nuevo documento" }));

    expect(
      (await screen.findByText("Subir Archivo")).closest('[role="menuitem"]'),
    ).toHaveAttribute("data-disabled");
    expect(
      screen.getByText("Subir Múltiples Archivos").closest('[role="menuitem"]'),
    ).toHaveAttribute("data-disabled");
  });

  it("does not invoke the upload callbacks while uploadDisabled is set", async () => {
    const user = userEvent.setup();
    const { onUploadSingle, onUploadMultiple } = renderButton({
      uploadDisabled: true,
    });

    await user.click(screen.getByRole("button", { name: "Nuevo documento" }));
    await user.click(await screen.findByText("Subir Archivo"));
    await user.click(screen.getByText("Subir Múltiples Archivos"));

    expect(onUploadSingle).not.toHaveBeenCalled();
    expect(onUploadMultiple).not.toHaveBeenCalled();
  });
});
