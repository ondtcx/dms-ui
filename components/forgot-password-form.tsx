import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-orange-100 p-3 rounded-full">
              <ShieldAlert className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
          <CardDescription>
            El restablecimiento de contraseñas es gestionado por el
            administrador del sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            Contacta al administrador de tu institución para que restablezca tu
            contraseña. Una vez actualizada, podrás iniciar sesión normalmente.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">Volver al inicio de sesión</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
