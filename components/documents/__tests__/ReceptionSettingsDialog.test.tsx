import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReceptionSettingsDialog } from "../ReceptionSettingsDialog";
import { documentsService } from "@/lib/services/documents.service";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { Directory, ReceptionSettings } from "@/lib/types";

jest.mock("@/lib/contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    getReception: jest.fn(),
    configureReception: jest.fn(),
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

function caps(overrides: Partial<ReceptionSettings["capabilities"]> = {}): ReceptionSettings["capabilities"] {
  return {
    configure: true,
    manageParticipants: true,
    readAll: true,
    review: true,
    manageDelegates: true,
    manageStructure: true,
    owner: true,
    discover: true,
    submit: true,
    peerRead: false,
    ...overrides,
  };
}

function settings(overrides: Partial<ReceptionSettings> = {}): ReceptionSettings {
  return {
    directoryId: 5,
    enabled: true,
    singleDocumentPerParticipant: false,
    capabilities: caps(),
    ...overrides,
  };
}

const ordinary: Directory = {
  id: 5,
  name: "Buzón",
  parentId: null,
  createdById: "owner-1",
  createdAt: "",
  updatedAt: "",
  receptionEnabled: false,
};

const reception: Directory = { ...ordinary, receptionEnabled: true };

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function setup(directory: Directory | null, client = newClient()) {
  const view = render(
    <QueryClientProvider client={client}>
      <ReceptionSettingsDialog open onOpenChange={jest.fn()} directory={directory} />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

async function cachedSuccess(directory: Directory = reception) {
  jest.mocked(documentsService.getReception).mockResolvedValue(settings({ directoryId: directory.id }));
  return setup(directory);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({ user: { id: "owner-1" } } as never);
  jest
    .mocked(documentsService.getReceptionMembership)
    .mockResolvedValue({ users: [], roles: [], delegates: [] });
});

it("enables an ordinary folder owned by the actor only after explicit confirmation", async () => {
  jest.mocked(documentsService.getReception).mockRejectedValue({
    response: { status: 400, data: { message: "La carpeta no está configurada como recepción" } },
  });
  jest.mocked(documentsService.configureReception).mockResolvedValue(settings());
  const client = newClient();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  setup(ordinary, client);

  const enable = await screen.findByRole("button", { name: "Activar recepción" });
  expect(enable).toBeDisabled();
  expect(documentsService.configureReception).not.toHaveBeenCalled();

  fireEvent.click(screen.getByLabelText(/Entiendo que la activación/));
  fireEvent.click(enable);

  await waitFor(() =>
    expect(documentsService.configureReception).toHaveBeenCalledWith(5, {
      enabled: true,
      singleDocumentPerParticipant: false,
    }),
  );
  await waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["directory-reception"] }),
  );
});

it("shows an existing reception as read-only and saves the quota with the configure capability", async () => {
  jest.mocked(documentsService.getReception).mockResolvedValue(settings());
  jest.mocked(documentsService.configureReception).mockResolvedValue(
    settings({ singleDocumentPerParticipant: true }),
  );
  setup(reception);

  await screen.findByText("Recepción activada");
  fireEvent.click(screen.getByLabelText("Un solo documento por participante"));
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await waitFor(() =>
    expect(documentsService.configureReception).toHaveBeenCalledWith(5, {
      enabled: true,
      singleDocumentPerParticipant: true,
    }),
  );
});

it("keeps a delegate without configure capability read-only and explains the historic quota", async () => {
  jest.mocked(useAuth).mockReturnValue({ user: { id: "delegate-1" } } as never);
  jest.mocked(documentsService.getReception).mockResolvedValue(
    settings({ capabilities: caps({ configure: false, owner: false }) }),
  );
  setup(reception);

  await screen.findByText("Recepción activada");
  expect(screen.getByLabelText("Un solo documento por participante")).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
  expect(screen.getByText(/Las cuotas ya ocupadas se conservan/)).toBeInTheDocument();
});

it("lets a non-owner delegate with the configure capability edit", async () => {
  jest.mocked(useAuth).mockReturnValue({ user: { id: "delegate-1" } } as never);
  jest.mocked(documentsService.getReception).mockResolvedValue(
    settings({ capabilities: caps({ owner: false, configure: true }) }),
  );
  setup(reception);

  await screen.findByText("Recepción activada");
  expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
});

