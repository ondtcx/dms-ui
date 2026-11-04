import ProtectedRoute from "@/guards/ProtectedRoute";
import { ReviewQueue } from "@/components/documents/ReviewQueue";

export default function PendingReviewsPage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <ReviewQueue />
      </div>
    </ProtectedRoute>
  );
}
