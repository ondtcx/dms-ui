import { redirect } from "next/navigation";

export default function TrashPage() {
  redirect("/dashboard/documents?view=trash");
}
