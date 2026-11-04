'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from '@/guards/ProtectedRoute';

function RedirectToEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/dashboard/elaboracion/plantillas/${params.id}/diseno`);
  }, [params.id, router]);

  return (
    <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Abriendo editor...
    </div>
  );
}

export default function NewVersionPage() {
  return (
    <ProtectedRoute>
      <RedirectToEditor />
    </ProtectedRoute>
  );
}
