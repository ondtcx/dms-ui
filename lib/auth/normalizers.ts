import { type DocumentShare, type RoleSummary, type User } from "@/lib/types";

type RoleLike = RoleSummary | string | null | undefined;

function isRoleSummary(value: unknown): value is RoleSummary {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in (value as Record<string, unknown>) &&
      "name" in (value as Record<string, unknown>),
  );
}

export function normalizeRoleSummary(role: RoleLike): RoleSummary | null {
  if (!isRoleSummary(role)) {
    return null;
  }

  return {
    id: String(role.id),
    name: String(role.name),
    description: role.description ?? null,
    isSystem: role.isSystem,
    permissions: role.permissions,
  };
}

export function resolveLegacyRoleName(entity: {
  role?: string | null;
  roleSummary?: RoleSummary | null;
  legacyRoleName?: string | null;
  roleId?: string | null;
}): string | null {
  if (typeof entity.legacyRoleName === "string" && entity.legacyRoleName.trim()) {
    return entity.legacyRoleName;
  }

  if (typeof entity.role === "string" && entity.role.trim()) {
    return entity.role;
  }

  if (entity.roleSummary?.name?.trim()) {
    return entity.roleSummary.name;
  }

  if (typeof entity.roleId === "string" && entity.roleId.trim()) {
    return entity.roleId;
  }

  return null;
}

export function displayRoleName(entity: {
  role?: string | null;
  roleSummary?: RoleSummary | null;
  legacyRoleName?: string | null;
  roleId?: string | null;
}): string {
  return resolveLegacyRoleName(entity) ?? "Sin rol";
}

export function normalizeUser(
  rawUser:
    | (Partial<User> & { role?: RoleLike; roleSummary?: RoleSummary | null })
    | null
    | undefined,
): User {
  const roleSummary = normalizeRoleSummary(
    rawUser?.roleSummary ?? (rawUser?.role as RoleLike),
  );
  const legacyRoleName = resolveLegacyRoleName({
    role: typeof rawUser?.role === "string" ? rawUser.role : null,
    roleSummary,
    legacyRoleName: rawUser?.legacyRoleName,
    roleId: rawUser?.roleId,
  });

  return {
    id: rawUser?.id ?? "",
    email: rawUser?.email ?? "",
    name: rawUser?.name ?? "",
    roleId: rawUser?.roleId ?? roleSummary?.id ?? null,
    role: legacyRoleName ?? "",
    roleSummary,
    legacyRoleName,
    permissions: Array.isArray(rawUser?.permissions) ? rawUser.permissions : [],
    createdAt: rawUser?.createdAt ?? "",
    updatedAt: rawUser?.updatedAt ?? "",
  };
}

export function normalizeAuthUser(rawUser: Partial<User> | null | undefined): User {
  return normalizeUser(rawUser);
}

export function normalizeShare(
  rawShare:
    | (Partial<DocumentShare> & { role?: RoleLike; roleSummary?: RoleSummary | null })
    | null
    | undefined,
): DocumentShare {
  const roleSummary = normalizeRoleSummary(
    rawShare?.roleSummary ?? (rawShare?.role as RoleLike),
  );
  const legacyRoleName = resolveLegacyRoleName({
    role: typeof rawShare?.role === "string" ? rawShare.role : null,
    roleSummary,
    legacyRoleName: rawShare?.legacyRoleName,
    roleId: rawShare?.roleId,
  });

  return {
    id: rawShare?.id ?? 0,
    documentId: rawShare?.documentId ?? 0,
    document: rawShare?.document ?? { id: 0, versions: [], createdAt: "" },
    userId: rawShare?.userId ?? null,
    user: rawShare?.user ?? null,
    roleId: rawShare?.roleId ?? roleSummary?.id ?? null,
    role: legacyRoleName,
    roleSummary,
    legacyRoleName,
    departmentId: rawShare?.departmentId ?? null,
    department: rawShare?.department ?? null,
    courseId: rawShare?.courseId ?? null,
    course: rawShare?.course ?? null,
    canView: rawShare?.canView ?? true,
    canDownload: rawShare?.canDownload ?? true,
    canEdit: rawShare?.canEdit ?? false,
    canShare: rawShare?.canShare ?? false,
    isPublicLink: rawShare?.isPublicLink ?? false,
    shareToken: rawShare?.shareToken ?? "",
    requiresPassword: rawShare?.requiresPassword ?? false,
    expiresAt: rawShare?.expiresAt ?? null,
    maxViews: rawShare?.maxViews ?? null,
    viewCount: rawShare?.viewCount ?? 0,
    sharedBy: rawShare?.sharedBy ?? { id: "", name: "", email: "" },
    sharedById: rawShare?.sharedById ?? "",
    revokedAt: rawShare?.revokedAt ?? null,
    revokedBy: rawShare?.revokedBy ?? null,
    createdAt: rawShare?.createdAt ?? "",
    updatedAt: rawShare?.updatedAt ?? "",
  };
}
