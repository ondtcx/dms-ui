import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DocumentDetailPage from "../page";
import { documentsService } from "@/lib/services/documents.service";

let actor: { id: string; role: string; roles?: string[] } = { id: "actor-a", role: "admin" };
const push = jest.fn();

jest.mock("@/lib/contexts/AuthContext", () => ({ useAuth: () => ({ user: actor }) }));
jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "7" }),
  useRouter: () => ({ push, back: jest.fn() }),
}));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/services/documents.service", () => ({
  documentsService: { getOne: jest.fn(), delete: jest.fn(), view: jest.fn() },
}));
jest.mock("@/components/workflows/DocumentWorkflowPanel", () => ({ DocumentWorkflowPanel: () => <div>Workflow mounted</div> }));
jest.mock("@/components/documents/OfficeDocumentPreview", () => ({
  __esModule: true,
  default: () => null,
  isOfficePreviewType: () => false,
}));
jest.mock("@/components/documents/ExplainPermissionsDialog", () => ({ ExplainPermissionsDialog: () => null }));
jest.mock("@/components/documents/DocumentVersionHistory", () => ({ DocumentVersionHistory: () => null }));
jest.mock("@/components/documents/EditDocumentDialog", () => ({ EditDocumentDialog: () => null }));
jest.mock("@/components/documents/ReplaceFileDialog", () => ({ ReplaceFileDialog: () => null }));
jest.mock("@/components/ui/dropdown-menu", () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    DropdownMenu: Container,
    DropdownMenuTrigger: Container,
    DropdownMenuContent: Container,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
      <button onClick={onClick}>{children}</button>
    ),
  };
});

const flags = {
  scope: "ordinary",
  editMetadata: false,
  editContent: false,
  move: false,
  trash: false,
  restore: false,
  permanentDelete: false,
  manageSharing: false,
};
const doc = {
  id: 7,
  name: "Documento",
  versions: [{ filename: "file.bin", mimetype: "application/octet-stream", size: 1 }],
  uploadedBy: { name: "Ana", role: "admin" },
  uploadedById: "actor-a",
  currentVersion: 1,
  createdAt: "2026-10-12",
  updatedAt: "2026-10-12",
  templateId: null,
  actionCapabilities: flags,
};

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DocumentDetailPage />
    </QueryClientProvider>,
  );
};

const AUDIT_LABEL = "Registro de actividad";
const AUDIT_PATH = "/dashboard/documents/7/audit";

it('shows activity to a secretario owner without mounting workflows', async () => {
  actor = { id: 'actor-a', role: 'secretario' };
  jest.mocked(documentsService.getOne).mockResolvedValue(doc as never);
  setup();
  await screen.findByRole('heading', { name: 'Documento' });
  expect(screen.getByRole('button', { name: AUDIT_LABEL })).toBeInTheDocument();
  expect(screen.queryByText('Workflow mounted')).not.toBeInTheDocument();
});

describe("document detail audit navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    actor = { id: "actor-a", role: "admin" };
    jest.mocked(documentsService.getOne).mockResolvedValue(doc as never);
  });

  it.each(["admin", "rector"])("shows the audit history for the primary %s role and navigates", async (role) => {
    actor = { id: "actor-a", role };
    setup();
    await screen.findByRole("heading", { name: "Documento" });
    fireEvent.click(screen.getByRole("button", { name: AUDIT_LABEL }));
    expect(push).toHaveBeenCalledWith(AUDIT_PATH);
  });

  it.each(["admin", "rector"])("shows the audit history through an effective %s role", async (effective) => {
    actor = { id: "actor-a", role: "profesor", roles: [effective] };
    setup();
    await screen.findByRole("heading", { name: "Documento" });
    expect(screen.getByRole("button", { name: AUDIT_LABEL })).toBeInTheDocument();
  });

  it.each(["coordinador", "profesor", "secretario", "estudiante"])(
    "hides the audit history for the %s role",
    async (role) => {
      actor = { id: "shared-reader", role };
      setup();
      await screen.findByRole("heading", { name: "Documento" });
      expect(screen.queryByRole("button", { name: AUDIT_LABEL })).not.toBeInTheDocument();
    },
  );

  it("hides the audit history for an effective coordinador role", async () => {
    actor = { id: "shared-reader", role: "profesor", roles: ["coordinador"] };
    setup();
    await screen.findByRole("heading", { name: "Documento" });
    expect(screen.queryByRole("button", { name: AUDIT_LABEL })).not.toBeInTheDocument();
  });

  it("keeps the Auditar Accesos permission action unchanged and separate", async () => {
    actor = { id: "shared-reader", role: "coordinador" };
    setup();
    await screen.findByRole("heading", { name: "Documento" });
    expect(screen.getByRole("button", { name: "Auditar Accesos" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: AUDIT_LABEL })).not.toBeInTheDocument();
  });
});
