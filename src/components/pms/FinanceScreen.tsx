import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, Scale, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { brl, currentMonth, day, usePms } from "@/lib/pms-store";
import { cn } from "@/lib/utils";
import type { DemoAccount } from "@/lib/auth";

const categories = ["Energia/Água", "Lavanderia", "Insumos/Frigobar", "Salários", "Manutenção"];
const ALL_CATEGORIES = "__todas__";

export function FinanceScreen({ accounts }: { accounts: DemoAccount[] }) {
  const { transactions, addTransaction, salaryPayments } = usePms();
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: categories[0]!,
    date: day(0),
    status: "Pendente" as "Pago" | "Pendente",
  });

  const income = transactions.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "saida").reduce((s, t) => s + t.amount, 0);

  const activeStaff = useMemo(() => accounts.filter((a) => a.active), [accounts]);
  const staffMonthlyCost = (a: DemoAccount) =>
    a.salary +
    (a.transportBenefit ? a.transportBenefitAmount : 0) +
    (a.mealBenefit ? a.mealBenefitAmount : 0);
  const payrollTotal = activeStaff.reduce((s, a) => s + staffMonthlyCost(a), 0);
  const isPaidThisMonth = (staffId: string) =>
    salaryPayments.some((p) => p.staffId === staffId && p.month === currentMonth());
  const payrollPaid = activeStaff
    .filter((a) => isPaidThisMonth(a.id))
    .reduce((s, a) => s + staffMonthlyCost(a), 0);
  const payrollRemaining = Math.max(0, payrollTotal - payrollPaid);

  const chartData = useMemo(() => {
    const map = new Map<string, { dia: string; Entradas: number; Saídas: number }>();
    [...transactions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((t) => {
        const key = t.date.slice(5).split("-").reverse().join("/");
        const row = map.get(key) ?? { dia: key, Entradas: 0, Saídas: 0 };
        if (t.type === "entrada") row.Entradas += t.amount;
        else row["Saídas"] += t.amount;
        map.set(key, row);
      });
    return [...map.values()];
  }, [transactions]);

  const transactionCategories = useMemo(
    () => [...new Set(transactions.map((t) => t.category))].sort(),
    [transactions],
  );

  const rows = useMemo(
    () =>
      [...transactions]
        .filter((t) => categoryFilter === ALL_CATEGORIES || t.category === categoryFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [transactions, categoryFilter],
  );

  const submit = () => {
    const amount = Number(form.amount.replace(".", "").replace(",", "."));
    if (!form.description.trim() || !amount) {
      toast.error("Informe a descrição e o valor da despesa.");
      return;
    }
    addTransaction({
      date: form.date,
      description: form.description.trim(),
      category: form.category,
      amount,
      type: "saida",
      status: form.status,
    });
    toast.success("Despesa lançada no fluxo de caixa.");
    setForm({ ...form, description: "", amount: "" });
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total de entradas (mês)
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-success">
            <ArrowUpRight className="size-5" /> {brl(income)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total de saídas (despesas)
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-destructive">
            <ArrowDownRight className="size-5" /> {brl(expense)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-primary p-4 text-primary-foreground shadow-sm">
          <p className="text-xs uppercase tracking-wide opacity-70">Lucro líquido / saldo atual</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold">
            <Scale className="size-5" /> {brl(income - expense)}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Folha de pagamento (mês atual)</h2>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Custo total do mês
            </p>
            <p className="mt-1 text-xl font-bold">{brl(payrollTotal)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Já pago</p>
            <p className="mt-1 text-xl font-bold text-success">{brl(payrollPaid)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Falta pagar</p>
            <p className={cn("mt-1 text-xl font-bold", payrollRemaining > 0 && "text-destructive")}>
              {brl(payrollRemaining)}
            </p>
          </div>
        </div>
        <ul className="divide-y divide-border border-t border-border">
          {activeStaff.length === 0 && (
            <li className="px-4 py-4 text-sm text-muted-foreground">
              Nenhum colaborador ativo cadastrado.
            </li>
          )}
          {activeStaff.map((a) => {
            const paid = isPaidThisMonth(a.id);
            return (
              <li
                key={a.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.role} · {brl(staffMonthlyCost(a))}
                  </p>
                </div>
                <Badge className={paid ? "bg-success/15 text-success" : "bg-warning/20 text-warning"}>
                  {paid ? "Pago" : "Pendente"}
                </Badge>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
          Só visualização aqui. Pra marcar ou desfazer um pagamento, use a tela{" "}
          <span className="font-medium text-foreground">Colaboradores</span>.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="truncate text-lg font-semibold">Fluxo de caixa</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>Todas as categorias</SelectItem>
              {transactionCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="shrink-0" onClick={() => setOpen(true)}>
            <Plus /> Lançar Despesa
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-4 text-sm font-semibold">Entradas vs. Saídas</p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={60} />
              <Tooltip
                formatter={(v: number) => brl(v)}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              <Bar dataKey="Entradas" fill="var(--success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Saídas" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Data</th>
              <th className="px-4 py-3 font-semibold">Descrição</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-muted/40">
                <td className="px-4 py-3 text-muted-foreground">
                  {t.date.split("-").reverse().join("/")}
                </td>
                <td className="px-4 py-3 font-medium">{t.description}</td>
                <td className="px-4 py-3 text-muted-foreground">{t.category}</td>
                <td className="px-4 py-3">
                  <Badge
                    className={cn(
                      t.status === "Pago"
                        ? "bg-success text-success-foreground"
                        : "bg-warning text-warning-foreground",
                    )}
                  >
                    {t.status}
                  </Badge>
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-semibold",
                    t.type === "entrada" ? "text-success" : "text-destructive",
                  )}
                >
                  {t.type === "entrada" ? "+" : "-"} {brl(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançar despesa</DialogTitle>
            <DialogDescription>Registre uma saída operacional da pousada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Conta de energia"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="1250,00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as "Pago" | "Pendente" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pago">Pago</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={submit}>
              Salvar despesa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
