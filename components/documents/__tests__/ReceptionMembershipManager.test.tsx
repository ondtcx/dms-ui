import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ReceptionMembershipManager,
  type ReceptionMembershipManagerProps,
} from "../ReceptionMembershipManager";
import { documentsService } from "@/lib/services/documents.service";
import {
  receptionMembershipQueryKey,
  receptionRecipientsQueryKey,
} from "@/lib/reception-membership";
import type {
  Directory,
  DirectoryMembership,
  ReceptionCapabilities,
} from "@/lib/types";

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    getReceptionMembership: jest.fn(),
    setReceptionParticipant: jest.fn(),
    removeReceptionUserParticipant: jest.fn(),
    removeReceptionRoleParticipant: jest.fn(),
    setReceptionDelegate: jest.fn(),
    removeReceptionDelegate: jest.fn(),
    searchReceptionUserRecipients: jest.fn(),
    searchReceptionRoleRecipients: jest.fn(),
  },
}));

const directory: Directory = {
  id: 5,
  name: "Buzón",
  parentId: null,
  createdById: "owner-1",
  createdAt: "",
  updatedAt: "",
  receptionEnabled: true,
};

function caps(overrides: Partial<ReceptionCapabilities> = {}): ReceptionCapabilities {
  return {
    configure: false,
    manageParticipants: false,
    readAll: false,
    review: false,
    manageDelegates: false,
    manageStructure: false,
    owner: false,
    discover: true,
    submit: false,
    peerRead: false,
    ...overrides,
  };
}

const ALL_OPS = {
  configure: true,
  manageParticipants: true,
  readAll: true,
  review: true,
  manageDelegates: true,
  manageStructure: true,
};

