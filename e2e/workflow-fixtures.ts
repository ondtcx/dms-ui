export type WorkflowFixtureKind =
  "execution" | "version" | "definition" | "document";

export type WorkflowFixtureRecord = {
  scopeId: string;
  kind: WorkflowFixtureKind;
  id: number;
};

export type WorkflowFixtureCleanupOutcome = {
  status: "deleted" | "isolated";
  evidence?: string;
};

export type WorkflowFixtureCleanupFailure = {
  record: WorkflowFixtureRecord;
  reason: string;
};

export type WorkflowFixtureCleanupResult = WorkflowFixtureRecord &
  WorkflowFixtureCleanupOutcome;

export type WorkflowFixtureCleanupReport = {
  scopeId: string;
  records: readonly WorkflowFixtureRecord[];
  outcomes: readonly WorkflowFixtureCleanupResult[];
  failures: readonly WorkflowFixtureCleanupFailure[];
};

export type WorkflowFixtureCleaner = (
  id: number,
  record: WorkflowFixtureRecord,
) => Promise<WorkflowFixtureCleanupOutcome | void>;

export type WorkflowFixtureCleaners = Record<
  WorkflowFixtureKind,
  WorkflowFixtureCleaner
>;

const CLEANUP_ORDER: WorkflowFixtureKind[] = [
  "execution",
  "version",
  "definition",
  "document",
];

function createScopeId(): string {
  return `workflow-fixture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class WorkflowFixtureCleanupError extends Error {
  constructor(public readonly report: WorkflowFixtureCleanupReport) {
    super(
      `Workflow fixture cleanup failed for scope ${report.scopeId}: ${report.failures
        .map(
          ({ record, reason }) =>
            `${record.kind} ${record.id}: ${reason}`,
        )
        .join("; ")}`,
    );
    this.name = "WorkflowFixtureCleanupError";
  }
}

export class WorkflowFixtureRegistry {
  private readonly records: WorkflowFixtureRecord[] = [];

  constructor(public readonly scopeId: string = createScopeId()) {}

  track(kind: WorkflowFixtureKind, id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(
        `Cannot track ${kind} without a positive numeric identity: ${String(id)}`,
      );
    }

    this.records.push({ scopeId: this.scopeId, kind, id });
  }

  snapshot(): readonly WorkflowFixtureRecord[] {
    return this.records.map((record) => ({ ...record }));
  }

  async cleanup(
    cleaners: WorkflowFixtureCleaners,
  ): Promise<WorkflowFixtureCleanupReport> {
    const outcomes: WorkflowFixtureCleanupResult[] = [];
    const failures: WorkflowFixtureCleanupFailure[] = [];

    for (const kind of CLEANUP_ORDER) {
      for (const record of this.records.filter((item) => item.kind === kind)) {
        const cleaner = cleaners[kind];

        if (!cleaner) {
          failures.push({
            record,
            reason: "no cleanup or isolation strategy is available",
          });
          continue;
        }

        try {
          const outcome = await cleaner(record.id, record);

          if (
            !outcome ||
            (outcome.status !== "deleted" && outcome.status !== "isolated")
          ) {
            throw new Error(
              "cleanup must report deleted or isolated status",
            );
          }

          if (outcome.status === "isolated" && !outcome.evidence?.trim()) {
            throw new Error("isolated cleanup must include evidence");
          }

          outcomes.push({ ...record, ...outcome });
        } catch (error) {
          failures.push({
            record,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const report: WorkflowFixtureCleanupReport = {
      scopeId: this.scopeId,
      records: this.snapshot(),
      outcomes,
      failures,
    };

    if (failures.length) {
      throw new WorkflowFixtureCleanupError(report);
    }

    return report;
  }
}
