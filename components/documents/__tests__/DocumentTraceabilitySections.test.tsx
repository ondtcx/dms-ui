import { render, screen } from "@testing-library/react";
import {
  DocumentOriginCard,
  DocumentStateCard,
} from "../DocumentTraceabilitySections";
import type { Document } from "@/lib/types";

const base = {
  id: 1,
  name: "Documento de prueba",
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
  templateId: null,
  currentVersion: 1,
  versions: [
    {
      id: 1,
      version: 1,
      filename: "documento.pdf",
      mimetype: "application/pdf",
      size: 1024,
      path: "/tmp/documento.pdf",
      checksumSHA256: "x",
      createdById: "u1",
      createdAt: "2026-11-01T10:00:00.000Z",
    },
  ],
  archivedAt: null,
  documentNumber: null,
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
  documentType: { id: 23, name: "Oficio" },
  academic: {
    id: 1,
    documentId: 1,
    courseId: null,
    subjectId: null,
    academicYearId: 9,
    academicYear: { id: 9, name: "2026-2027" },
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  },
  directory: { id: 2, name: "Documentos Institucionales" },
  templateData: {
    id: 1,
    documentId: 1,
    formData: null,
    generatedHtml: null,
    template: {
      id: 61,
      name: "Oficio institucional",
      isBlank: false,
      documentType: { id: 23, name: "Oficio" },
    },
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  },
} as unknown as Document;

describe("DocumentTraceabilitySections", () => {
  it("explains the origin of an authoring document", () => {
    render(
      <DocumentOriginCard
        document={{
          ...base,
          authoring: {
            id: 1,
            status: "EMITTED",
            events: [],
          },
        }}
      />,
    );

    expect(screen.getByText("Creado desde plantilla")).toBeInTheDocument();
    expect(screen.getByText(/Ana Torres/)).toBeInTheDocument();
    expect(screen.getByText(/Secretario/)).toBeInTheDocument();
    expect(screen.getByText("Oficio")).toBeInTheDocument();
    expect(screen.getByText("2026-2027")).toBeInTheDocument();
    expect(screen.getByText("Documentos Institucionales")).toBeInTheDocument();
    expect(screen.getByText(/Oficio institucional/)).toBeInTheDocument();
  });

  it("shows the transition timeline and the archive result", () => {
    render(
      <DocumentStateCard
        document={{
          ...base,
          archivedAt: "2026-11-03T10:00:00.000Z",
          authoring: {
            id: 1,
            status: "ARCHIVED",
            reviewerName: "Erika Ramirez",
            submittedAt: "2026-11-01T11:00:00.000Z",
            reviewedByName: "Erika Ramirez",
            emittedAt: "2026-11-02T10:00:00.000Z",
            events: [
              {
                id: 2,
                action: "ARCHIVED",
                fromStatus: "EMITTED",
                toStatus: "ARCHIVED",
                actorId: "u1",
                actorName: "Ana Torres",
                createdAt: "2026-11-03T10:00:00.000Z",
              },
              {
                id: 1,
                action: "EMITTED",
                fromStatus: "APPROVED",
                toStatus: "EMITTED",
                actorId: "u1",
                actorName: "Ana Torres",
                createdAt: "2026-11-02T10:00:00.000Z",
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getAllByText("Archivado").length).toBeGreaterThan(0);
    expect(screen.getByText("Emitido → Archivado")).toBeInTheDocument();
    expect(screen.getByText("Aprobado → Emitido")).toBeInTheDocument();
    expect(screen.getAllByText(/Ana Torres/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Archivado:/)).toBeInTheDocument();
  });

  it("shows uploaded review transitions", () => {
    render(
      <DocumentStateCard
        document={{
          ...base,
          templateData: null,
          authoring: null,
          review: {
            id: 1,
            documentId: 1,
            status: "APPROVED",
            createdAt: "2026-11-01T10:00:00.000Z",
            updatedAt: "2026-11-01T12:00:00.000Z",
            reviewerName: "Erika Ramirez",
            events: [
              {
                id: 1,
                action: "APPROVED",
                fromStatus: "IN_REVIEW",
                toStatus: "APPROVED",
                actorId: "u2",
                actorName: "Erika Ramirez",
                observation: "Listo",
                createdAt: "2026-11-01T12:00:00.000Z",
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getAllByText("Aprobado").length).toBeGreaterThan(0);
    expect(screen.getByText("En revisión → Aprobado")).toBeInTheDocument();
    expect(screen.getByText("Listo")).toBeInTheDocument();
  });
});
