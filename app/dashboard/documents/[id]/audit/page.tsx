'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { documentsService } from '@/lib/services/documents.service';
import { useAuth } from '@/lib/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { AuditView, resolveAuditState } from '@/components/documents/DocumentAuditView';

export default function DocumentAuditPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const authorized = user?.role === UserRole.ADMIN || user?.role === UserRole.RECTOR || user?.role === UserRole.COORDINADOR;
  const documentId = Number(params.id);
  const query = useQuery({ queryKey: ['document', documentId], queryFn: () => documentsService.getOne(documentId), enabled: authorized && Number.isFinite(documentId) });
  const state = resolveAuditState({ authorized: !!authorized, accesses: query.data?.accesses, contractBlocked: query.isError });
  return <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8"><h1 className="text-2xl font-bold">Auditoría del documento</h1><AuditView state={state} accesses={query.data?.accesses ?? []} /></main>;
}