function emptyMembership(): DirectoryMembership {
  return { users: [], roles: [], delegates: [] };
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function setup(props: Partial<ReceptionMembershipManagerProps> = {}, client = newClient()) {
  const view = render(
    <QueryClientProvider client={client}>
      <ReceptionMembershipManager
        directory={directory}
        actorId="actor-1"
        capabilities={caps()}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue(emptyMembership());
  jest.mocked(documentsService.searchReceptionUserRecipients).mockResolvedValue([]);
  jest.mocked(documentsService.searchReceptionRoleRecipients).mockResolvedValue([]);
});

// ─── Section gating ───────────────────────────────────────────────────────────

it("shows participants but not delegates when only manageParticipants is held", async () => {
  setup({ capabilities: caps({ manageParticipants: true }) });
  expect(await screen.findByText("Participantes")).toBeInTheDocument();
  expect(screen.queryByText("Delegados")).not.toBeInTheDocument();
});

it("shows delegates but not participants when only manageDelegates is held", async () => {
  setup({ capabilities: caps({ manageDelegates: true }) });
  expect(await screen.findByText("Delegados")).toBeInTheDocument();
  expect(screen.queryByText("Participantes")).not.toBeInTheDocument();
});

it("displays explicit user and role identifiers without inventing names", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [{ directoryId: 5, userId: "u-2", peerRead: false }],
    roles: [{ directoryId: 5, roleId: 3, peerRead: true }],
    delegates: [],
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  expect(
    await screen.findByRole("group", { name: "Usuario (ID): u-2" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Rol (ID): 3" })).toBeInTheDocument();
  expect(screen.queryByText(/Ana/)).not.toBeInTheDocument();
});

// ─── Participant creation ─────────────────────────────────────────────────────

it("adds a direct user participant with the exact whitelisted payload", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  jest.mocked(documentsService.setReceptionParticipant).mockResolvedValue({
    directoryId: 5,
    userId: "u-9",
    peerRead: true,
  });
  const { client } = setup({ capabilities: caps({ manageParticipants: true }) });
  const invalidate = jest.spyOn(client, "invalidateQueries");

  const search = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(
    screen.getByLabelText(
      "Habilitar visibilidad de entregas de otros (solo lectura)",
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Agregar participante" }));

  await waitFor(() =>
    expect(documentsService.setReceptionParticipant).toHaveBeenCalledWith(5, {
      userId: "u-9",
      peerRead: true,
    }),
  );
  await waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: receptionMembershipQueryKey(5, "actor-1"),
    }),
  );
});

it("adds a role participant with the exact payload", async () => {
  jest
    .mocked(documentsService.searchReceptionRoleRecipients)
    .mockResolvedValue([{ id: 3, key: "profesor", label: "Profesor" }]);
  jest.mocked(documentsService.setReceptionParticipant).mockResolvedValue({
    directoryId: 5,
    roleId: 3,
    peerRead: false,
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  fireEvent.click(await screen.findByRole("button", { name: /Profesor/ }));
  fireEvent.click(screen.getByRole("button", { name: "Agregar rol" }));

  await waitFor(() =>
    expect(documentsService.setReceptionParticipant).toHaveBeenCalledWith(5, {
      roleId: 3,
      peerRead: false,
    }),
  );
});

it("requires an explicit selection and resets it when the search text changes", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValueOnce([{ id: "u-9", name: "Ana", email: "ana@dms.test" }])
    .mockResolvedValueOnce([{ id: "u-10", name: "Otro", email: "otro@dms.test" }]);
  setup({ capabilities: caps({ manageParticipants: true }) });

  const search = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  expect(screen.getByRole("button", { name: "Agregar participante" })).toBeEnabled();

  fireEvent.change(search, { target: { value: "ot" } });
  await screen.findByRole("button", { name: /Otro/ });
  expect(screen.getByRole("button", { name: "Agregar participante" })).toBeDisabled();
});

it("hides user results while the search is pending and after a fetch error", async () => {
  const pending = deferred<{ id: string; name: string; email: string }[]>();
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockReturnValueOnce(pending.promise);
  setup({ capabilities: caps({ manageParticipants: true }) });

  const search = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search, { target: { value: "an" } });
  expect(screen.queryByRole("button", { name: /Ana/ })).not.toBeInTheDocument();

  await act(async () => {
    pending.reject({ response: { status: 403 } });
  });
  expect(screen.queryByRole("button", { name: /Ana/ })).not.toBeInTheDocument();
});

// ─── Participant update and removal ───────────────────────────────────────────

it("toggles peer-read on an existing direct participant through the upsert endpoint", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [{ directoryId: 5, userId: "u-2", peerRead: false }],
    roles: [],
    delegates: [],
  });
  jest.mocked(documentsService.setReceptionParticipant).mockResolvedValue({
    directoryId: 5,
    userId: "u-2",
    peerRead: true,
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  const row = await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  fireEvent.click(
    within(row).getByLabelText(
      "Puede visualizar entregas de otros participantes (solo lectura)",
    ),
  );

  await waitFor(() =>
    expect(documentsService.setReceptionParticipant).toHaveBeenCalledWith(5, {
      userId: "u-2",
      peerRead: true,
    }),
  );
});

it("removes a user participant only after explicit confirmation", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [{ directoryId: 5, userId: "u-2", peerRead: false }],
    roles: [],
    delegates: [],
  });
  jest.mocked(documentsService.removeReceptionUserParticipant).mockResolvedValue({
    removed: true,
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  fireEvent.click(await screen.findByRole("button", { name: "Quitar usuario u-2" }));
  expect(documentsService.removeReceptionUserParticipant).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await waitFor(() =>
    expect(documentsService.removeReceptionUserParticipant).toHaveBeenCalledWith(5, "u-2"),
  );
});

