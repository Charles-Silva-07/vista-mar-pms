import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { findAccount, type StaffUser } from "@/lib/auth";

export function LoginScreen({ onLogin }: { onLogin: (user: StaffUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const user = findAccount(email, password);
    if (!user) {
      setError(true);
      toast.error("E-mail ou senha incorretos.");
      return;
    }
    setError(false);
    onLogin(user);
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
          <Button type="submit" className="h-11 w-full">
            <LogIn /> Entrar
          </Button>
        </form>

        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
          <p className="font-medium">Credenciais de demonstração</p>
          <p className="mt-1">ana.paula@alameda.com · recepcao123</p>
          <p>carlos.mendes@alameda.com · gerencia123</p>
        </div>
      </div>
    </div>
  );
}