it("fails closed when a cached success is followed by a forbidden refetch", async () => {
  jest
    .mocked(documentsService.getReception)
    .mockResolvedValueOnce(settings())
    .mockRejectedValueOnce({ response: { status: 403 } });
  const { client } = setup(reception);

  await screen.findByText("Recepción activada");
  await act(async () => {
    await client.invalidateQueries({ queryKey: ["directory-reception"] });
  });

  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument(),
  );
  expect(screen.getByText(/No se pudo leer la configuración de recepción/)).toBeInTheDocument();
});

it("fails closed on malformed capability booleans", async () => {
  jest.mocked(documentsService.getReception).mockResolvedValue(
    settings({ capabilities: { ...caps(), configure: "true" as unknown as boolean } }),
  );
  setup(reception);

  await screen.findByText(/no es válida para esta carpeta/);
  expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
});

it("fails closed when the readback targets another directory", async () => {
  jest.mocked(documentsService.getReception).mockResolvedValue(settings({ directoryId: 99 }));
  setup(reception);

  await screen.findByText(/no es válida para esta carpeta/);
  expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
});

it("keeps a known reception fail-closed when the server answers 400 instead of converting", async () => {
  jest.mocked(documentsService.getReception).mockRejectedValue({
    response: { status: 400, data: { message: "La carpeta no está configurada como recepción" } },
  });
  setup(reception);

  await screen.findByText(/La carpeta no está configurada como recepción/);
  expect(screen.queryByRole("button", { name: "Activar recepción" })).not.toBeInTheDocument();
});

it("never offers conversion to a non-owner or on a forbidden read", async () => {
  jest.mocked(useAuth).mockReturnValue({ user: { id: "other-1" } } as never);
  jest.mocked(documentsService.getReception).mockRejectedValue({
    response: { status: 400, data: { message: "La carpeta no está configurada como recepción" } },
  });
  const first = setup(ordinary);
  await screen.findByText(/La carpeta no está configurada como recepción/);
  expect(screen.queryByRole("button", { name: "Activar recepción" })).not.toBeInTheDocument();
  first.unmount();

  jest.mocked(useAuth).mockReturnValue({ user: { id: "owner-1" } } as never);
  jest.mocked(documentsService.getReception).mockRejectedValue({ response: { status: 403 } });
  setup(ordinary);
  await screen.findByText(/No se pudo leer la configuración de recepción/);
  expect(screen.queryByRole("button", { name: "Activar recepción" })).not.toBeInTheDocument();
});

it("blocks duplicate save requests before React state settles", async () => {
  jest.mocked(documentsService.getReception).mockResolvedValue(settings());
  jest.mocked(documentsService.configureReception).mockReturnValue(new Promise(() => {}));
  await cachedSuccess();

  await screen.findByText("Recepción activada");
  const save = screen.getByRole("button", { name: "Guardar" });
  fireEvent.click(save);
  fireEvent.click(save);

  await waitFor(() =>
    expect(documentsService.configureReception).toHaveBeenCalledTimes(1),
  );
});

it("shows a 409 without a fake success or losing the confirmed draft", async () => {
  jest.mocked(documentsService.getReception).mockRejectedValue({
    response: { status: 400, data: { message: "La carpeta no está configurada como recepción" } },
  });
  jest.mocked(documentsService.configureReception).mockRejectedValue({
    response: { status: 409, data: { message: "Solo se pueden convertir carpetas vacías y sin descendientes" } },
  });
  setup(ordinary);

  await screen.findByRole("button", { name: "Activar recepción" });
  fireEvent.click(screen.getByLabelText(/Entiendo que la activación/));
  fireEvent.click(screen.getByRole("button", { name: "Activar recepción" }));

  await screen.findByText(/Solo se pueden convertir carpetas vacías/);
  expect(screen.getByLabelText(/Entiendo que la activación/)).toBeChecked();
});

it("resets unsaved data when the target directory changes without writing the old id", async () => {
  jest
    .mocked(documentsService.getReception)
    .mockResolvedValueOnce(settings({ directoryId: 5, singleDocumentPerParticipant: false }))
    .mockReturnValueOnce(new Promise<ReceptionSettings>(() => {}));
  const { rerender, client } = setup(reception);

  await screen.findByText("Recepción activada");
  fireEvent.click(screen.getByLabelText("Un solo documento por participante"));
  expect(screen.getByLabelText("Un solo documento por participante")).toBeChecked();

  const next = { ...reception, id: 6 };
  rerender(
    <QueryClientProvider client={client}>
      <ReceptionSettingsDialog open onOpenChange={jest.fn()} directory={next} />
    </QueryClientProvider>,
  );

  await waitFor(() =>
    expect(screen.queryByText("Recepción activada")).not.toBeInTheDocument(),
  );
  expect(screen.queryByLabelText("Un solo documento por participante")).not.toBeInTheDocument();
  expect(screen.getByText(/Cargando configuración/)).toBeInTheDocument();
  expect(documentsService.configureReception).not.toHaveBeenCalled();
});

