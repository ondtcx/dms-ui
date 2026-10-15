import {
  OPERATIONAL_CAPABILITY_KEYS,
  actorHasAllOps,
  actorOps,
  canManageDelegate,
  delegatePayload,
  effectiveOps,
  isValidDelegate,
  isValidMembership,
  isValidRecipientRoles,
  isValidRecipientUsers,
  isValidRoleParticipant,
  isValidUserParticipant,
  isNonEmptyString,
  isPositiveInt,
  participantPayload,
  receptionMembershipQueryKey,
  receptionRecipientsQueryKey,
  requestedWithinActor,
  roleRecipientParams,
  userRecipientParams,
} from "@/lib/reception-membership";
import type {
  DirectoryDelegate,
  DirectoryMembership,
  ReceptionCapabilities,
} from "@/lib/types";

function caps(overrides: Partial<ReceptionCapabilities> = {}): ReceptionCapabilities {
  return {
    configure: false,
    manageParticipants: false,
    readAll: false,
    review: false,
    manageDelegates: false,
    manageStructure: false,
    owner: false,
    discover: false,
    submit: false,
    peerRead: false,
    ...overrides,
  };
}

const ALL_FLAGS = {
  configure: true,
  manageParticipants: true,
  readAll: true,
  review: true,
  manageDelegates: true,
  manageStructure: true,
} as const;

const ALL_OPS: ReceptionCapabilities = { ...ALL_FLAGS, owner: false, discover: true, submit: false, peerRead: false };

