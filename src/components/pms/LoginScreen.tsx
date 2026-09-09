import { useState, type FormEvent } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { StaffUser } from "@/lib/auth";
import { login } from "@/lib/api";

export function LoginScreen({ onLogin }: { onLogin: (user: StaffUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      setError(false);
      onLogin(user);
    } catch (err) {
      setError(true);
      // Mostra a mensagem real (credencial errada vs. servidor fora do ar
      // vs. erro inesperado) em vez de sempre dizer "senha incorreta" — ver
      // login() em lib/api.ts.
      const message = err instanceof Error ? err.message : "E-mail ou senha incorretos.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src={`${import.meta.env.BASE_URL}logo-alameda.png`}
            alt="Alameda Pousada"
            className="size-20 object-contain"
          />
          <div>
            <h1 className="text-lg font-bold">Alameda Pousada</h1>
            <p className="text-sm text-muted-foreground">PMS &amp; Financeiro</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ana.paula@alameda.com"
              aria-invalid={error}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Senha</Label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              aria-invalid={error}
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <LogIn />} Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
