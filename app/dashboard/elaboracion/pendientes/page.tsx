import { redirect } from "next/navigation";

export default function LegacyPendingReviewsPage() {
  redirect("/dashboard/documents/pending");
}
