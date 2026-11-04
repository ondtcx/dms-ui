import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewerPicker } from "../ReviewerPicker";

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

const users = [
  {
    id: "u1",
    name: "Erika Ramirez",
    email: "rector@colegio.edu",
    role: "rector",
    roles: [{ id: 1, key: "rector", label: "Rector" }],
  },
  {
    id: "u2",
    name: "Fabian Díaz",
    email: "secretaria@colegio.edu",
    role: "secretario",
    roles: [{ id: 2, key: "secretario", label: "Secretario" }],
  },
];

function renderPicker(value = "", onChange = jest.fn()) {
  render(
    <ReviewerPicker
      id="reviewer"
      users={users}
      value={value}
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe("ReviewerPicker", () => {
  it("shows name, email and role and filters by any of them", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText(/rector@colegio\.edu/)).toBeInTheDocument();
    expect(screen.getByText(/Rector/)).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Buscar por nombre, correo o rol…"),
      "secretario",
    );
    await user.click(screen.getByText("Fabian Díaz"));

    expect(onChange).toHaveBeenCalledWith("u2");
  });

  it("shows loading feedback while users are being fetched", async () => {
    const user = userEvent.setup();
    render(
      <ReviewerPicker
        id="reviewer"
        users={[]}
        value=""
        onChange={jest.fn()}
        loading
      />,
    );

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("status")).toHaveTextContent("Cargando usuarios…");
  });

  it("selects a filtered reviewer with the keyboard", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByRole("combobox"));
    await user.type(
      screen.getByPlaceholderText("Buscar por nombre, correo o rol…"),
      "Erika",
    );
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("u1");
  });

  it("keeps the shared queue option available", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker("u1");

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Cualquier usuario del módulo"));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("renders the selected reviewer details in the trigger", () => {
    renderPicker("u1");

    expect(screen.getByRole("combobox")).toHaveTextContent("Erika Ramirez");
    expect(screen.getByRole("combobox")).toHaveTextContent(
      "rector@colegio.edu · Rector",
    );
  });
});
