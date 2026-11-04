import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthoringReviewCard } from "../AuthoringReviewCard";
import { authoringService } from "@/lib/services/authoring.service";
import type { Document } from "@/lib/types";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", name: "Ana", role: "admin", roles: ["admin"] },
  }),
}));

jest.mock("@/lib/services/authoring.service", () => ({
  authoringService: {
    approve: jest.fn(),
    returnDocument: jest.fn(),
    emit: jest.fn(),
    archive: jest.fn(),
  },
}));

function makeDocument(overrides: Record<string, unknown> = {}): Document {
  return {
    id: 11,
    name: "Acta de consejo",
    description: null,
    categoryId: null,
    category: null,
    isPublic: false,
    uploadedBy: {
      id: "u1",
      name: "Ana Torres",
      email: "ana@colegio.edu",
      role: "secretario",
    },
    uploadedById: "u1",
    templateId: 2,
    currentVersion: 1,
    versions: [],
    archivedAt: null,
    documentNumber: null,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
    authoring: {
      id: 1,
      status: "IN_REVIEW",
      reviewerId: null,
      reviewerName: null,
      submittedAt: "2026-11-01T11:00:00.000Z",
      events: [],
    },
    ...overrides,
  } as unknown as Document;
}

function renderCard(document = makeDocument()) {
  const onChanged = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AuthoringReviewCard document={document} onChanged={onChanged} />
    </QueryClientProvider>,
  );
  return { onChanged };
}

beforeEach(() => {
  jest.clearAllMocks();
  (authoringService.approve as jest.Mock).mockResolvedValue({});
  (authoringService.returnDocument as jest.Mock).mockResolvedValue({});
  (authoringService.emit as jest.Mock).mockResolvedValue({});
  (authoringService.archive as jest.Mock).mockResolvedValue({});
});

describe("AuthoringReviewCard", () => {
  it("shows the stage, reviewer and quick review actions", () => {
    renderCard();

    expect(screen.getAllByText("En revisión").length).toBeGreaterThan(0);
    expect(screen.getByText(/sin asignar/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprobar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Devolver" })).toBeInTheDocument();
  });

  it("approves from the document detail", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Aprobar" }));

    await waitFor(() =>
      expect(authoringService.approve).toHaveBeenCalledWith(11, {
        observation: undefined,
      }),
    );
  });

  it("emits an approved document after confirmation", async () => {
    const user = userEvent.setup();
    renderCard(
      makeDocument({
        authoring: {
          id: 1,
          status: "APPROVED",
          reviewerName: "Erika Ramirez",
          events: [],
        },
      }),
    );

    await user.click(
      screen.getByRole("button", { name: "Emitir y numerar" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Emitir y numerar" }),
    );

    await waitFor(() =>
      expect(authoringService.emit).toHaveBeenCalledWith(11),
    );
  });

  it("links a draft to the editor and to activity", () => {
    renderCard(
      makeDocument({
        authoring: { id: 1, status: "DRAFT", events: [] },
      }),
    );

    expect(
      screen.getByRole("link", { name: /Editar contenido/ }),
    ).toHaveAttribute("href", "/dashboard/elaboracion/11/editar");
    expect(
      screen.getByRole("link", { name: /Ver trazabilidad/ }),
    ).toHaveAttribute("href", "/dashboard/elaboracion/11");
  });
});
