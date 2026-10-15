import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DirectoryNavigation } from "../DirectoryNavigation";
import { documentsService } from "@/lib/services/documents.service";
import type { Directory } from "@/lib/types";
import { directorySharingService } from '@/lib/services/directory-sharing.service';
jest.mock('@/lib/services/directory-sharing.service', () => ({ directorySharingService: { get: jest.fn() } }));

// El actor actual es propietario de las carpetas creadas por "owner-1".
let currentUser: { id: string } | null = { id: "owner-1" };
jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user: currentUser }),
}));

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    listDirectories: jest.fn(),
    getDirectoryBreadcrumb: jest.fn(),
    createDirectory: jest.fn(),
    updateDirectory: jest.fn(),
    deleteDirectory: jest.fn(),
    getReception: jest.fn(),
    configureReception: jest.fn(),
  },
}));

function directory(
  overrides: Partial<Directory> & Pick<Directory, "id" | "name" | "createdById">,
): Directory {
  return { parentId: null, createdAt: "", updatedAt: "", ...overrides };
}

function renderNav(
  client: QueryClient,
  props: {
    picker?: boolean;
    onChange?: (directoryId: number | null) => void;
  } = {},
) {
  return render(
    <QueryClientProvider client={client}>
      <DirectoryNavigation
        value={null}
        onChange={props.onChange ?? jest.fn()}
        picker={props.picker}
      />
    </QueryClientProvider>,
  );
}

function setup(
  folders: Directory[],
  props: {
    picker?: boolean;
    onChange?: (directoryId: number | null) => void;
    client?: QueryClient;
  } = {},
) {
  jest.mocked(documentsService.listDirectories).mockResolvedValue(folders);
  jest.mocked(documentsService.getDirectoryBreadcrumb).mockResolvedValue([]);
  const client =
    props.client ??
    new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { ...renderNav(client, props), client };
}

beforeEach(() => {
  jest.clearAllMocks();
  currentUser = { id: "owner-1" };
});

const ownerFolder = directory({ id: 1, name: "Páginas", createdById: "owner-1" });
const foreignFolder = directory({ id: 2, name: "Archivo", createdById: "other-1" });
const receptionFolder = directory({
  id: 3,
  name: "Recepción",
  createdById: "other-1",
  receptionEnabled: true,
});

it('renders outgoing row sharing from the batched summary without a sharing lookup', async () => {
  setup([{ ...foreignFolder, sharingSummary: { shared: true, direct: true, inherited: false, public: false },
    capabilities: { owner: false, canView: true, canEdit: false, canUploadVersion: false, canShare: true } }]);
  expect(await screen.findByRole('note', { name: 'Compartido con otras personas' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Compartir carpeta Archivo' })).toBeInTheDocument();
  expect(directorySharingService.get).not.toHaveBeenCalled();
});

it("never exposes a folder settings button from the hierarchy cards", async () => {
  setup([
    ownerFolder,
    receptionFolder,
    directory({ id: 4, name: "Sin definir", createdById: "owner-1" }),
  ]);
  await screen.findByRole("button", { name: "Recepción: Recepción" });
  expect(
    screen.queryByRole("button", { name: /Configurar recepción/ }),
  ).not.toBeInTheDocument();
});

it("renders each folder name in full inside its own row", async () => {
  const longName = "Documentación institucional de evaluación";
  setup([directory({ id: 6, name: longName, createdById: "owner-1" })]);
  const label = await screen.findByText(longName);
  expect(label).not.toHaveClass("truncate");
  expect(label).toHaveClass("break-words");
});

it("hides mutation actions on a non-owner read-only folder", async () => {
  setup([foreignFolder]);
  await screen.findByRole("button", { name: "Archivo" });
  expect(
    screen.queryByRole("button", { name: "Configurar recepción de Archivo" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Eliminar Archivo" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Renombrar Archivo" })).not.toBeInTheDocument();
});

it("never shows management actions in picker mode", async () => {
  setup([ownerFolder, receptionFolder], { picker: true });
  await screen.findByRole("button", { name: "Páginas" });
  expect(
    screen.queryByRole("button", { name: /Configurar recepción/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Renombrar/ }),
  ).not.toBeInTheDocument();
});

it("labels a reception folder distinctly so it is discoverable as an inbox", async () => {
  setup([receptionFolder]);
  expect(
    await screen.findByRole("button", { name: "Recepción: Recepción" }),
  ).toBeInTheDocument();
});

it("lets a non-owner select a reception folder for read-only navigation", async () => {
  const onChange = jest.fn();
  setup([receptionFolder], { onChange });
  await userEvent.click(
    await screen.findByRole("button", { name: "Recepción: Recepción" }),
  );
  expect(onChange).toHaveBeenCalledWith(3);
});

it("does not reuse a previous actor's cached folder names", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  currentUser = { id: "actor-a" };
  const view = setup([receptionFolder], { client });
  expect(
    await screen.findByRole("button", { name: "Recepción: Recepción" }),
  ).toBeInTheDocument();

  currentUser = { id: "actor-b" };
  jest
    .mocked(documentsService.listDirectories)
    .mockRejectedValue({ response: { status: 403 } });
  jest
    .mocked(documentsService.getDirectoryBreadcrumb)
    .mockRejectedValue({ response: { status: 403 } });
  view.rerender(
    <QueryClientProvider client={client}>
      <DirectoryNavigation value={null} onChange={jest.fn()} />
    </QueryClientProvider>,
  );

  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: /Recepción/ }),
    ).not.toBeInTheDocument(),
  );
  expect(
    screen.queryByRole("button", { name: /Renombrar/ }),
  ).not.toBeInTheDocument();
});

it("hides folder names while the same-actor query is erroring", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  currentUser = { id: "actor-a" };
  setup([receptionFolder], { client });
  expect(
    await screen.findByRole("button", { name: "Recepción: Recepción" }),
  ).toBeInTheDocument();

  jest
    .mocked(documentsService.listDirectories)
    .mockRejectedValue({ response: { status: 500 } });
  await act(async () => {
    await client.invalidateQueries({ queryKey: ["directories"] });
  });
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: /Recepción/ }),
    ).not.toBeInTheDocument(),
  );
});

it("does not query folders without an authenticated identity", async () => {
  currentUser = null;
  setup([receptionFolder]);
  await waitFor(() =>
    expect(documentsService.listDirectories).not.toHaveBeenCalled(),
  );
  expect(
    screen.queryByRole("button", { name: /Recepción/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Raíz" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Crear carpeta" })).not.toBeInTheDocument();
});
