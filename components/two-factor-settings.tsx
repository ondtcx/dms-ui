"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { authService } from "@/lib/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TwoFactorSettings() {
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  useEffect(() => { authService.getTotpStatus().then((status) => setEnabled(status.enabled)); }, []);
  const start = async () => setSetup(await authService.setupTotp());
  const enable = async () => { const result = await authService.enableTotp(code); setEnabled(true); setSetup(null); setCode(""); setRecoveryCodes(result.recoveryCodes); };
  const disable = async () => {
    try {
      await authService.disableTotp(code);
      setEnabled(false);
      setCode("");
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || "Código inválido");
    }
  };
  return <Card>
    <CardHeader><CardTitle>Autenticación de dos factores</CardTitle><CardDescription>Protege tu cuenta con una aplicación autenticadora. Esta opción es individual y no es un requisito global del sistema.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm">Estado: <strong>{enabled ? "Habilitada" : "Deshabilitada"}</strong></p>
      {!enabled && !setup && <Button onClick={start}>Configurar 2FA</Button>}
      {setup && <div className="space-y-2"><p className="text-sm">Agrega esta cuenta manualmente en tu aplicación:</p><code className="block break-all rounded bg-muted p-2 text-xs">Secreto: {setup.secret}</code><code className="block break-all rounded bg-muted p-2 text-xs">{setup.otpauthUri}</code><Input placeholder="Código de la aplicación" value={code} onChange={(e) => setCode(e.target.value)} /><Button onClick={enable}>Confirmar y habilitar</Button></div>}
      {enabled && <div className="space-y-2"><Input placeholder="Código TOTP o de recuperación" value={code} onChange={(e) => setCode(e.target.value)} /><Button variant="outline" onClick={disable}>Deshabilitar 2FA</Button></div>}
      {recoveryCodes.length > 0 && <div className="rounded border p-3"><p className="font-medium">Códigos de recuperación (guárdalos ahora; solo se muestran una vez)</p><code className="block whitespace-pre-wrap">{recoveryCodes.join("\n")}</code></div>}
    </CardContent>
  </Card>;
}
