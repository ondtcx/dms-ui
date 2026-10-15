import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SearchFilters, SearchFiltersValue } from "../SearchFilters";
import { documentTypesService } from "@/lib/services/document-types.service";

jest.mock("@/lib/services/document-types.service", () => ({ documentTypesService: { getActive: jest.fn() } }));
jest.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => <select value={value} onChange={e => onValueChange(e.target.value)}>{children}</select>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

function setup(value: SearchFiltersValue = {}) {
  const onChange = jest.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SearchFilters value={value} onChange={onChange} /></QueryClientProvider>);
  fireEvent.click(screen.getByText("Filtros"));
  return onChange;
}

beforeEach(() => {
  jest.clearAllMocks();
  (documentTypesService.getActive as jest.Mock).mockResolvedValue([
    { id: 7, name: "Informe", isActive: true, category: { name: "Docencia" } },
    { id: 8, name: "Informe", isActive: true, category: { name: "Gestión" } },
  ]);
});

it("loads the unrestricted institutional catalog and selects disambiguated types", async () => {
  const onChange = setup();
  await screen.findByText("Informe (Docencia)");
  expect(documentTypesService.getActive).toHaveBeenCalledWith();
  expect(screen.getByText("Informe (Gestión)")).toBeInTheDocument();
  expect(screen.queryByText("Categoría")).not.toBeInTheDocument();
  fireEvent.change(screen.getAllByRole("combobox")[2], { target: { value: "7" } });
  expect(onChange).toHaveBeenCalledWith({ documentTypeIds: [7] });
});

it("keeps an unknown selected type visible and exposes upload constraints and reset", async () => {
  const onChange = setup({ documentTypeIds: [99], dateFrom: "2026-01-01", dateTo: "2026-01-31", sortBy: "filename", sortOrder: "asc" });
  expect(screen.getByText("Tipo institucional #99")).toBeInTheDocument();
  expect(screen.getByLabelText("Fecha de subida desde")).toHaveAttribute("max", "2026-01-31");
  expect(screen.getByLabelText("Fecha de subida hasta")).toHaveAttribute("min", "2026-01-01");
  fireEvent.change(screen.getByLabelText("Fecha de subida desde"), { target: { value: "2026-01-02" } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ dateFrom: "2026-01-02" }));
  fireEvent.click(screen.getByText("Limpiar filtros"));
  expect(onChange).toHaveBeenLastCalledWith({ sortBy: "filename", sortOrder: "asc" });
  await waitFor(() => expect(documentTypesService.getActive).toHaveBeenCalled());
});

it.each([
  ["PDF", ["application/pdf"]],
  ["Word", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]],
  ["Excel", ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"]],
  ["Imagen", ["image/"]],
])("toggles the complete %s format group", async (label, mimetypes) => {
  const onChange = setup();
  expect(screen.getByText("Formato de archivo")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(label));
  expect(onChange).toHaveBeenLastCalledWith({ mimetypes });
  await waitFor(() => expect(documentTypesService.getActive).toHaveBeenCalled());
});

it("removes modern and legacy formats together while retaining unrelated MIME values", async () => {
  const onChange = setup({ mimetypes: ["application/msword", "application/pdf"] });
  fireEvent.click(screen.getByLabelText("Word"));
  expect(onChange).toHaveBeenLastCalledWith({ mimetypes: ["application/pdf"] });
  await waitFor(() => expect(documentTypesService.getActive).toHaveBeenCalled());
});

it("offers an unchecked content search toggle", async () => {
  const onChange = setup();
  const content = screen.getByLabelText("Buscar también en el contenido");
  expect(content).not.toBeChecked();
  fireEvent.click(content);
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ includeContent: true }));
  await waitFor(() => expect(documentTypesService.getActive).toHaveBeenCalled());
});

it("clears the content search option when filters are reset", async () => {
  const onChange = setup({ includeContent: true, dateFrom: "2026-01-01" });
  expect(screen.getByLabelText("Buscar también en el contenido")).toBeChecked();
  fireEvent.click(screen.getByLabelText("Buscar también en el contenido"));
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ includeContent: undefined }));
  fireEvent.click(screen.getByText("Limpiar filtros"));
  expect(onChange.mock.calls.at(-1)[0]).not.toHaveProperty("includeContent", true);
  await waitFor(() => expect(documentTypesService.getActive).toHaveBeenCalled());
});
