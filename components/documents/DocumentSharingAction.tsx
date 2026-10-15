'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { readDocumentActionCapabilities } from '@/lib/document-action-capabilities';
import type { Document } from '@/lib/types';
import { SharingDialog } from './SharingDialog';

export function DocumentSharingAction({ document }: { document: Document }) {
  const [open, setOpen] = useState(false);
  const capabilities = readDocumentActionCapabilities(document);
  if (capabilities?.scope !== 'ordinary' || capabilities.manageSharing !== true) return null;
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Compartir</Button>
    {open && <SharingDialog key={document.id} documentId={document.id} open={open} onOpenChange={setOpen} />}
  </>;
}
