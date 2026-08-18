import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Ban,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCog,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  shiftPeriodLabels,
  type AccessLevel,
  type DemoAccount,
  type ShiftPeriod,
} from "@/lib/auth";
import { brl, currentMonth, day, usePms } from "@/lib/pms-store";
import { cn } from "@/lib/utils";

const accessLevelLabels: Record<AccessLevel, string> = {
  funcionario: "Funcionário (sem Financeiro/Colaboradores)",
  gerencia: "Gerência (acesso total)",
};

// Cores variando pelo nome, só pra não ficar todo mundo com o mesmo avatar.
const AVATAR_COLORS = [
  "bg-info/20 text-info",
  "bg-success/20 text-success",
  "bg-warning/20 text-warning",
  "bg-destructive/15 text-destructive",
  "bg-accent text-accent-foreground",
];
function avatarColor(name: string) {
  const sum = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Cargos comuns de pousada/hotel - cobre desde uma pousada pequena até um
// hotel maior (cozinha, serviços gerais, manutenção, segurança...). "Outro"
// libera texto livre pra qualquer cargo que não esteja na lista.
const ROLE_OPTIONS = [
  "Recepção",
  "Governança / Camareira",
  "Cozinha / Copa",
  "Serviços Gerais / Ajudante",
  "Manutenção",
  "Segurança / Portaria",
  "Gerência",
];

// Redimensiona a foto no próprio navegador antes de guardar (formato 3x4,
// então altura importa mais que largura) - evita empilhar fotos gigantes de
// celular na memória do app, que aqui não tem backend/armazenamento real.
function resizeImagePreservingAspect(file: File, maxHeight = 480): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo não é uma imagem válida"));
      img.onload = () => {
        const scale = Math.min(1, maxHeight / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas não suportado"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

const emptyForm = {
  name: "",
  document: "",
  phone: "",
  photoUrl: "",
  role: "",
  shift: "",
  shiftPeriod: "manha" as ShiftPeriod,
  admissionDate: "",
  email: "",
  password: "",
  accessLevel: "funcionario" as AccessLevel,
  salary: "",
  transportBenefit: false,
  transportBenefitAmount: "",
  mealBenefit: false,
  mealBenefitAmount: "",
};

export function StaffScreen({
  accounts,
  currentUserId,
  onAdd,
  onUpdate,
  onRemove,
}: {
  accounts: DemoAccount[];
  currentUserId: string;
  onAdd: (a: Omit<DemoAccount, "id">) => void;
  onUpdate: (id: string, patch: Omit<DemoAccount, "id">) => void;
  onRemove: (id: string) => void;
}) {
  const { salaryPayments, addSalaryPayment } = usePms();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }
    setPhotoLoading(true);
    try {
      const dataUrl = await resizeImagePreservingAspect(file);
      setForm((f) => ({ ...f, photoUrl: dataUrl }));
    } catch {
      toast.error("Não foi possível carregar essa imagem.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.document.includes(q),
    );
  }, [accounts, query]);

  const activeManagerCount = accounts.filter(
    (a) => a.accessLevel === "gerencia" && a.active,
  ).length;

  const isPaidThisMonth = (staffId: string) =>
    salaryPayments.some((p) => p.staffId === staffId && p.month === currentMonth());

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (a: DemoAccount) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      document: a.document,
      phone: a.phone,
      photoUrl: a.photoUrl,
      role: a.role,
      shift: a.shift,
      shiftPeriod: a.shiftPeriod,
      admissionDate: a.admissionDate,
      email: a.email,
      password: a.password,
      accessLevel: a.accessLevel,
      salary: String(a.salary),
      transportBenefit: a.transportBenefit,
      transportBenefitAmount: String(a.transportBenefitAmount || ""),
      mealBenefit: a.mealBenefit,
      mealBenefitAmount: String(a.mealBenefitAmount || ""),
    });
    setOpen(true);
  };

  const submit = () => {
    if (
      !form.name.trim() ||
      !form.role.trim() ||
      !form.email.trim() ||
      !form.password.trim() ||
      !form.document.trim()
    ) {
      toast.error("Preencha nome, CPF, cargo, e-mail e senha.");
      return;
    }
    const emailTaken = accounts.some(
      (a) => a.id !== editingId && a.email.toLowerCase() === form.email.trim().toLowerCase(),
    );
    if (emailTaken) {
      toast.error("Já existe um colaborador com esse e-mail.");
      return;
    }
    const current = editingId ? accounts.find((a) => a.id === editingId) : null;
    const wasOnlyActiveManager =
      current?.accessLevel === "gerencia" && current.active && activeManagerCount === 1;
    if (wasOnlyActiveManager && form.accessLevel !== "gerencia") {
      toast.error("Esse é o único colaborador ativo com Gerência — mantenha ao menos um.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      document: form.document.trim(),
      phone: form.phone.trim(),
      photoUrl: form.photoUrl,
      role: form.role.trim(),
      shift: form.shift.trim() || "—",
      shiftPeriod: form.shiftPeriod,
      admissionDate: form.admissionDate || day(0),
      email: form.email.trim(),
      password: form.password,
      accessLevel: form.accessLevel,
      active: current?.active ?? true,
      salary: Number(form.salary.replace(",", ".")) || 0,
      transportBenefit: form.transportBenefit,
      transportBenefitAmount: form.transportBenefit
        ? Number(form.transportBenefitAmount.replace(",", ".")) || 0
        : 0,
      mealBenefit: form.mealBenefit,
      mealBenefitAmount: form.mealBenefit
        ? Number(form.mealBenefitAmount.replace(",", ".")) || 0
        : 0,
    };
    if (editingId) {
      onUpdate(editingId, payload);
      toast.success("Colaborador atualizado.");
    } else {
      onAdd(payload);
      toast.success(`${payload.name} cadastrado(a) — já pode fazer login.`);
    }
    setOpen(false);
  };

  const toggleActive = (a: DemoAccount) => {
    if (a.id === currentUserId) {
      toast.error("Você não pode desativar o próprio usuário logado.");
      return;
    }
    if (a.accessLevel === "gerencia" && a.active && activeManagerCount <= 1) {
      toast.error("Esse é o único colaborador ativo com Gerência — mantenha ao menos um.");
      return;
    }
    const { password: _password, id: _id, ...rest } = a;
    onUpdate(a.id, { ...rest, password: a.password, active: !a.active });
    toast.success(a.active ? `${a.name} desativado(a) — não consegue mais logar.` : `${a.name} reativado(a).`);
  };

  const remove = (a: DemoAccount) => {
    if (a.id === currentUserId) {
      toast.error("Você não pode excluir o próprio usuário logado.");
      return;
    }
    if (a.accessLevel === "gerencia" && a.active && activeManagerCount <= 1) {
      toast.error("Esse é o único colaborador ativo com Gerência — mantenha ao menos um.");
      return;
    }
    onRemove(a.id);
    toast.success(`${a.name} removido(a).`);
  };

  const markPaid = (a: DemoAccount) => {
    const amount = a.salary + (a.transportBenefit ? a.transportBenefitAmount : 0) + (a.mealBenefit ? a.mealBenefitAmount : 0);
    addSalaryPayment({
      staffId: a.id,
      staffName: a.name,
      month: currentMonth(),
      amount,
      date: day(0),
    });
    toast.success(`Salário de ${a.name} (${brl(amount)}) lançado no Financeiro.`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail ou CPF"
            className="pl-9"
          />
        </div>
        <Button className="shrink-0" onClick={openNew}>
          <Plus /> Novo Colaborador
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Colaborador</th>
              <th className="px-4 py-3 font-semibold">Contato</th>
              <th className="px-4 py-3 font-semibold">Cargo / Turno</th>
              <th className="px-4 py-3 font-semibold">Salário &amp; Benefícios</th>
              <th className="px-4 py-3 font-semibold">Este mês</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum colaborador encontrado.
                </td>
              </tr>
            )}
            {filtered.map((a) => {
              const paid = isPaidThisMonth(a.id);
              return (
                <tr key={a.id} className={cn("hover:bg-muted/40", !a.active && "opacity-50")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-9">
                        {a.photoUrl && <AvatarImage src={a.photoUrl} alt={a.name} className="object-cover" />}
                        <AvatarFallback className={cn("text-xs font-semibold", avatarColor(a.name))}>
                          {initials(a.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {a.name}
                          {a.id === currentUserId && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{a.document}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="truncate">{a.phone || "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{a.role}</p>
                    <p className="text-xs text-muted-foreground">
                      {shiftPeriodLabels[a.shiftPeriod]} · {a.shift}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{brl(a.salary)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {a.transportBenefit && (
                        <Badge variant="secondary" className="text-[10px]">
                          VT {brl(a.transportBenefitAmount)}
                        </Badge>
                      )}
                      {a.mealBenefit && (
                        <Badge variant="secondary" className="text-[10px]">
                          VR {brl(a.mealBenefitAmount)}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {paid ? (
                      <Badge className="bg-success/15 text-success">Pago</Badge>
                    ) : (
                      <div className="space-y-1.5">
                        <Badge className="bg-warning/20 text-warning">Pendente</Badge>
                        {a.active && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => markPaid(a)}>
                            <Wallet className="size-3.5" /> Marcar pago
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={
                        a.active
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {a.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(a)}
                        aria-label={`Editar ${a.name}`}
                        title="Editar"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground"
                        onClick={() => toggleActive(a)}
                        aria-label={a.active ? `Desativar ${a.name}` : `Reativar ${a.name}`}
                        title={a.active ? "Desativar" : "Reativar"}
                      >
                        {a.active ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => remove(a)}
                        aria-label={`Excluir ${a.name}`}
                        title="Excluir"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="size-5 text-primary" />
              {editingId ? "Editar colaborador" : "Novo colaborador"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Altere os dados de acesso, folha de pagamento ou cargo do colaborador."
                : "Cadastre um novo login — a pessoa já pode entrar no sistema com esses dados."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex h-32 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted">
                {form.photoUrl ? (
                  <img
                    src={form.photoUrl}
                    alt="Foto 3x4 do colaborador"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="size-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Foto 3x4 (opcional)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={photoLoading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="size-4" />
                    {photoLoading ? "Carregando..." : form.photoUrl ? "Trocar foto" : "Enviar foto"}
                  </Button>
                  {form.photoUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setForm((f) => ({ ...f, photoUrl: "" }))}
                    >
                      <X className="size-4" /> Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ana Paula"
                />
              </div>
              <div className="space-y-1.5">
                <Label>CPF</Label>
                <Input
                  value={form.document}
                  onChange={(e) => setForm({ ...form, document: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Telefone / WhatsApp</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(85) 99999-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Data de admissão</Label>
                <Input
                  type="date"
                  value={form.admissionDate}
                  onChange={(e) => setForm({ ...form, admissionDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Select
                  value={ROLE_OPTIONS.includes(form.role) ? form.role : "outro"}
                  onValueChange={(v) => setForm({ ...form, role: v === "outro" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                    <SelectItem value="outro">Outro (digitar)</SelectItem>
                  </SelectContent>
                </Select>
                {!ROLE_OPTIONS.includes(form.role) && (
                  <Input
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder="Digite o cargo"
                    className="mt-1.5"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Horário</Label>
                <Input
                  value={form.shift}
                  onChange={(e) => setForm({ ...form, shift: e.target.value })}
                  placeholder="07:00 - 15:00"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Período do turno</Label>
              <Select
                value={form.shiftPeriod}
                onValueChange={(v) => setForm({ ...form, shiftPeriod: v as ShiftPeriod })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["manha", "tarde", "noite", "integral"] as const).map((p) => (
                    <SelectItem key={p} value={p}>
                      {shiftPeriodLabels[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>E-mail (login)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="nome@alameda.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Defina ou redefina a senha"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nível de acesso</Label>
              <Select
                value={form.accessLevel}
                onValueChange={(v) => setForm({ ...form, accessLevel: v as AccessLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["funcionario", "gerencia"] as const).map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {accessLevelLabels[lvl]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-dashed border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Folha de pagamento
              </p>
              <div className="space-y-1.5">
                <Label>Salário base (R$)</Label>
                <Input
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  inputMode="decimal"
                  placeholder="1800,00"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.transportBenefit}
                      onChange={(e) => setForm({ ...form, transportBenefit: e.target.checked })}
                      className="size-4 rounded border-input"
                    />
                    Vale-transporte
                  </label>
                  {form.transportBenefit && (
                    <Input
                      value={form.transportBenefitAmount}
                      onChange={(e) => setForm({ ...form, transportBenefitAmount: e.target.value })}
                      inputMode="decimal"
                      placeholder="Valor mensal (R$)"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.mealBenefit}
                      onChange={(e) => setForm({ ...form, mealBenefit: e.target.checked })}
                      className="size-4 rounded border-input"
                    />
                    Vale-refeição
                  </label>
                  {form.mealBenefit && (
                    <Input
                      value={form.mealBenefitAmount}
                      onChange={(e) => setForm({ ...form, mealBenefitAmount: e.target.value })}
                      inputMode="decimal"
                      placeholder="Valor mensal (R$)"
                    />
                  )}
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={submit}>
              {editingId ? "Salvar alterações" : "Cadastrar colaborador"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
