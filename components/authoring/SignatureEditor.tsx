'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { SignatureBlock, SignatureItem } from '@/lib/types/authoring';

export function SignatureEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: SignatureBlock;
  onChange: (value: SignatureBlock) => void;
  readOnly?: boolean;
}) {
  const update = (id: string, patch: Partial<SignatureItem>) => {
    onChange({
      ...value,
      items: value.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  };

  const add = () => {
    onChange({
      ...value,
      items: [
        ...value.items,
        {
          id: `signature-${Date.now()}`,
          title: 'FIRMANTE',
          name: '',
          role: '',
          fullWidth: false,
        },
      ],
    });
  };

  const remove = (id: string) => {
    onChange({ ...value, items: value.items.filter((item) => item.id !== id) });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Firmas</CardTitle>
        {!readOnly && (
          <Button type="button" size="sm" variant="outline" onClick={add}>
            <Plus className="mr-1.5 h-4 w-4" /> Agregar firma
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="hidden gap-2 px-2 text-[10px] uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_1fr_1fr_90px_auto]">
          <span>Etiqueta</span>
          <span>Nombre / variable</span>
          <span>Cargo / variable</span>
          <span>Ancho completo</span>
          <span />
        </div>
        {value.items.map((item) => (
          <div
            key={item.id}
            className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_1fr_1fr_90px_auto]"
          >
            <Input
              value={item.title}
              onChange={(event) => update(item.id, { title: event.target.value })}
              className="h-8 text-xs"
              placeholder="RECIBÍ CONFORME"
              aria-label="Etiqueta de firma"
              disabled={readOnly}
            />
            <Input
              value={item.name}
              onChange={(event) => update(item.id, { name: event.target.value })}
              className="h-8 text-xs"
              placeholder="{{recibidoPor.nombre}}"
              aria-label="Nombre de firma"
              disabled={readOnly}
            />
            <Input
              value={item.role}
              onChange={(event) => update(item.id, { role: event.target.value })}
              className="h-8 text-xs"
              placeholder="{{recibidoPor.cargo}}"
              aria-label="Cargo de firma"
              disabled={readOnly}
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={Boolean(item.fullWidth)}
                onChange={(event) =>
                  update(item.id, { fullWidth: event.target.checked })
                }
                disabled={readOnly}
              />
              Completo
            </label>
            {!readOnly && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => remove(item.id)}
                aria-label="Quitar firma"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
