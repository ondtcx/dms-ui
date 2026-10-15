import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FolderBrowser } from "../FolderBrowser";
import { documentsService } from "@/lib/services/documents.service";
import api from "@/lib/axios";
import type { Directory } from "@/lib/types";

jest.mock("@/lib/axios", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("@/lib/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "reader" } }) }));
jest.mock("@/components/documents/ReceptionSettingsDialog", () => ({ ReceptionSettingsDialog: () => null }));

const parent: Directory = {
  id: 7, name: "Nivel actual", parentId: 1, createdById: "owner", createdAt: "", updatedAt: "",
  capabilities: { owner: false, canView: true, canEdit: false, canUploadVersion: false, canShare: false },
};
const child = { ...parent, id: 8, name: "Subcarpeta", parentId: 7 };
const breadcrumb = [{ ...parent, id: 1, name: "Antecesor", parentId: null }, parent];

function mount(directory = parent) {
  (api.get as jest.Mock).mockImplementation(async (path, config) => {
    if (path === "/directories/7/breadcrumb") return { data: breadcrumb };
    if (path === "/directories") return { data: config.params.parentId === 7 ? [child] : [directory] };
    throw new Error(`Unexpected request: ${path}`);
  });
  const onNavigate = jest.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}>
    <FolderBrowser directoryId={7} onNavigate={onNavigate}><p>Documento del nivel actual</p></FolderBrowser>
  </QueryClientProvider>);
  return { ...view, onNavigate, client };
}

beforeEach(() => jest.clearAllMocks());

it("shows immediate children and documents together with breadcrumbs, root and up navigation", async () => {
  const { onNavigate } = mount();
  expect(await screen.findByRole("button", { name: "Subcarpeta" })).toBeInTheDocument();
  expect(screen.getByText("Documento del nivel actual")).toBeInTheDocument();
  await userEvent.click(await screen.findByRole("button", { name: "Subir un nivel" }));
  expect(onNavigate).toHaveBeenLastCalledWith(1);
  await userEvent.click(screen.getByRole("button", { name: "Raíz" }));
  expect(onNavigate).toHaveBeenLastCalledWith(null);
  await userEvent.click(screen.getByRole("button", { name: "Subcarpeta" }));
  expect(onNavigate).toHaveBeenLastCalledWith(8);
  expect(api.get).toHaveBeenCalledWith("/directories", { params: { parentId: 7 } });
});

it("allows navigation through a private ancestor without granting creation", async () => {
  mount({ ...parent, navigationOnly: true, capabilities: { ...parent.capabilities!, canUploadVersion: true } });
  expect(await screen.findByText(/Solo navegación: abre una subcarpeta/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Crear carpeta" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Subcarpeta" })).toBeEnabled();
});

it("creates a child only with effective upload permission, independent of metadata editing", async () => {
  mount({ ...parent, capabilities: { ...parent.capabilities!, canUploadVersion: true } });
  (api.post as jest.Mock).mockResolvedValue({ data: child });
  await userEvent.click(await screen.findByRole("button", { name: "Crear carpeta" }));
  await userEvent.type(screen.getByLabelText("Nombre de la carpeta"), "  Nueva  ");
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/directories", { name: "Nueva", parentId: 7 }));
});

it("does not mistake edit permission for upload or creation permission", async () => {
  mount({ ...parent, capabilities: { ...parent.capabilities!, canEdit: true } });
  await screen.findByRole("button", { name: "Subir un nivel" });
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/directories", { params: { parentId: 1 } }));
  expect(screen.queryByRole("button", { name: "Crear carpeta" })).not.toBeInTheDocument();
});

it("removes creation authority while its current-folder query is being refreshed", async () => {
  const { client } = mount({ ...parent, capabilities: { ...parent.capabilities!, canUploadVersion: true } });
  await screen.findByRole("button", { name: "Crear carpeta" });
  (api.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
  await act(async () => { void client.invalidateQueries({ queryKey: ["directory-current"] }); });
  await waitFor(() => expect(screen.queryByRole("button", { name: "Crear carpeta" })).not.toBeInTheDocument());
});

it("serializes the explicit root filter rather than letting Axios omit null", async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { data: [] } });
  await documentsService.getAll({ directoryId: null, page: 1 });
  expect(api.get).toHaveBeenCalledWith("/documents", { params: { directoryId: "null", page: 1 } });
});

it("hydrates only the current breadcrumb entry with effective directory metadata", async () => {
  mount({ ...parent, receptionEnabled: false, capabilities: { ...parent.capabilities!, canUploadVersion: true } });
  const result = await documentsService.getDirectoryBreadcrumb(7);
  expect(result.at(-1)).toMatchObject({ id: 7, receptionEnabled: false, capabilities: { canUploadVersion: true } });
  expect(result[0]).toEqual(breadcrumb[0]);
});

it('shows sharing summaries on child rows and a sharing action on an authorized current folder', async () => {
  mount({ ...parent, capabilities: { ...parent.capabilities!, canShare: true },
    sharingSummary: { shared: true, direct: true, inherited: false, public: false } });
  expect(await screen.findByRole('button', { name: 'Compartir carpeta Nivel actual' })).toBeInTheDocument();
  expect(screen.getByRole('note', { name: 'Compartido con otras personas' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Compartir carpeta Subcarpeta' })).not.toBeInTheDocument();
});