it("cancels a pending participant removal without mutating", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [{ directoryId: 5, userId: "u-2", peerRead: false }],
    roles: [],
    delegates: [],
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  fireEvent.click(await screen.findByRole("button", { name: "Quitar usuario u-2" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(documentsService.removeReceptionUserParticipant).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Quitar usuario u-2" })).toBeInTheDocument();
});

it("removes a role participant through the authored path", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [],
    roles: [{ directoryId: 5, roleId: 3, peerRead: false }],
    delegates: [],
  });
  jest.mocked(documentsService.removeReceptionRoleParticipant).mockResolvedValue({
    removed: true,
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  fireEvent.click(await screen.findByRole("button", { name: "Quitar rol 3" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  await waitFor(() =>
    expect(documentsService.removeReceptionRoleParticipant).toHaveBeenCalledWith(5, 3),
  );
});

// ─── Delegates ────────────────────────────────────────────────────────────────

it("grants full operational access only when the actor holds every operation", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  jest.mocked(documentsService.setReceptionDelegate).mockResolvedValue({
    directoryId: 5,
    userId: "u-9",
    full: true,
    configure: true,
    manageParticipants: true,
    readAll: true,
    review: true,
    manageDelegates: true,
    manageStructure: true,
  });
  setup({ capabilities: caps(ALL_OPS) });

  const search = await screen.findByLabelText("Buscar usuario para delegado");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByLabelText("Acceso operativo completo"));
  fireEvent.click(screen.getByRole("button", { name: "Agregar delegado" }));

  await waitFor(() =>
    expect(documentsService.setReceptionDelegate).toHaveBeenCalledWith(5, "u-9", {
      full: true,
      configure: true,
      manageParticipants: true,
      readAll: true,
      review: true,
      manageDelegates: true,
      manageStructure: true,
    }),
  );
});

it("never offers operational flags the actor does not hold", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  jest.mocked(documentsService.setReceptionDelegate).mockResolvedValue({
    directoryId: 5,
    userId: "u-9",
    full: false,
    configure: true,
    manageParticipants: false,
    readAll: false,
    review: false,
    manageDelegates: false,
    manageStructure: false,
  });
  setup({ capabilities: caps({ manageDelegates: true, configure: true }) });

  expect(screen.queryByLabelText("Gestionar estructura")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Acceso operativo completo")).not.toBeInTheDocument();

  const search = await screen.findByLabelText("Buscar usuario para delegado");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByLabelText("Configurar recepción"));
  fireEvent.click(screen.getByRole("button", { name: "Agregar delegado" }));

  await waitFor(() =>
    expect(documentsService.setReceptionDelegate).toHaveBeenCalledWith(5, "u-9", {
      full: false,
      configure: true,
      manageParticipants: false,
      readAll: false,
      review: false,
      manageDelegates: false,
      manageStructure: false,
    }),
  );
});

it("locks readAll while review is selected", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  jest.mocked(documentsService.setReceptionDelegate).mockResolvedValue({
    directoryId: 5,
    userId: "u-9",
    full: false,
    configure: false,
    manageParticipants: false,
    readAll: true,
    review: true,
    manageDelegates: false,
    manageStructure: false,
  });
  setup({ capabilities: caps(ALL_OPS) });

  const search = await screen.findByLabelText("Buscar usuario para delegado");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByLabelText("Revisar entregas"));

  const readAll = screen.getByLabelText("Ver todas las entregas");
  expect(readAll).toBeChecked();
  expect(readAll).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Agregar delegado" }));
  await waitFor(() =>
    expect(documentsService.setReceptionDelegate).toHaveBeenCalledWith(5, "u-9", {
      full: false,
      configure: false,
      manageParticipants: false,
      readAll: true,
      review: true,
      manageDelegates: false,
      manageStructure: false,
    }),
  );
});

it("keeps the owner row read-only and never offers ownership transfer", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [],
    roles: [],
    delegates: [
      {
        directoryId: 5,
        userId: "owner-1",
        full: true,
        configure: true,
        manageParticipants: true,
        readAll: true,
        review: true,
        manageDelegates: true,
        manageStructure: true,
      },
    ],
  });
  setup({ capabilities: caps(ALL_OPS) });

  const row = await screen.findByRole("group", { name: "Usuario (ID): owner-1" });
  expect(within(row).queryByRole("button", { name: /Quitar delegado owner-1/ })).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Quitar delegado owner-1" }),
  ).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: "Guardar delegado owner-1" }),
  ).not.toBeInTheDocument();
});

it("keeps the current actor's own delegation read-only", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [],
    roles: [],
    delegates: [
      {
        directoryId: 5,
        userId: "actor-1",
        full: false,
        configure: true,
        manageParticipants: false,
        readAll: true,
        review: true,
        manageDelegates: false,
        manageStructure: false,
      },
    ],
  });
  setup({ capabilities: caps(ALL_OPS) });

  await screen.findByRole("group", { name: "Usuario (ID): actor-1" });
  expect(
    screen.getByRole("button", { name: "Quitar delegado actor-1" }),
  ).toBeDisabled();
});

