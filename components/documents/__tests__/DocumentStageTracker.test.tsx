import { render, screen } from "@testing-library/react";
import { DocumentStageTracker } from "../DocumentStageTracker";

describe("DocumentStageTracker", () => {
  it("marks the current authoring stage and keeps the later stages visible", () => {
    render(<DocumentStageTracker mode="authoring" status="IN_REVIEW" />);

    expect(screen.getByText("En revisión")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByText("Aprobado")).toBeInTheDocument();
    expect(screen.getByText("Emitido")).toBeInTheDocument();
    expect(screen.getByText("Archivado")).toBeInTheDocument();
  });

  it("omits emission for uploaded documents and shows archive as final", () => {
    render(<DocumentStageTracker mode="upload" status="ARCHIVED" />);

    expect(screen.queryByText("Emitido")).not.toBeInTheDocument();
    expect(screen.getByText("Archivado")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("explains a returned document without losing its review stage", () => {
    render(<DocumentStageTracker mode="authoring" status="CHANGES_REQUESTED" />);

    expect(
      screen.getByText(/Devuelto para corrección/),
    ).toBeInTheDocument();
    expect(screen.getByText("En revisión")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });
});
