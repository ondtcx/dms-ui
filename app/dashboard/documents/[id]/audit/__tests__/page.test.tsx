import { AuditView, resolveAuditState } from "@/components/documents/DocumentAuditView";
import { render, screen } from "@testing-library/react";

describe("protected document audit", () => {
  it("denies unauthorized navigation without exposing records", () => {
    expect(resolveAuditState({ authorized: false, accesses: [{ id: 1, action: "VIEW", createdAt: "" }] })).toBe("denied");
    render(<AuditView state="denied" accesses={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No tiene autorización");
    expect(screen.queryByText("VIEW")).not.toBeInTheDocument();
  });

  it("distinguishes authorized unavailable and blocked states", () => {
    expect(resolveAuditState({ authorized: true, accesses: undefined })).toBe("unavailable");
    expect(resolveAuditState({ authorized: true, accesses: undefined, contractBlocked: true })).toBe("blocked");
    render(<AuditView state="blocked" accesses={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("no pueden recuperarse actualmente");
  });

  it("renders only supplied authorized records", () => {
    render(<AuditView state="records" accesses={[{ id: 1, action: "VIEW", actor: "Ana", createdAt: "2026-09-01T10:00:00.000Z" }]} />);
    expect(screen.getByText("VIEW")).toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
  });
});
