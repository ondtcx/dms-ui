import { redirect } from "next/navigation";

/**
 * The folder browser moved into the Documents workbench. Keep this route as a
 * compatibility redirect so old notifications and bookmarks still land on the
 * scoped workbench with the folder filter applied.
 */
export default async function DirectoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ directoryId?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.directoryId)
    ? params.directoryId[0]
    : params.directoryId;
  const parsed = raw ? Number(raw) : NaN;
  const directoryId =
    Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;

  redirect(
    directoryId
      ? `/dashboard/documents?directoryId=${directoryId}`
      : "/dashboard/documents",
  );
}