it("shows an existing higher-privilege delegation read-only", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [],
    roles: [],
    delegates: [
      {
        directoryId: 5,
        userId: "u-2",
        full: true,
        configure: true,
        manageParticipants: true,
        readAll: true,
        review: true,
        manageDelegates: true,
        manageStructure: true,
      },
    ],
  });
  setup({ capabilities: caps({ manageDelegates: true, configure: true }) });

  await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  expect(screen.getByText(/permisos superiores/i)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Guardar delegado u-2" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Quitar delegado u-2" }),
  ).toBeDisabled();
});

it("excludes the owner and the current actor from new delegate search results", async () => {
  jest.mocked(documentsService.searchReceptionUserRecipients).mockResolvedValue([
    { id: "owner-1", name: "Owner", email: "owner@dms.test" },
    { id: "actor-1", name: "Actor", email: "actor@dms.test" },
    { id: "u-9", name: "Ana", email: "ana@dms.test" },
  ]);
  setup({ capabilities: caps(ALL_OPS) });

  const search = await screen.findByLabelText("Buscar usuario para delegado");
  fireEvent.change(search, { target: { value: "an" } });

  expect(await screen.findByRole("button", { name: /Ana/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Owner/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Actor/ })).not.toBeInTheDocument();
});

it("keeps peer-read copy read-only and never promises edit, share or review", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [{ directoryId: 5, userId: "u-2", peerRead: true }],
    roles: [],
    delegates: [],
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  const row = await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  expect(
    within(row).getByLabelText(
      "Puede visualizar entregas de otros participantes (solo lectura)",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/nunca otorga edición, uso compartido ni revisión/i),
  ).toBeInTheDocument();
});

// ─── Safety ───────────────────────────────────────────────────────────────────

it("fails closed when the membership response is malformed", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [{ directoryId: 5, userId: "u-2", peerRead: "no" as unknown as boolean }],
    roles: [],
    delegates: [],
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  expect(
    await screen.findByText(/no es válida para esta carpeta/i),
  ).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Usuario (ID): u-2" })).not.toBeInTheDocument();
});

it("hides cached rows and actions while a refetch is pending", async () => {
  const pending = deferred<DirectoryMembership>();
  jest
    .mocked(documentsService.getReceptionMembership)
    .mockResolvedValueOnce({
      users: [{ directoryId: 5, userId: "u-2", peerRead: false }],
      roles: [],
      delegates: [],
    })
    .mockReturnValueOnce(pending.promise);
  const { client } = setup({ capabilities: caps({ manageParticipants: true }) });

  await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  await act(async () => {
    client.invalidateQueries({ queryKey: receptionMembershipQueryKey(5, "actor-1") });
  });

  await waitFor(() =>
    expect(screen.queryByRole("group", { name: "Usuario (ID): u-2" })).not.toBeInTheDocument(),
  );
  expect(screen.getByText(/Actualizando membresías/)).toBeInTheDocument();

  await act(async () => {
    pending.resolve(emptyMembership());
  });
});

it("hides all rows on a forbidden membership read", async () => {
  jest
    .mocked(documentsService.getReceptionMembership)
    .mockRejectedValueOnce({ response: { status: 403 } });
  setup({ capabilities: caps({ manageParticipants: true }) });

  expect(await screen.findByText(/No tienes permiso/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Agregar/ })).not.toBeInTheDocument();
});

it("does not trust a participant response for another directory", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  jest.mocked(documentsService.setReceptionParticipant).mockResolvedValue({
    directoryId: 99,
    userId: "u-9",
    peerRead: true,
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  const search = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByRole("button", { name: "Agregar participante" }));

  expect(await screen.findByText(/No se pudo confirmar la operación/i)).toBeInTheDocument();
});

it("blocks duplicate participant mutations before React state settles", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  jest.mocked(documentsService.setReceptionParticipant).mockReturnValue(new Promise(() => {}));
  setup({ capabilities: caps({ manageParticipants: true }) });

  const search = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  const add = screen.getByRole("button", { name: "Agregar participante" });
  fireEvent.click(add);
  fireEvent.click(add);

  await waitFor(() =>
    expect(documentsService.setReceptionParticipant).toHaveBeenCalledTimes(1),
  );
});

