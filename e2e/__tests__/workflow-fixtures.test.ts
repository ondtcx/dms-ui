import {
  WorkflowFixtureCleanupError,
  WorkflowFixtureRegistry,
} from "@/e2e/workflow-fixtures";

describe("WorkflowFixtureRegistry", () => {
  it("keeps every identity inside an explicit run scope", () => {
    const registry = new WorkflowFixtureRegistry("run-123");

    registry.track("document", 41);
    registry.track("definition", 7);
    registry.track("version", 12);
    registry.track("execution", 99);

    expect(registry.scopeId).toBe("run-123");
    expect(registry.snapshot()).toEqual([
      { scopeId: "run-123", kind: "document", id: 41 },
      { scopeId: "run-123", kind: "definition", id: 7 },
      { scopeId: "run-123", kind: "version", id: 12 },
      { scopeId: "run-123", kind: "execution", id: 99 },
    ]);
  });

  it("reports the record identity and reason when ordered cleanup fails", async () => {
    const registry = new WorkflowFixtureRegistry("run-123");
    registry.track("document", 41);
    registry.track("definition", 7);
    registry.track("version", 12);
    registry.track("execution", 99);

    const cleanup = registry.cleanup({
      execution: async () => {
        throw new Error("execution is still referenced");
      },
      version: async () => ({ status: "deleted" }),
      definition: async () => ({
        status: "isolated",
        evidence: "definition endpoint is unavailable",
      }),
      document: async () => ({ status: "deleted" }),
    });

    await expect(cleanup).rejects.toBeInstanceOf(WorkflowFixtureCleanupError);
    await expect(cleanup).rejects.toThrow(
      "execution 99: execution is still referenced",
    );
  });

  it("cleans executions before versions, definitions, and documents", async () => {
    const registry = new WorkflowFixtureRegistry("run-123");
    registry.track("document", 41);
    registry.track("definition", 7);
    registry.track("version", 12);
    registry.track("execution", 99);
    const order: string[] = [];

    await registry.cleanup({
      execution: async (id) => {
        order.push(`execution:${id}`);
        return {
          status: "isolated",
          evidence: "execution endpoint is unavailable",
        };
      },
      version: async (id) => {
        order.push(`version:${id}`);
        return {
          status: "isolated",
          evidence: "version endpoint is unavailable",
        };
      },
      definition: async (id) => {
        order.push(`definition:${id}`);
        return {
          status: "isolated",
          evidence: "definition endpoint is unavailable",
        };
      },
      document: async (id) => {
        order.push(`document:${id}`);
        return { status: "deleted" };
      },
    });

    expect(order).toEqual([
      "execution:99",
      "version:12",
      "definition:7",
      "document:41",
    ]);
  });

  it("returns deletion and isolation evidence for every completed record", async () => {
    const registry = new WorkflowFixtureRegistry("run-789");
    registry.track("document", 41);
    registry.track("definition", 7);

    const report = await registry.cleanup({
      execution: async () => ({ status: "deleted" }),
      version: async () => ({ status: "deleted" }),
      definition: async (id, record) => ({
        status: "isolated",
        evidence: `definition ${id} remains scoped to ${record.scopeId}`,
      }),
      document: async () => ({ status: "deleted" }),
    });

    expect(report.failures).toEqual([]);
    expect(report.outcomes).toEqual([
      {
        scopeId: "run-789",
        kind: "definition",
        id: 7,
        status: "isolated",
        evidence: "definition 7 remains scoped to run-789",
      },
      {
        scopeId: "run-789",
        kind: "document",
        id: 41,
        status: "deleted",
      },
    ]);
  });

  it("rejects a cleanup strategy that does not report deletion or isolation", async () => {
    const registry = new WorkflowFixtureRegistry("run-456");
    registry.track("definition", 17);

    await expect(
      registry.cleanup({
        execution: async () => ({ status: "deleted" }),
        version: async () => ({ status: "deleted" }),
        definition: async () => undefined,
        document: async () => ({ status: "deleted" }),
      }),
    ).rejects.toThrow(
      "definition 17: cleanup must report deleted or isolated status",
    );
  });
});