it("separates cached capabilities when the actor changes", async () => {
  jest.mocked(documentsService.getReception).mockResolvedValue(settings());
  const { rerender, client } = setup(reception);
  await waitFor(() => expect(documentsService.getReception).toHaveBeenCalledTimes(1));

  jest.mocked(useAuth).mockReturnValue({ user: { id: "owner-2" } } as never);
  rerender(
    <QueryClientProvider client={client}>
      <ReceptionSettingsDialog open onOpenChange={jest.fn()} directory={reception} />
    </QueryClientProvider>,
  );

  await waitFor(() => expect(documentsService.getReception).toHaveBeenCalledTimes(2));
});

it("is unavailable without an authenticated identity and shows a loading state", async () => {
  jest.mocked(useAuth).mockReturnValue({ user: null } as never);
  setup(reception);
  expect(screen.getByText("No disponible.")).toBeInTheDocument();

  jest.mocked(useAuth).mockReturnValue({ user: { id: "owner-1" } } as never);
  jest.mocked(documentsService.getReception).mockReturnValue(new Promise(() => {}));
  setup(reception);
  expect(screen.getByText(/Cargando configuración/)).toBeInTheDocument();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Corrección T6b1: refetch pendiente, captura de contexto y validación de guardado.

it("hides controls and blocks actions while a background refetch is pending", async () => {
  const pending = deferred<ReceptionSettings>();
  jest
    .mocked(documentsService.getReception)
    .mockResolvedValueOnce(settings())
    .mockReturnValueOnce(pending.promise);
  const { client } = setup(reception);

  await screen.findByText("Recepción activada");
  await act(async () => {
    client.invalidateQueries({ queryKey: ["directory-reception"] });
  });

  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument(),
  );
  expect(screen.getByText(/Actualizando la configuración/)).toBeInTheDocument();
  expect(documentsService.configureReception).not.toHaveBeenCalled();

  await act(async () => {
    pending.resolve(settings());
  });
});

it("does not surface an old target's rejection on the new target", async () => {
  const pending = deferred<ReceptionSettings>();
  jest
    .mocked(documentsService.getReception)
    .mockImplementation(async (id: number) => settings({ directoryId: id }));
  jest.mocked(documentsService.configureReception).mockReturnValueOnce(pending.promise);
  const { rerender, client } = setup(reception);

  await screen.findByText("Recepción activada");
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  const next = { ...reception, id: 6 };
  rerender(
    <QueryClientProvider client={client}>
      <ReceptionSettingsDialog open onOpenChange={jest.fn()} directory={next} />
    </QueryClientProvider>,
  );
  await waitFor(() =>
    expect(documentsService.getReception).toHaveBeenCalledWith(6),
  );
  await screen.findByText("Recepción activada");

  await act(async () => {
    pending.reject({ response: { status: 409, data: { message: "conflicto antiguo" } } });
  });

  expect(screen.queryByText(/conflicto antiguo/)).not.toBeInTheDocument();
  expect(documentsService.configureReception).toHaveBeenCalledTimes(1);
});

it("writes a completed save only under its captured actor and directory key", async () => {
  const pending = deferred<ReceptionSettings>();
  jest
    .mocked(documentsService.getReception)
    .mockImplementation(async (id: number) => settings({ directoryId: id }));
  jest.mocked(documentsService.configureReception).mockReturnValueOnce(pending.promise);
  const { rerender, client } = setup(reception);

  await screen.findByText("Recepción activada");
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  jest.mocked(useAuth).mockReturnValue({ user: { id: "owner-2" } } as never);
  rerender(
    <QueryClientProvider client={client}>
      <ReceptionSettingsDialog open onOpenChange={jest.fn()} directory={reception} />
    </QueryClientProvider>,
  );
  await screen.findByText("Recepción activada");

  await act(async () => {
    pending.resolve(
      settings({ directoryId: 5, singleDocumentPerParticipant: true }),
    );
  });

  expect(
    client.getQueryData(["directory-reception", 5, "owner-1"]),
  ).toMatchObject({ singleDocumentPerParticipant: true });
  expect(
    client.getQueryData(["directory-reception", 5, "owner-2"]),
  ).toMatchObject({ singleDocumentPerParticipant: false });
});

it("fails closed instead of converting when the ordinary flag is unknown", async () => {
  jest.mocked(documentsService.getReception).mockRejectedValue({
    response: { status: 400, data: { message: "La carpeta no está configurada como recepción" } },
  });
  setup({ ...ordinary, receptionEnabled: undefined });

  await screen.findByText(/No se pudo determinar si esta carpeta es ordinaria/);
  expect(screen.queryByRole("button", { name: "Activar recepción" })).not.toBeInTheDocument();
});

it("fails closed when the loaded quota flag is not a boolean", async () => {
  jest.mocked(documentsService.getReception).mockResolvedValue(
    settings({ singleDocumentPerParticipant: undefined as unknown as boolean }),
  );
  setup(reception);

  await screen.findByText(/no es válida para esta carpeta/);
  expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
});

it("does not grant trusted state when the saved readback is mismatched", async () => {
  jest.mocked(documentsService.getReception).mockResolvedValue(settings());
  jest.mocked(documentsService.configureReception).mockResolvedValue(
    settings({ directoryId: 99 }),
  );
  setup(reception);

  await screen.findByText("Recepción activada");
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await screen.findByText(/No se pudo confirmar la configuración actual de la recepción/);
});

it("does not grant trusted state when the saved quota flag is malformed", async () => {
  jest.mocked(documentsService.getReception).mockResolvedValue(settings());
  jest.mocked(documentsService.configureReception).mockResolvedValue(
    settings({ singleDocumentPerParticipant: "true" as unknown as boolean }),
  );
  setup(reception);

  await screen.findByText("Recepción activada");
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

  await screen.findByText(/No se pudo confirmar la configuración actual de la recepción/);
});

// T6b2: la gestión de participantes y delegados depende de manageParticipants/manageDelegates,
// nunca de configure.
it("shows the membership management entry when the actor manages membership without configure", async () => {
  jest.mocked(useAuth).mockReturnValue({ user: { id: "delegate-1" } } as never);
  jest.mocked(documentsService.getReception).mockResolvedValue(
    settings({
      capabilities: caps({
        configure: false,
        owner: false,
        manageParticipants: true,
        manageDelegates: true,
      }),
    }),
  );
  setup(reception);

  await screen.findByText("Recepción activada");
  expect(
    await screen.findByText(/Gestionar participantes y delegados/i),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Guardar" }),
  ).not.toBeInTheDocument();
});

it("shares a single operation exclusion between quota save and membership writes", async () => {
  jest.mocked(useAuth).mockReturnValue({ user: { id: "delegate-1" } } as never);
  jest.mocked(documentsService.getReception).mockResolvedValue(
    settings({
      capabilities: caps({
        owner: false,
        configure: true,
        manageParticipants: true,
        manageDelegates: true,
      }),
    }),
  );
  jest.mocked(documentsService.getReceptionMembership).mockResolvedValue({
    users: [{ directoryId: 5, userId: "u-2", peerRead: false }],
    roles: [],
    delegates: [],
  });
  jest
    .mocked(documentsService.setReceptionParticipant)
    .mockReturnValue(new Promise(() => {}));
  setup(reception);

  await screen.findByText("Recepción activada");
  const row = await screen.findByRole("group", { name: "Usuario (ID): u-2" });
  fireEvent.click(
    within(row).getByLabelText(
      "Puede visualizar entregas de otros participantes (solo lectura)",
    ),
  );

  await waitFor(() =>
    expect(documentsService.setReceptionParticipant).toHaveBeenCalledTimes(1),
  );
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  expect(documentsService.configureReception).not.toHaveBeenCalled();
});

it("hides the membership management entry when the actor manages neither participants nor delegates", async () => {
  jest.mocked(useAuth).mockReturnValue({ user: { id: "delegate-1" } } as never);
  jest.mocked(documentsService.getReception).mockResolvedValue(
    settings({
      capabilities: caps({
        configure: true,
        owner: false,
        manageParticipants: false,
        manageDelegates: false,
      }),
    }),
  );
  setup(reception);

  await screen.findByText("Recepción activada");
  expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  expect(
    screen.queryByText(/Gestionar participantes y delegados/i),
  ).not.toBeInTheDocument();
});