it("respects a shared operation gate already held by the parent dialog", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  const gate = { acquire: jest.fn(() => false), release: jest.fn() };
  setup({ capabilities: caps({ manageParticipants: true }), gate });

  const search = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByRole("button", { name: "Agregar participante" }));

  expect(gate.acquire).toHaveBeenCalled();
  expect(documentsService.setReceptionParticipant).not.toHaveBeenCalled();
});

// ─── T6b2 correctiva: autoridad del actor explícita y destino vigente ─────────

it("never grants full from an owner flag without every explicit operation", async () => {
  setup({ capabilities: caps({ owner: true, manageDelegates: true }) });
  await screen.findByText("Delegados");
  expect(screen.queryByLabelText("Acceso operativo completo")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Gestionar estructura")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Gestionar delegados")).toBeInTheDocument();
});

it("cannot add a delegate for an existing higher-privilege target", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [],
    roles: [],
    delegates: [
      {
        directoryId: 5,
        userId: "u-2",
        full: true,
        configure: true,
        manageParticipants: true,
        readAll: true,
        review: true,
        manageDelegates: true,
        manageStructure: true,
      },
    ],
  });
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-2", name: "Ana", email: "ana@dms.test" }]);
  setup({ capabilities: caps({ manageDelegates: true, configure: true }) });

  const search = await screen.findByLabelText("Buscar usuario para delegado");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));

  const add = screen.getByRole("button", { name: "Agregar delegado" });
  expect(add).toBeDisabled();
  fireEvent.click(add);
  expect(documentsService.setReceptionDelegate).not.toHaveBeenCalled();
  expect(
    await screen.findByText(/delegación superior a la que ya existe/i),
  ).toBeInTheDocument();
});

it("blocks a delegate draft that exceeds capabilities revoked while open", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  const { rerender, client } = setup({ capabilities: caps(ALL_OPS) });

  const search = await screen.findByLabelText("Buscar usuario para delegado");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByLabelText("Acceso operativo completo"));

  rerender(
    <QueryClientProvider client={client}>
      <ReceptionMembershipManager
        directory={directory}
        actorId="actor-1"
        capabilities={caps({ manageDelegates: true })}
      />
    </QueryClientProvider>,
  );

  const add = await screen.findByRole("button", { name: "Agregar delegado" });
  expect(add).toBeDisabled();
  fireEvent.click(add);
  expect(documentsService.setReceptionDelegate).not.toHaveBeenCalled();
  expect(screen.getByText(/superen tu propia delegación/i)).toBeInTheDocument();
});

it("blocks saving an existing delegation draft after capabilities are revoked", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [],
    roles: [],
    delegates: [
      {
        directoryId: 5,
        userId: "u-2",
        full: false,
        configure: false,
        manageParticipants: false,
        readAll: false,
        review: false,
        manageDelegates: false,
        manageStructure: false,
      },
    ],
  });
  const { rerender, client } = setup({
    capabilities: caps({ manageDelegates: true, configure: true }),
  });

  await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  fireEvent.click(
    within(
      screen.getByRole("group", { name: "Usuario (ID): u-2" }),
    ).getByLabelText("Configurar recepción"),
  );
  expect(screen.getByRole("button", { name: "Guardar delegado u-2" })).toBeEnabled();

  rerender(
    <QueryClientProvider client={client}>
      <ReceptionMembershipManager
        directory={directory}
        actorId="actor-1"
        capabilities={caps({ manageDelegates: true })}
      />
    </QueryClientProvider>,
  );

  const save = await screen.findByRole("button", { name: "Guardar delegado u-2" });
  expect(save).toBeDisabled();
  fireEvent.click(save);
  expect(documentsService.setReceptionDelegate).not.toHaveBeenCalled();
});

it("denies removing a delegation that became higher-privilege after render", async () => {
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValueOnce({
    users: [],
    roles: [],
    delegates: [
      {
        directoryId: 5,
        userId: "u-2",
        full: false,
        configure: false,
        manageParticipants: false,
        readAll: false,
        review: false,
        manageDelegates: false,
        manageStructure: false,
      },
    ],
  });
  const { client } = setup({ capabilities: caps({ manageDelegates: true }) });
  await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  expect(screen.getByRole("button", { name: "Quitar delegado u-2" })).toBeEnabled();

  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [],
    roles: [],
    delegates: [
      {
        directoryId: 5,
        userId: "u-2",
        full: true,
        configure: true,
        manageParticipants: true,
        readAll: true,
        review: true,
        manageDelegates: true,
        manageStructure: true,
      },
    ],
  });
  await act(async () => {
    await client.refetchQueries({
      queryKey: receptionMembershipQueryKey(5, "actor-1"),
    });
  });

  await screen.findByText(/permisos superiores/i);
  expect(screen.getByRole("button", { name: "Quitar delegado u-2" })).toBeDisabled();
});

