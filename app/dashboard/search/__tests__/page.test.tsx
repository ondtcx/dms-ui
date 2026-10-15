import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SearchPage from "../page";
import { searchService } from "@/lib/services/search.service";
import { documentsService } from "@/lib/services/documents.service";

let mockParams = "q=informe";
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(mockParams),
}));

jest.mock("@/components/search/SearchFilters", () => ({
  SearchFilters: ({ value, onChange }: any) => <div>
    <output data-testid="filters">{JSON.stringify(value)}</output>
    <button onClick={() => onChange({ ...value, dateFrom: "2026-01-02" })}>Cambiar filtro</button>
  </div>,
}));

jest.mock("@/lib/services/search.service", () => ({
  searchService: { search: jest.fn(), getHistory: jest.fn(), getPopular: jest.fn() },
}));

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: { download: jest.fn() },
}));

const result = {
  id: "document-42",
  description: "Informe académico",
  createdAt: "2026-01-01T00:00:00Z",
  versions: [{ filename: "informe.pdf", mimetype: "application/pdf", size: 1024 }],
};

function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<SearchPage />, {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = "q=informe";
  (searchService.search as jest.Mock).mockResolvedValue({
    data: [result],
    meta: { total: 1, totalPages: 1, hasNextPage: false },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("URL search filters", () => {
  it("restores filters on navigation and serializes all filters while resetting page", async () => {
    mockParams = "q=informe&page=3&documentTypeId=7&categoryId=9&sortBy=filename&sortOrder=asc&dateFrom=2026-01-01&dateTo=2026-01-31&mimetypes=application%2Fpdf&mimetypes=application%2Fmsword";
    const view = renderSearch();
    await waitFor(() => expect(searchService.search).toHaveBeenCalledWith(expect.objectContaining({ page: 3, documentTypeIds: [7], mimetypes: ["application/pdf", "application/msword"], dateFrom: "2026-01-01", dateTo: "2026-01-31", sortBy: "filename", sortOrder: "asc" })));
    expect((searchService.search as jest.Mock).mock.calls[0][0].categoryIds).toBeUndefined();
    fireEvent.click(screen.getByText("Cambiar filtro"));
    const pushed = new URLSearchParams(mockPush.mock.calls[0][0].split("?")[1]);
    expect(pushed.get("page")).toBeNull();
    expect(pushed.get("documentTypeId")).toBe("7");
    expect(pushed.getAll("mimetypes")).toEqual(["application/pdf", "application/msword"]);
    expect(pushed.get("dateFrom")).toBe("2026-01-02");
    expect(pushed.get("dateTo")).toBe("2026-01-31");
    expect(pushed.get("sortBy")).toBe("filename");
    expect(pushed.get("sortOrder")).toBe("asc");
    expect(pushed.get("q")).toBe("informe");
    mockParams = "q=informe&page=2&documentTypeId=8&mimetypes=image%2F";
    view.rerender(<SearchPage />);
    await waitFor(() => expect(searchService.search).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, documentTypeIds: [8], mimetypes: ["image/"] })));
    expect(screen.getByTestId("filters")).toHaveTextContent('"documentTypeIds":[8]');
    mockParams = "q=informe&page=3&documentTypeId=7&sortBy=filename&sortOrder=asc&dateFrom=2026-01-01&dateTo=2026-01-31&mimetypes=application%2Fpdf&mimetypes=application%2Fmsword";
    view.rerender(<SearchPage />);
    expect(screen.getByTestId("filters")).toHaveTextContent('"documentTypeIds":[7]');
    expect(screen.getByTestId("filters")).toHaveTextContent('"dateFrom":"2026-01-01"');
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it.each(["NaN", "-2", "1.5", "0", "Infinity"])("ignores invalid positive integers %s", async invalid => {
    mockParams = `q=informe&page=${invalid}&documentTypeId=${invalid}`;
    renderSearch();
    await waitFor(() => expect(searchService.search).toHaveBeenCalledWith(expect.objectContaining({ page: 1, documentTypeIds: undefined })));
  });

  it("preserves filters and sorting when advancing the page", async () => {
    mockParams = "q=informe&documentTypeId=7&sortBy=size&sortOrder=asc&mimetypes=application%2Fmsword";
    (searchService.search as jest.Mock).mockResolvedValue({ data: [result], meta: { total: 40, totalPages: 2, hasNextPage: true } });
    renderSearch();
    fireEvent.click(await screen.findByText("Siguiente"));
    const params = new URLSearchParams(mockPush.mock.calls[0][0].split("?")[1]);
    expect(params.get("page")).toBe("2");
    expect(params.get("q")).toBe("informe");
    expect(params.get("documentTypeId")).toBe("7");
    expect(params.getAll("mimetypes")).toEqual(["application/msword"]);
    expect(params.get("sortBy")).toBe("size");
    expect(params.get("sortOrder")).toBe("asc");
  });

  it("rejects malformed dates without searching", async () => {
    mockParams = "q=informe&dateFrom=not-a-date";
    renderSearch();
    expect(await screen.findByRole("alert")).toHaveTextContent("Introduce fechas de subida válidas");
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it("passes precise timestamps unchanged and permits an equal boundary", async () => {
    const timestamp = "2026-01-01T12:30:00.000Z";
    mockParams = `q=informe&dateFrom=${timestamp}&dateTo=${timestamp}`;
    renderSearch();
    await waitFor(() => expect(searchService.search).toHaveBeenCalledWith(expect.objectContaining({ dateFrom: timestamp, dateTo: timestamp })));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["2026-06-10T23:59:59.999Z", "2026-06-10"],
    ["2026-06-10", "2026-06-10"],
    ["2026-06-10T10:00:00+02:00", "2026-06-10T08:00:00Z"],
  ])("searches for valid inclusive bounds %s / %s", async (dateFrom, dateTo) => {
    mockParams = new URLSearchParams({ q: "informe", dateFrom, dateTo }).toString();
    renderSearch();
    await waitFor(() => expect(searchService.search).toHaveBeenCalledWith(expect.objectContaining({ dateFrom, dateTo })));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["2026-06-11T00:00:00Z", "2026-06-10"],
    ["2026-06-10T08:00:00.001Z", "2026-06-10T10:00:00+02:00"],
  ])("blocks search beyond the upper bound %s / %s", async (dateFrom, dateTo) => {
    mockParams = new URLSearchParams({ q: "informe", dateFrom, dateTo }).toString();
    renderSearch();
    expect(await screen.findByRole("alert")).toHaveTextContent("La fecha de subida desde no puede ser posterior a la fecha de subida hasta");
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it("blocks search for a reversed date range with Spanish feedback", async () => {
    mockParams = "q=informe&dateFrom=2026-02-01&dateTo=2026-01-01";
    renderSearch();
    expect(await screen.findByRole("alert")).toHaveTextContent("La fecha de subida desde no puede ser posterior a la fecha de subida hasta");
    expect(searchService.search).not.toHaveBeenCalled();
  });

  it("restores, propagates and preserves the content-search option", async () => {
    mockParams = "q=informe&includeContent=true&documentTypeId=7";
    renderSearch();
    await waitFor(() => expect(searchService.search).toHaveBeenCalledWith(expect.objectContaining({ includeContent: true, documentTypeIds: [7] })));
    expect(screen.getByTestId("filters")).toHaveTextContent('"includeContent":true');
    fireEvent.click(screen.getByText("Cambiar filtro"));
    const pushed = new URLSearchParams(mockPush.mock.calls[0][0].split("?")[1]);
    expect(pushed.get("includeContent")).toBe("true");
    expect(pushed.get("dateFrom")).toBe("2026-01-02");
  });

  it("treats a missing or false content-search option as off", async () => {
    mockParams = "q=informe&includeContent=false";
    renderSearch();
    await waitFor(() => expect(searchService.search).toHaveBeenCalledWith(expect.objectContaining({ includeContent: undefined })));
    expect(screen.getByTestId("filters")).not.toHaveTextContent('"includeContent":true');
  });

  it("keeps the content-search option when advancing the page", async () => {
    mockParams = "q=informe&includeContent=true";
    (searchService.search as jest.Mock).mockResolvedValue({ data: [result], meta: { total: 40, totalPages: 2, hasNextPage: true } });
    renderSearch();
    fireEvent.click(await screen.findByText("Siguiente"));
    const params = new URLSearchParams(mockPush.mock.calls[0][0].split("?")[1]);
    expect(params.get("page")).toBe("2");
    expect(params.get("includeContent")).toBe("true");
  });
});

describe("Search result filename navigation", () => {
  it("links the filename to document detail with its existing styling", async () => {
    renderSearch();

    const filename = await screen.findByText("informe.pdf");
    expect(filename).toHaveRole("link");
    expect(filename).toHaveAttribute("href", "/dashboard/documents/document-42");
    expect(filename).toHaveClass("font-medium", "text-sm", "truncate");
  });

  it("keeps download outside the filename link and downloads the result ID", async () => {
    const blob = new Blob(["document"], { type: "application/pdf" });
    (documentsService.download as jest.Mock).mockResolvedValue(blob);
    const originalCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    const originalRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
    const createObjectURL = jest.fn(() => "blob:document-42");
    const revokeObjectURL = jest.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    try {
      renderSearch();
      await screen.findByText("informe.pdf");
      const download = screen.getByTitle("Descargar");
      expect(download).toHaveRole("button");
      expect(download.closest("a")).toBeNull();

      fireEvent.click(download);

      await waitFor(() => expect(documentsService.download).toHaveBeenCalledWith("document-42"));
      expect(documentsService.download).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:document-42"));
      expect(createObjectURL).toHaveBeenCalledWith(blob);
    } finally {
      if (originalCreate) Object.defineProperty(URL, "createObjectURL", originalCreate);
      else Reflect.deleteProperty(URL, "createObjectURL");
      if (originalRevoke) Object.defineProperty(URL, "revokeObjectURL", originalRevoke);
      else Reflect.deleteProperty(URL, "revokeObjectURL");
    }
  });
});
