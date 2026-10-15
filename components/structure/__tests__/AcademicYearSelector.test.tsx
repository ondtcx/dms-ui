import { act, fireEvent, render, screen } from "@testing-library/react";
import { AcademicYearSelector, useAcademicYearStore } from "../AcademicYearSelector";
import type { AcademicYear } from "@/lib/types";

let userId: string | undefined = "user-a";
const current: AcademicYear = { id: 1, name: "Current year", isActive: true, isCurrent: true,
  startDate: "2026-01-01", endDate: "2026-12-31" };
const previous = { ...current, id: 2, name: "Previous year", isCurrent: false };
const inactive = { ...previous, id: 3, name: "Inactive year", isActive: false };
let catalog: { data: AcademicYear[] } | undefined;

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user: userId ? { id: userId } : null }),
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: catalog, isLoading: catalog === undefined }),
}));

function chooseYear(option: string) {
  const original = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = jest.fn();
  try {
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: option }));
  } finally {
    HTMLElement.prototype.scrollIntoView = original;
  }
}

describe("AcademicYearSelector persisted browsing choice", () => {
  beforeEach(() => {
    localStorage.clear();
    userId = "user-a";
    catalog = { data: [current, previous, inactive] };
    useAcademicYearStore.setState({ currentYearId: null, persistedUserId: null, hasInitializedYear: false });
  });

  it.each([null, 2])("keeps explicit choice %s across refetch and persistence rehydration", async (choice) => {
    const view = render(<AcademicYearSelector />);
    expect(screen.getByRole("combobox", { name: "Filtrar por año lectivo" })).toBeInTheDocument();
    expect(useAcademicYearStore.getState()).toMatchObject({ currentYearId: 1, persistedUserId: "user-a", hasInitializedYear: true });
    chooseYear(choice === null ? "Todos los años" : "Previous year");
    catalog = { data: [previous, { ...current, id: 9 }, inactive] };
    view.rerender(<AcademicYearSelector />);
    expect(screen.getByRole("combobox")).toHaveTextContent(choice === null ? "Todos los años" : "Previous year");
    const persisted = localStorage.getItem("academic-year-storage")!;
    expect(JSON.parse(persisted)).toMatchObject({ version: 1, state: { currentYearId: choice, hasInitializedYear: true } });
    view.unmount();
    act(() => useAcademicYearStore.setState({ currentYearId: 9, hasInitializedYear: false }));
    localStorage.setItem("academic-year-storage", persisted);
    await act(async () => { await useAcademicYearStore.persist.rehydrate(); });
    render(<AcademicYearSelector />);
    expect(screen.getByRole("combobox")).toHaveTextContent(choice === null ? "Todos los años" : "Previous year");
    expect(useAcademicYearStore.getState().currentYearId).toBe(choice);
  });

  it.each([2, null])("migrates legacy owned selection %s without losing a numeric choice", async (legacyYear) => {
    localStorage.setItem("academic-year-storage", JSON.stringify({ version: 0,
      state: { currentYearId: legacyYear, persistedUserId: "user-a" } }));
    await act(async () => { await useAcademicYearStore.persist.rehydrate(); });
    expect(useAcademicYearStore.getState().hasInitializedYear).toBe(legacyYear !== null);
    render(<AcademicYearSelector />);
    expect(useAcademicYearStore.getState().currentYearId).toBe(legacyYear ?? 1);
    expect(JSON.parse(localStorage.getItem("academic-year-storage")!).version).toBe(1);
  });

  it("preserves same-user numeric selection but resets ownership before another user's default", () => {
    const view = render(<AcademicYearSelector />);
    chooseYear("Previous year");
    view.rerender(<AcademicYearSelector />);
    expect(useAcademicYearStore.getState().currentYearId).toBe(2);
    userId = undefined;
    catalog = { data: [{ ...current, id: 9 }, previous] };
    view.rerender(<AcademicYearSelector />);
    expect(useAcademicYearStore.getState().currentYearId).toBe(2);
    userId = "user-b";
    catalog = undefined;
    view.rerender(<AcademicYearSelector />);
    expect(useAcademicYearStore.getState()).toMatchObject({ persistedUserId: "user-b", currentYearId: null, hasInitializedYear: false });
    catalog = { data: [{ ...current, id: 9 }, previous] };
    view.rerender(<AcademicYearSelector />);
    expect(useAcademicYearStore.getState().currentYearId).toBe(9);
    chooseYear("Todos los años");
    view.rerender(<AcademicYearSelector />);
    expect(useAcademicYearStore.getState().currentYearId).toBeNull();
  });

  it("uses first active fallback once and does not expose inactive navigation options", () => {
    catalog = { data: [inactive, previous] };
    render(<AcademicYearSelector />);
    expect(useAcademicYearStore.getState().currentYearId).toBe(2);
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = jest.fn();
    try {
      fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
      expect(screen.queryByRole("option", { name: "Inactive year" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("option", { name: "Todos los años" }));
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
    }
    expect(useAcademicYearStore.getState().currentYearId).toBeNull();
  });

  it("does not initialize without authentication or an available active year", () => {
    userId = undefined;
    const view = render(<AcademicYearSelector />);
    expect(useAcademicYearStore.getState().hasInitializedYear).toBe(false);
    userId = "user-a";
    catalog = { data: [inactive] };
    view.rerender(<AcademicYearSelector />);
    expect(useAcademicYearStore.getState()).toMatchObject({ currentYearId: null, hasInitializedYear: false });
    catalog = { data: [] };
    view.rerender(<AcademicYearSelector />);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