// ─── T6b2 correctiva: preparación de búsqueda y destino vigente ───────────────

it("cannot add a previously selected recipient while its search refetches", async () => {
  const pending = deferred<{ id: string; name: string; email: string }[]>();
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValueOnce([{ id: "u-9", name: "Ana", email: "ana@dms.test" }])
    .mockReturnValueOnce(pending.promise);
  const { client } = setup({ capabilities: caps({ manageParticipants: true }) });

  const search = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  expect(screen.getByRole("button", { name: "Agregar participante" })).toBeEnabled();

  await act(async () => {
    client.invalidateQueries({
      queryKey: receptionRecipientsQueryKey(5, "actor-1", "participant-user", "an"),
    });
  });

  await waitFor(() =>
    expect(screen.queryByRole("button", { name: /Ana/ })).not.toBeInTheDocument(),
  );
  const add = screen.getByRole("button", { name: "Agregar participante" });
  expect(add).toBeDisabled();
  fireEvent.click(add);
  expect(documentsService.setReceptionParticipant).not.toHaveBeenCalled();

  await act(async () => {
    pending.resolve([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  });
});

it("hides cached recipient results when a background refetch errors", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValueOnce([{ id: "u-9", name: "Ana", email: "ana@dms.test" }])
    .mockRejectedValueOnce({ response: { status: 403 } });
  const { client } = setup({ capabilities: caps({ manageParticipants: true }) });

  fireEvent.change(await screen.findByLabelText("Buscar usuario para participante"), {
    target: { value: "an" },
  });
  await screen.findByRole("button", { name: /Ana/ });

  await act(async () => {
    client.invalidateQueries({
      queryKey: receptionRecipientsQueryKey(5, "actor-1", "participant-user", "an"),
    });
  });

  await waitFor(() =>
    expect(screen.queryByRole("button", { name: /Ana/ })).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("button", { name: "Agregar participante" })).toBeDisabled();
});

// ─── T6b2 correctiva: confirmación exacta de la respuesta ────────────────────

it("does not confirm a participant response for another user", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  jest.mocked(documentsService.setReceptionParticipant).mockResolvedValue({
    directoryId: 5,
    userId: "u-other",
    peerRead: false,
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  const search = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByRole("button", { name: "Agregar participante" }));

  expect(
    await screen.findByText(/No se pudo confirmar la operación/i),
  ).toBeInTheDocument();
});

it("does not confirm a role response for another role", async () => {
  jest
    .mocked(documentsService.searchReceptionRoleRecipients)
    .mockResolvedValue([{ id: 3, key: "profesor", label: "Profesor" }]);
  jest.mocked(documentsService.setReceptionParticipant).mockResolvedValue({
    directoryId: 5,
    roleId: 4,
    peerRead: false,
  });
  setup({ capabilities: caps({ manageParticipants: true }) });

  fireEvent.click(await screen.findByRole("button", { name: /Profesor/ }));
  fireEvent.click(screen.getByRole("button", { name: "Agregar rol" }));

  expect(
    await screen.findByText(/No se pudo confirmar la operación/i),
  ).toBeInTheDocument();
});

// ─── T6b2 correctiva: ciclo de vida de la puerta compartida ──────────────────

it("releases the shared gate on unmount so a later manager can acquire it", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  const first = deferred<{ directoryId: number; userId: string; peerRead: boolean }>();
  jest.mocked(documentsService.setReceptionParticipant).mockReturnValueOnce(first.promise);
  let held = false;
  const gate = {
    acquire: jest.fn(() => {
      if (held) return false;
      held = true;
      return true;
    }),
    release: jest.fn(() => {
      held = false;
    }),
  };

  const view = setup({ capabilities: caps({ manageParticipants: true }), gate });
  const search = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByRole("button", { name: "Agregar participante" }));
  await waitFor(() =>
    expect(documentsService.setReceptionParticipant).toHaveBeenCalledTimes(1),
  );

  view.unmount();
  expect(gate.release).toHaveBeenCalled();

  jest.mocked(documentsService.setReceptionParticipant).mockResolvedValueOnce({
    directoryId: 5,
    userId: "u-9",
    peerRead: false,
  });
  setup({ capabilities: caps({ manageParticipants: true }), gate });
  const search2 = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search2, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByRole("button", { name: "Agregar participante" }));

  await waitFor(() =>
    expect(documentsService.setReceptionParticipant).toHaveBeenCalledTimes(2),
  );
});

