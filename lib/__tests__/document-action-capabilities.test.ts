import { readDocumentActionCapabilities } from "../document-action-capabilities";

const capabilities = {
  scope: "ordinary",
  editMetadata: true,
  editContent: false,
  move: true,
  trash: false,
  restore: false,
  permanentDelete: false,
  manageSharing: true,
};

describe("readDocumentActionCapabilities", () => {
  it('preserves workflow restrictions while additionally denying non-owner deletion', () => {
    const snapshot = { ...capabilities, trash: true, permanentDelete: true };
    expect(readDocumentActionCapabilities({ uploadedById: 'owner', actionCapabilities: snapshot }, 'delegate'))
      .toMatchObject({ trash: false, permanentDelete: false, editMetadata: true, editContent: false });
  });
  it('does not grant owner deletion when the workflow snapshot denies it', () => {
    expect(readDocumentActionCapabilities({ uploadedById: 'owner', actionCapabilities: capabilities }, 'owner'))
      .toMatchObject({ trash: false, permanentDelete: false });
  });
  it('denies destructive actions when an explicit actor is unavailable', () => {
    expect(readDocumentActionCapabilities({ actionCapabilities: { ...capabilities, trash: true, permanentDelete: true } }, null))
      .toMatchObject({ trash: false, permanentDelete: false });
  });
  it.each(["ordinary", "reception"])("preserves each explicit flag for %s", (scope) => {
    expect(readDocumentActionCapabilities({ actionCapabilities: { ...capabilities, scope } }))
      .toEqual({ ...capabilities, scope });
  });

  it.each([undefined, null, {}, { canDelete: true, isOwn: true },
    { actionCapabilities: { ...capabilities, scope: "unknown" } },
  ])("rejects unavailable or invalid readback %#", (document) => {
    expect(readDocumentActionCapabilities(document)).toBeNull();
  });

  it.each(["editMetadata", "editContent", "move", "trash", "restore", "permanentDelete", "manageSharing"])(
    "requires an explicit boolean for %s", (action) => {
      for (const value of [undefined, null, 1, "true"]) {
        expect(readDocumentActionCapabilities({
          actionCapabilities: { ...capabilities, [action]: value },
        })).toBeNull();
      }
    },
  );
});
