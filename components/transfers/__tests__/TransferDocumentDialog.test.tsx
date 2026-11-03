import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TransferDocumentDialog } from "../TransferDocumentDialog";
import { usersService } from "@/lib/services/users.service";
import { transfersService } from "@/lib/services/transfers.service";
import type { Document } from "@/lib/types";

const mockUser = {
  id: "owner",
  email: "owner@example.com",
  name: "Owner",
  role: "user",
  createdAt: "",
  updatedAt: "",
  roles: ["user"],
};

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock("@/lib/services/users.service", () => ({
  usersService: { getAllForSelection: jest.fn() },
}));
jest.mock("@/lib/services/transfers.service", () => ({
  transfersService: { create: jest.fn(), createForOwner: jest.fn() },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const document = {
  id: 12,
  name: "Planificación",
  uploadedById: "owner",
  uploadedBy: { id: "owner", name: "Owner", email: "owner@example.com" },
  actionCapabilities: { scope: "ordinary" },
} as unknown as Document;

function mount(onOpenChange = jest.fn(), target: Document = document) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TransferDocumentDialog
        document={target}
        open
        onOpenChange={onOpenChange}
      />
    </QueryClientProvider>,
  );
}

describe("TransferDocumentDialog", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser.role = "user";
    mockUser.roles = ["user"];
    (usersService.getAllForSelection as jest.Mock).mockResolvedValue([
      { id: "recipient", name: "Recipient", email: "recipient@example.com" },
    ]);
    (transfersService.create as jest.Mock).mockResolvedValue({ id: 1 });
    (transfersService.createForOwner as jest.Mock).mockResolvedValue({ id: 2 });
  });

  it("sends a transfer request to the selected active user", async () => {
    const onOpenChange = jest.fn();
    mount(onOpenChange);

    expect(screen.getByRole("button", { name: "Enviar solicitud" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Usuario destinatario"));
    fireEvent.click(await screen.findByRole("option", { name: "Recipient" }));
    fireEvent.change(screen.getByLabelText("Motivo o comentario"), {
      target: { value: "Reemplazo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() =>
      expect(transfersService.create).toHaveBeenCalledWith({
        documentId: 12,
        toUserId: "recipient",
        comment: "Reemplazo",
      }),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("uses the admin endpoint when an admin transfers someone else's document", async () => {
    mockUser.role = "admin";
    mockUser.roles = ["admin"];
    mount(jest.fn(), {
      ...document,
      uploadedById: "other-owner",
      uploadedBy: {
        id: "other-owner",
        name: "Other Owner",
        email: "other@example.com",
      },
    });

    fireEvent.click(screen.getByLabelText("Usuario destinatario"));
    fireEvent.click(await screen.findByRole("option", { name: "Recipient" }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    await waitFor(() =>
      expect(transfersService.createForOwner).toHaveBeenCalledWith({
        documentId: 12,
        toUserId: "recipient",
        comment: undefined,
      }),
    );
    expect(transfersService.create).not.toHaveBeenCalled();

    mockUser.role = "user";
    mockUser.roles = ["user"];
  });
});