it("does not surface a pending response on a changed actor context", async () => {
  const pending = deferred<{ directoryId: number; userId: string; peerRead: boolean }>();
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  jest.mocked(documentsService.setReceptionParticipant).mockReturnValue(pending.promise);
  const { rerender, client } = setup({ capabilities: caps({ manageParticipants: true }) });

  const search = await screen.findByLabelText("Buscar usuario para participante");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByRole("button", { name: "Agregar participante" }));
  await waitFor(() =>
    expect(documentsService.setReceptionParticipant).toHaveBeenCalledTimes(1),
  );

  rerender(
    <QueryClientProvider client={client}>
      <ReceptionMembershipManager
        directory={directory}
        actorId="actor-2"
        capabilities={caps({ manageParticipants: true })}
      />
    </QueryClientProvider>,
  );

  await act(async () => {
    pending.reject({ response: { status: 400, data: { message: "error antiguo" } } });
  });
  expect(screen.queryByText(/error antiguo/)).not.toBeInTheDocument();
});

// ─── T6b2 correctiva 2: banderas de respuesta y contexto del mutationFn ──────

const ALL_FALSE_DELEGATE = {
  full: false,
  configure: false,
  manageParticipants: false,
  readAll: false,
  review: false,
  manageDelegates: false,
  manageStructure: false,
} as const;

it.each([
  "full",
  "configure",
  "manageParticipants",
  "readAll",
  "review",
  "manageDelegates",
  "manageStructure",
] as const)(
  "does not confirm a delegate response whose %s flag differs from the request",
  async (flag) => {
    jest
      .mocked(documentsService.searchReceptionUserRecipients)
      .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
    jest.mocked(documentsService.setReceptionDelegate).mockResolvedValue({
      directoryId: 5,
      userId: "u-9",
      ...ALL_FALSE_DELEGATE,
      [flag]: true,
    } as never);
    const onChanged = jest.fn();
    setup({ capabilities: caps(ALL_OPS), onChanged });

    const search = await screen.findByLabelText("Buscar usuario para delegado");
    fireEvent.change(search, { target: { value: "an" } });
    fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
    fireEvent.click(screen.getByRole("button", { name: "Agregar delegado" }));

    expect(
      await screen.findByText(/No se pudo confirmar la operación/i),
    ).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.getByText(/Seleccionado: Ana/)).toBeInTheDocument();
  },
);

it("confirms a delegate response with every flag equal to the normalized request", async () => {
  jest
    .mocked(documentsService.searchReceptionUserRecipients)
    .mockResolvedValue([{ id: "u-9", name: "Ana", email: "ana@dms.test" }]);
  jest.mocked(documentsService.setReceptionDelegate).mockResolvedValue({
    directoryId: 5,
    userId: "u-9",
    full: false,
    configure: false,
    manageParticipants: false,
    readAll: true,
    review: true,
    manageDelegates: false,
    manageStructure: false,
  });
  const onChanged = jest.fn();
  setup({ capabilities: caps(ALL_OPS), onChanged });

  const search = await screen.findByLabelText("Buscar usuario para delegado");
  fireEvent.change(search, { target: { value: "an" } });
  fireEvent.click(await screen.findByRole("button", { name: /Ana/ }));
  fireEvent.click(screen.getByLabelText("Revisar entregas"));
  fireEvent.click(screen.getByRole("button", { name: "Agregar delegado" }));

  await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(screen.queryByText(/Seleccionado: Ana/)).not.toBeInTheDocument(),
  );
});

function queuedClient(queue: ReturnType<typeof deferred<void>>) {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    mutationCache: new MutationCache({ onMutate: () => queue.promise }),
  });
}