describe("reception membership guards", () => {
  it("validates positive integer and non-empty string identifiers", () => {
    expect(isPositiveInt(3)).toBe(true);
    expect(isPositiveInt(0)).toBe(false);
    expect(isPositiveInt(-1)).toBe(false);
    expect(isPositiveInt(2.5)).toBe(false);
    expect(isPositiveInt("3")).toBe(false);
    expect(isNonEmptyString("abc")).toBe(true);
    expect(isNonEmptyString("  ")).toBe(false);
    expect(isNonEmptyString(3)).toBe(false);
  });

  it("normalizes effective operations so full and review imply their supersets", () => {
    expect(effectiveOps({ full: true })).toEqual({
      configure: true,
      manageParticipants: true,
      readAll: true,
      review: true,
      manageDelegates: true,
      manageStructure: true,
    });
    expect(effectiveOps({ review: true })).toEqual({
      configure: false,
      manageParticipants: false,
      readAll: true,
      review: true,
      manageDelegates: false,
      manageStructure: false,
    });
    expect(effectiveOps(null)).toEqual({
      configure: false,
      manageParticipants: false,
      readAll: false,
      review: false,
      manageDelegates: false,
      manageStructure: false,
    });
    expect(effectiveOps({ manageStructure: true }).manageStructure).toBe(true);
  });

  it("derives actor operations only from explicit capability flags, never from owner", () => {
    const ownerFlagOnly = caps({ owner: true });
    expect(
      OPERATIONAL_CAPABILITY_KEYS.every((key) => actorOps(ownerFlagOnly)[key] === false),
    ).toBe(true);
    expect(actorHasAllOps(ownerFlagOnly)).toBe(false);
    expect(actorHasAllOps(caps({ ...ALL_FLAGS }))).toBe(true);
    expect(
      OPERATIONAL_CAPABILITY_KEYS.every((key) => actorOps(caps({ ...ALL_FLAGS }))[key]),
    ).toBe(true);
    expect(actorHasAllOps(caps({ manageDelegates: true }))).toBe(false);
  });

  it("rejects a grant from an inconsistent owner shape without all explicit flags", () => {
    const inconsistentOwner = caps({ owner: true, manageDelegates: true });
    expect(actorHasAllOps(inconsistentOwner)).toBe(false);
    expect(requestedWithinActor(inconsistentOwner, { full: true })).toBe(false);
    expect(requestedWithinActor(inconsistentOwner, { configure: true })).toBe(false);
    expect(requestedWithinActor(inconsistentOwner, { manageDelegates: true })).toBe(true);
  });

  it("only allows a grant whose normalized operations the actor already holds", () => {
    expect(requestedWithinActor(ALL_OPS, { configure: true, manageDelegates: true })).toBe(true);
    expect(requestedWithinActor(caps({ manageDelegates: true }), { configure: true })).toBe(false);
    // La normalización aplica al SOLICITADO, no al actor: review solicita readAll,
    // pero el actor solo puede conceder las banderas explícitas que realmente posee.
    expect(
      requestedWithinActor(caps({ review: true, readAll: false }), { review: true }),
    ).toBe(false);
    expect(
      requestedWithinActor(caps({ manageDelegates: true }), { review: true }),
    ).toBe(false);
    expect(requestedWithinActor(caps({ ...ALL_FLAGS }), { review: true })).toBe(true);
    expect(requestedWithinActor(ALL_OPS, { full: true })).toBe(true);
    expect(requestedWithinActor(caps({ ...ALL_FLAGS }), { full: true })).toBe(true);
  });

  it("does not infer readAll from an actor's review flag", () => {
    const inconsistent = caps({ review: true, readAll: false });
    expect(actorOps(inconsistent).readAll).toBe(false);
    expect(requestedWithinActor(inconsistent, { readAll: true })).toBe(false);
    expect(requestedWithinActor(inconsistent, { review: true })).toBe(false);
  });

  it("never manages the owner, the actor self, or a delegate above the actor", () => {
    const ownerId = "owner-1";
    const actorId = "actor-1";
    const full = caps({ ...ALL_OPS, manageDelegates: true });
    expect(
      canManageDelegate({ capabilities: full, actorId, ownerId, targetId: ownerId }),
    ).toBe(false);
    expect(
      canManageDelegate({ capabilities: full, actorId, ownerId, targetId: actorId }),
    ).toBe(false);
    expect(
      canManageDelegate({ capabilities: caps(), actorId, ownerId, targetId: "u-2" }),
    ).toBe(false);
    expect(
      canManageDelegate({ capabilities: full, actorId, ownerId, targetId: "u-2" }),
    ).toBe(true);
    expect(
      canManageDelegate({
        capabilities: full,
        actorId,
        ownerId,
        targetId: "u-2",
        existing: { full: true },
      }),
    ).toBe(true);
    const limited = caps({ manageDelegates: true, manageParticipants: true });
    expect(
      canManageDelegate({
        capabilities: limited,
        actorId,
        ownerId,
        targetId: "u-2",
        existing: { full: true },
      }),
    ).toBe(false);
  });

  it("builds an explicit replace payload with every delegate flag present", () => {
    const payload = delegatePayload({ review: true });
    expect(Object.keys(payload).sort()).toEqual(
      [
        "configure",
        "full",
        "manageDelegates",
        "manageParticipants",
        "manageStructure",
        "readAll",
        "review",
      ].sort(),
    );
    expect(payload).toEqual({
      full: false,
      configure: false,
      manageParticipants: false,
      readAll: true,
      review: true,
      manageDelegates: false,
      manageStructure: false,
    });
    expect(delegatePayload({})).toEqual({
      full: false,
      configure: false,
      manageParticipants: false,
      readAll: false,
      review: false,
      manageDelegates: false,
      manageStructure: false,
    });
  });

  it("whitelists participant payloads to exactly one target and the peer flag", () => {
    expect(participantPayload({ userId: "u-2", peerRead: true })).toEqual({
      userId: "u-2",
      peerRead: true,
    });
    expect(participantPayload({ roleId: 3, peerRead: false })).toEqual({
      roleId: 3,
      peerRead: false,
    });
    expect(() => participantPayload({ userId: "u-2", roleId: 3, peerRead: false })).toThrow();
    expect(() => participantPayload({ peerRead: false })).toThrow();
    expect(() => participantPayload({ userId: "  ", peerRead: false })).toThrow();
    expect(() => participantPayload({ roleId: 0, peerRead: false })).toThrow();
  });

  it("bounds recipient search parameters for users and roles", () => {
    expect(userRecipientParams("  an  ")).toEqual({ q: "an", limit: 20 });
    expect(userRecipientParams("ana", 5)).toEqual({ q: "ana", limit: 5 });
    expect(() => userRecipientParams("a")).toThrow();
    expect(() => userRecipientParams("a".repeat(101))).toThrow();
    expect(() => userRecipientParams("ana", 51)).toThrow();
    expect(() => userRecipientParams("ana", 0)).toThrow();
    expect(roleRecipientParams(undefined)).toEqual({ limit: 20 });
    expect(roleRecipientParams("  ")).toEqual({ limit: 20 });
    expect(roleRecipientParams("pro")).toEqual({ q: "pro", limit: 20 });
    expect(() => roleRecipientParams("a")).toThrow();
  });

  it("validates membership arrays without silently filtering malformed rows", () => {
    const directoryId = 5;
    const valid: DirectoryMembership = {
      users: [{ directoryId, userId: "u-2", peerRead: false }],
      roles: [{ directoryId, roleId: 3, peerRead: true }],
      delegates: [
        {
          directoryId,
          userId: "u-3",
          full: false,
          configure: true,
          manageParticipants: false,
          readAll: true,
          review: true,
          manageDelegates: false,
          manageStructure: false,
        },
      ],
    };
    expect(isValidMembership(valid, directoryId)).toBe(true);
    expect(isValidMembership({ users: [], roles: [], delegates: [] }, directoryId)).toBe(true);
    expect(
      isValidMembership(
        { ...valid, users: [{ directoryId: 9, userId: "u-2", peerRead: false }] },
        directoryId,
      ),
    ).toBe(false);
    expect(
      isValidMembership(
        { ...valid, users: [{ directoryId, userId: "u-2", peerRead: "no" as unknown as boolean }] },
        directoryId,
      ),
    ).toBe(false);
    expect(
      isValidMembership(
        { ...valid, roles: [{ directoryId, roleId: 0, peerRead: true }] },
        directoryId,
      ),
    ).toBe(false);
    const badDelegate = { ...valid.delegates[0], full: "yes" as unknown as boolean };
    expect(isValidMembership({ ...valid, delegates: [badDelegate] }, directoryId)).toBe(false);
    expect(isValidMembership({ users: [], roles: [] }, directoryId)).toBe(false);
    expect(isValidMembership(null, directoryId)).toBe(false);
  });

  it("validates individual participant, delegate and recipient shapes", () => {
    expect(isValidUserParticipant({ directoryId: 5, userId: "u", peerRead: true }, 5)).toBe(true);
    expect(isValidUserParticipant({ directoryId: 5, userId: "", peerRead: true }, 5)).toBe(false);
    expect(isValidRoleParticipant({ directoryId: 5, roleId: 2, peerRead: false }, 5)).toBe(true);
    expect(isValidRoleParticipant({ directoryId: 5, roleId: 0, peerRead: false }, 5)).toBe(false);
    const delegate: DirectoryDelegate = {
      directoryId: 5,
      userId: "u",
      full: false,
      configure: false,
      manageParticipants: false,
      readAll: false,
      review: false,
      manageDelegates: false,
      manageStructure: false,
    };
    expect(isValidDelegate(delegate, 5)).toBe(true);
    expect(isValidDelegate({ ...delegate, review: undefined }, 5)).toBe(false);
    expect(
      isValidRecipientUsers([{ id: "u", name: "Ana", email: "a@b.c" }]),
    ).toBe(true);
    expect(isValidRecipientUsers([{ id: "", name: "Ana", email: "a@b.c" }])).toBe(false);
    expect(isValidRecipientUsers(null)).toBe(false);
    expect(isValidRecipientRoles([{ id: 2, key: "k", label: "L" }])).toBe(true);
    expect(isValidRecipientRoles([{ id: 0, key: "k", label: "L" }])).toBe(false);
  });

  it("scopes membership and recipient query keys by directory, actor, scope and query text", () => {
    expect(receptionMembershipQueryKey(5, "a-1")).toEqual([
      "directory-reception-membership",
      5,
      "a-1",
    ]);
    expect(receptionRecipientsQueryKey(5, "a-1", "participant-user", "an")).toEqual([
      "directory-reception-recipients",
      5,
      "a-1",
      "participant-user",
      "an",
    ]);
    expect(receptionRecipientsQueryKey(5, "a-1", "participant-role", "")).toEqual([
      "directory-reception-recipients",
      5,
      "a-1",
      "participant-role",
      "",
    ]);
    // El mismo texto de consulta no debe colisionar entre formularios distintos.
    expect(receptionRecipientsQueryKey(5, "a-1", "delegate-user", "an")).not.toEqual(
      receptionRecipientsQueryKey(5, "a-1", "participant-user", "an"),
    );
  });
});
