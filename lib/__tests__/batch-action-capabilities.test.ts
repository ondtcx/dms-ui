import { readBatchActionCapabilities } from "../batch-action-capabilities";

const snapshot = { scope: "ordinary", update: true, trash: false, restore: true,
  permanentDelete: false, export: true };

describe("batch action readback", () => {
  it("returns only canonical snapshot fields", () => {
    expect(readBatchActionCapabilities({ batchCapabilities: { ...snapshot, extra: 1 } })).toEqual(snapshot);
  });
  it("rejects truthy nonboolean and boxed values", () => {
    for (const trash of [1, "true", new Boolean(true), {}]) {
      expect(readBatchActionCapabilities({ batchCapabilities: { ...snapshot, trash } })).toBeNull();
    }
  });
  it("requires a valid scope rather than a role or truthy value", () => {
    for (const scope of ["", "ADMIN", 1, null]) {
      expect(readBatchActionCapabilities({ batchCapabilities: { ...snapshot, scope } })).toBeNull();
    }
  });
  it.each(["ordinary", "reception"])("reads a complete %s snapshot independently", (scope) => {
    const batchCapabilities = { ...snapshot, scope };
    expect(readBatchActionCapabilities({ batchCapabilities, actionCapabilities: {} })).toEqual(batchCapabilities);
  });
  it.each(["update", "trash", "restore", "permanentDelete", "export"])("denies missing or nonboolean %s", (key) => {
    const missing: any = { ...snapshot };
    delete missing[key];
    for (const value of [missing, { ...snapshot, [key]: 1 }, { ...snapshot, [key]: "true" }]) {
      expect(readBatchActionCapabilities({ batchCapabilities: value })).toBeNull();
    }
  });
  it.each([null, undefined, [], {}, { actionCapabilities: snapshot },
    { batchCapabilities: [] }, { batchCapabilities: { ...snapshot, scope: "unknown" } }])(
    "denies malformed or individual-only readback %j", (document) => {
      expect(readBatchActionCapabilities(document)).toBeNull();
    },
  );
});