it("does not dispatch a queued participant mutation captured under a changed context", async () => {
  const queue = deferred<void>();
  const client = queuedClient(queue);
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [{ directoryId: 5, userId: "u-2", peerRead: false }],
    roles: [],
    delegates: [],
  });
  jest.mocked(documentsService.setReceptionParticipant).mockResolvedValue({
    directoryId: 5,
    userId: "u-2",
    peerRead: true,
  });

  const { rerender } = setup(
    { capabilities: caps({ manageParticipants: true }) },
    client,
  );
  const row = await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  fireEvent.click(
    within(row).getByLabelText(
      "Puede visualizar entregas de otros participantes (solo lectura)",
    ),
  );
  expect(documentsService.setReceptionParticipant).not.toHaveBeenCalled();

  rerender(
    <QueryClientProvider client={client}>
      <ReceptionMembershipManager
        directory={directory}
        actorId="actor-2"
        capabilities={caps({ manageParticipants: true })}
      />
    </QueryClientProvider>,
  );
  // B está totalmente operativa: membresía vigente con la misma fila y capacidades.
  await screen.findByRole("group", { name: "Usuario (ID): u-2" });

  await act(async () => {
    queue.resolve();
  });

  expect(documentsService.setReceptionParticipant).not.toHaveBeenCalled();
});

it("does not dispatch a queued delegate mutation captured under a changed context", async () => {
  const queue = deferred<void>();
  const client = queuedClient(queue);
  const rowDelegate = { directoryId: 5, userId: "u-2", ...ALL_FALSE_DELEGATE };
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [],
    roles: [],
    delegates: [rowDelegate],
  });
  jest.mocked(documentsService.setReceptionDelegate).mockResolvedValue(rowDelegate);

  const { rerender } = setup(
    { capabilities: caps({ manageDelegates: true }) },
    client,
  );
  await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  fireEvent.click(screen.getByRole("button", { name: "Guardar delegado u-2" }));
  expect(documentsService.setReceptionDelegate).not.toHaveBeenCalled();

  rerender(
    <QueryClientProvider client={client}>
      <ReceptionMembershipManager
        directory={directory}
        actorId="actor-2"
        capabilities={caps({ manageDelegates: true })}
      />
    </QueryClientProvider>,
  );
  await screen.findByRole("group", { name: "Usuario (ID): u-2" });

  await act(async () => {
    queue.resolve();
  });

  expect(documentsService.setReceptionDelegate).not.toHaveBeenCalled();
});

it("does not let an unmounted request release the gate held by a newer manager", async () => {
  let held = false;
  const gate = {
    acquire: jest.fn(() => {
      if (held) return false;
      held = true;
      return true;
    }),
    release: jest.fn(() => {
      held = false;
    }),
  };
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [{ directoryId: 5, userId: "u-2", peerRead: false }],
    roles: [],
    delegates: [],
  });
  const first = deferred<{ directoryId: number; userId: string; peerRead: boolean }>();
  jest.mocked(documentsService.setReceptionParticipant).mockReturnValueOnce(first.promise);

  const view = setup({ capabilities: caps({ manageParticipants: true }), gate });
  const row = await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  fireEvent.click(
    within(row).getByLabelText(
      "Puede visualizar entregas de otros participantes (solo lectura)",
    ),
  );
  await waitFor(() =>
    expect(documentsService.setReceptionParticipant).toHaveBeenCalledTimes(1),
  );
  view.unmount();
  expect(held).toBe(false);

  const second = deferred<{ directoryId: number; userId: string; peerRead: boolean }>();
  jest.mocked(documentsService.setReceptionParticipant).mockReturnValueOnce(second.promise);
  setup({ capabilities: caps({ manageParticipants: true }), gate });
  const row2 = await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  fireEvent.click(
    within(row2).getByLabelText(
      "Puede visualizar entregas de otros participantes (solo lectura)",
    ),
  );
  await waitFor(() =>
    expect(documentsService.setReceptionParticipant).toHaveBeenCalledTimes(2),
  );
  expect(held).toBe(true);

  await act(async () => {
    first.reject({ response: { status: 400, data: { message: "viejo" } } });
  });
  expect(held).toBe(true);
  expect(gate.release).toHaveBeenCalledTimes(1);
});
