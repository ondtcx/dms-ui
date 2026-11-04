import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { NewDocumentButton } from "../NewDocumentButton";

function renderButton(options: { disabled?: boolean; label?: string } = {}) {
  const onClick = jest.fn();
  render(
    <NewDocumentButton
      onClick={onClick}
      disabled={options.disabled}
      label={options.label}
    />,
  );
  return { onClick };
}

describe("NewDocumentButton", () => {
  it("renders one Crear action and opens the creation dialog", async () => {
    const user = userEvent.setup();
    const { onClick } = renderButton();

    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports a custom accessible label", () => {
    renderButton({ label: "Nuevo documento" });
    expect(
      screen.getByRole("button", { name: "Nuevo documento" }),
    ).toBeInTheDocument();
  });

  it("does not open the dialog while disabled", async () => {
    const user = userEvent.setup();
    const { onClick } = renderButton({ disabled: true });

    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
