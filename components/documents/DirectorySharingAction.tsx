'use client';

import { useState } from 'react';
import type { Directory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { SharingDialog } from './SharingDialog';

export function DirectorySharingAction({ directory }: { directory: Directory }) {
  const [open, setOpen] = useState(false);
  if (directory.receptionEnabled || directory.navigationOnly || directory.capabilities?.canShare !== true) return null;
  return <>
    <Button variant="ghost" size="sm" aria-label={`Compartir carpeta ${directory.name}`} onClick={() => setOpen(true)}>Compartir</Button>
    {open && <SharingDialog key={directory.id} directoryId={directory.id} open onOpenChange={setOpen} />}
  </>;
}
