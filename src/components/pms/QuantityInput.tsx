import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Campo de quantidade com botões +/- ao lado, além de continuar aceitando
// digitação direta. Preferido a input type="number" porque o spinner nativo
// do navegador não lida bem com vírgula decimal (padrão BR) e é minúsculo
// demais pra clicar no celular.
export function QuantityInput({
  value,
  onChange,
  min = 0,
  step = 1,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  step?: number;
  className?: string;
}) {
  const parse = () => {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const format = (n: number) => {
    // Mantém inteiro sem decimais quando o step é inteiro; senão usa vírgula.
    const rounded = Math.round(n * 100) / 100;
    return String(rounded).replace(".", ",");
  };

  const bump = (delta: number) => {
    const next = Math.max(min, parse() + delta);
    onChange(format(next));
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => bump(-step)}
        aria-label="Diminuir"
      >
        <Minus className="size-3.5" />
      </Button>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className="w-14 shrink-0 px-1 text-center"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => bump(step)}
        aria-label="Aumentar"
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}
