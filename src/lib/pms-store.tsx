import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type ReservationStatus = "confirmada" | "andamento" | "finalizada" | "cancelada";

export type Room = { id: string; number: string; category: string; rate: number };

export type Guest = {
  id: string;
  name: string;
  document: string;
  country: string;
  phone: string;
  email: string;
  purpose: string;
  transport: string;
  lastCity: string;
  nextCity: string;
  stays: number;
};

export type Reservation = {
  id: string;
  roomId: string;
  guestName: string;
  guestId?: string;
  start: string; // yyyy-mm-dd
  end: string; // yyyy-mm-dd (checkout day)
  status: ReservationStatus;
  // Quanto o hóspede já pagou, em R$ (sinal/adiantamento ou o valor cheio).
  // O "falta pagar" e o status (não pago/parcial/pago) são sempre calculados
  // a partir disso, nunca guardados como rótulo solto.
  amountPaid: number;
  eta: string;
  nights: number;
  rate: number;
};

export type ConsumptionItem = {
  id: string;
  reservationId: string;
  name: string;
  qty: number;
  unitPrice: number;
};

export type ProductCategory = "Bebidas" | "Alimentos" | "Serviços";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
};

export const productCategories: ProductCategory[] = ["Bebidas", "Alimentos", "Serviços"];

export type SupplyItem = {
  id: string;
  name: string;
  unit: string; // un, L, kg, rolo, pacote...
  quantity: number;
  minQuantity: number; // dispara o alerta de estoque baixo
};

export type SupplyMovementType = "entrada" | "saida";

export type SupplyMovement = {
  id: string;
  supplyId: string;
  type: SupplyMovementType;
  quantity: number;
  date: string;
  unitCost?: number; // só faz sentido numa entrada (compra)
  note?: string;
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "entrada" | "saida";
  status: "Pago" | "Pendente";
};

export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const today = new Date();
export const day = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return iso(d);
};
export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatDate = (s: string) => s.split("-").reverse().slice(0, 2).join("/");

const rooms: Room[] = [
  { id: "101", number: "101", category: "Suíte Luxo", rate: 620 },
  { id: "102", number: "102", category: "Standard Casal", rate: 380 },
  { id: "103", number: "103", category: "Standard Duplo", rate: 340 },
  { id: "104", number: "104", category: "Suíte Família", rate: 780 },
  { id: "201", number: "201", category: "Suíte Vista Mar", rate: 850 },
  { id: "202", number: "202", category: "Standard Casal", rate: 380 },
  { id: "203", number: "203", category: "Chalé Jardim", rate: 520 },
  { id: "204", number: "204", category: "Standard Solteiro", rate: 260 },
];

const seedGuests: Guest[] = [
  {
    id: "g1",
    name: "Marina Duarte",
    document: "482.119.330-72",
    country: "Brasil",
    phone: "(21) 99812-4477",
    email: "marina.duarte@email.com",
    purpose: "Lazer",
    transport: "Automóvel",
    lastCity: "Rio de Janeiro / RJ",
    nextCity: "Búzios / RJ",
    stays: 4,
  },
  {
    id: "g2",
    name: "Carlos Menezes",
    document: "701.554.882-10",
    country: "Brasil",
    phone: "(11) 98123-0091",
    email: "carlos.menezes@corp.com",
    purpose: "Negócios",
    transport: "Avião",
    lastCity: "São Paulo / SP",
    nextCity: "Recife / PE",
    stays: 9,
  },
  {
    id: "g3",
    name: "Sofia Bianchi",
    document: "YA8823471 (Passaporte)",
    country: "Itália",
    phone: "+39 340 118 2299",
    email: "sofia.bianchi@mail.it",
    purpose: "Lazer",
    transport: "Avião",
    lastCity: "Milão / Itália",
    nextCity: "Salvador / BA",
    stays: 1,
  },
  {
    id: "g4",
    name: "Rafael Lima",
    document: "339.882.114-55",
    country: "Brasil",
    phone: "(31) 99544-2210",
    email: "rafael.lima@email.com",
    purpose: "Eventos",
    transport: "Ônibus",
    lastCity: "Belo Horizonte / MG",
    nextCity: "Vitória / ES",
    stays: 2,
  },
  {
    id: "g5",
    name: "Helena Prado",
    document: "112.909.774-38",
    country: "Brasil",
    phone: "(48) 99120-8890",
    email: "helena.prado@email.com",
    purpose: "Descanso",
    transport: "Automóvel",
    lastCity: "Florianópolis / SC",
    nextCity: "Curitiba / PR",
    stays: 6,
  },
];

const seedReservations: Reservation[] = [
  {
    id: "r1",
    roomId: "101",
    guestName: "Marina Duarte",
    guestId: "g1",
    start: day(-2),
    end: day(2),
    status: "andamento",
    amountPaid: 4 * 620, // pago integral
    eta: "14:00",
    nights: 4,
    rate: 620,
  },
  {
    id: "r2",
    roomId: "102",
    guestName: "Carlos Menezes",
    guestId: "g2",
    start: day(-1),
    end: day(1),
    status: "andamento",
    amountPaid: 380, // sinal de 50% (total 760)
    eta: "15:30",
    nights: 2,
    rate: 380,
  },
  {
    id: "r3",
    roomId: "201",
    guestName: "Sofia Bianchi",
    guestId: "g3",
    start: day(0),
    end: day(5),
    status: "confirmada",
    amountPaid: 2125, // sinal de 50% (total 4250)
    eta: "13:00",
    nights: 5,
    rate: 850,
  },
  {
    id: "r4",
    roomId: "203",
    guestName: "Rafael Lima",
    guestId: "g4",
    start: day(0),
    end: day(3),
    status: "confirmada",
    amountPaid: 0,
    eta: "18:40",
    nights: 3,
    rate: 520,
  },
  {
    id: "r5",
    roomId: "104",
    guestName: "Helena Prado",
    guestId: "g5",
    start: day(-5),
    end: day(-1),
    status: "finalizada",
    amountPaid: 4 * 780,
    eta: "12:00",
    nights: 4,
    rate: 780,
  },
  {
    id: "r6",
    roomId: "202",
    guestName: "Bruno Tavares",
    start: day(3),
    end: day(6),
    status: "confirmada",
    amountPaid: 3 * 380,
    eta: "16:00",
    nights: 3,
    rate: 380,
  },
  {
    id: "r7",
    roomId: "204",
    guestName: "Juliana Reis",
    start: day(1),
    end: day(4),
    status: "cancelada",
    amountPaid: 0,
    eta: "20:00",
    nights: 3,
    rate: 260,
  },
  {
    id: "r8",
    roomId: "103",
    guestName: "Família Andrade",
    start: day(-3),
    end: day(0),
    status: "andamento",
    amountPaid: 3 * 340,
    eta: "11:00",
    nights: 3,
    rate: 340,
  },
  // Reservas de alta temporada (Romaria de Juazeiro do Norte, setembro) —
  // demonstram o filtro de mês e os 3 níveis de pagamento de uma vez.
  {
    id: "r9",
    roomId: "101",
    guestName: "Grupo Romaria - Francisco Alves",
    start: day(14),
    end: day(19),
    status: "confirmada",
    amountPaid: 1550, // sinal de 50% (total 3100)
    eta: "10:00",
    nights: 5,
    rate: 620,
  },
  {
    id: "r10",
    roomId: "102",
    guestName: "Grupo Romaria - Maria das Graças",
    start: day(16),
    end: day(21),
    status: "confirmada",
    amountPaid: 5 * 380,
    eta: "09:30",
    nights: 5,
    rate: 380,
  },
  {
    id: "r11",
    roomId: "203",
    guestName: "Antônio Ferreira",
    start: day(20),
    end: day(23),
    status: "confirmada",
    amountPaid: 0,
    eta: "17:00",
    nights: 3,
    rate: 520,
  },
];

const seedProducts: Product[] = [
  { id: "p1", name: "Água mineral 500ml", category: "Bebidas", price: 7 },
  { id: "p2", name: "Água de coco", category: "Bebidas", price: 10 },
  { id: "p3", name: "Refrigerante lata", category: "Bebidas", price: 9 },
  { id: "p4", name: "Cerveja artesanal", category: "Bebidas", price: 18 },
  { id: "p5", name: "Salgado assado", category: "Alimentos", price: 12 },
  { id: "p6", name: "Porção de batata frita", category: "Alimentos", price: 28 },
  { id: "p7", name: "Sanduíche natural", category: "Alimentos", price: 22 },
  { id: "p8", name: "Café da manhã extra", category: "Alimentos", price: 32 },
  { id: "p9", name: "Taxa de lavanderia", category: "Serviços", price: 45 },
  { id: "p10", name: "Toalha extra", category: "Serviços", price: 15 },
  { id: "p11", name: "Late check-out (por hora)", category: "Serviços", price: 40 },
];

const seedConsumptions: ConsumptionItem[] = [
  { id: "c1", reservationId: "r1", name: "Água mineral 500ml", qty: 2, unitPrice: 7 },
  { id: "c2", reservationId: "r1", name: "Refrigerante lata", qty: 1, unitPrice: 9 },
  { id: "c3", reservationId: "r1", name: "Taxa de lavanderia", qty: 1, unitPrice: 45 },
  { id: "c4", reservationId: "r2", name: "Café da manhã extra", qty: 2, unitPrice: 32 },
  { id: "c5", reservationId: "r8", name: "Cerveja artesanal", qty: 3, unitPrice: 18 },
];

const seedSupplies: SupplyItem[] = [
  { id: "s1", name: "Papel higiênico", unit: "rolo", quantity: 18, minQuantity: 24 },
  { id: "s2", name: "Sabonete", unit: "un", quantity: 40, minQuantity: 30 },
  { id: "s3", name: "Detergente", unit: "L", quantity: 3, minQuantity: 5 },
  { id: "s4", name: "Café em pó", unit: "kg", quantity: 6, minQuantity: 4 },
  { id: "s5", name: "Açúcar", unit: "kg", quantity: 8, minQuantity: 5 },
  { id: "s6", name: "Álcool em gel", unit: "L", quantity: 2, minQuantity: 6 },
  { id: "s7", name: "Toalha de banho", unit: "un", quantity: 35, minQuantity: 20 },
  { id: "s8", name: "Água mineral (galão)", unit: "un", quantity: 4, minQuantity: 6 },
];

const seedSupplyMovements: SupplyMovement[] = [
  {
    id: "sm1",
    supplyId: "s1",
    type: "entrada",
    quantity: 24,
    date: day(-10),
    unitCost: 3.5,
    note: "Compra mensal",
  },
  {
    id: "sm2",
    supplyId: "s1",
    type: "saida",
    quantity: 6,
    date: day(-2),
    note: "Reposição dos quartos",
  },
  {
    id: "sm3",
    supplyId: "s3",
    type: "entrada",
    quantity: 10,
    date: day(-15),
    unitCost: 12,
    note: "Compra mensal",
  },
  {
    id: "sm4",
    supplyId: "s3",
    type: "saida",
    quantity: 7,
    date: day(-3),
    note: "Limpeza geral",
  },
  {
    id: "sm5",
    supplyId: "s6",
    type: "entrada",
    quantity: 8,
    date: day(-20),
    unitCost: 9.9,
    note: "Compra mensal",
  },
  {
    id: "sm6",
    supplyId: "s6",
    type: "saida",
    quantity: 6,
    date: day(-1),
    note: "Recepção e quartos",
  },
];

const seedTransactions: Transaction[] = [
  {
    id: "t1",
    date: day(-6),
    description: "Diárias — Quarto 104 (Helena Prado)",
    category: "Hospedagem",
    amount: 3120,
    type: "entrada",
    status: "Pago",
  },
  {
    id: "t2",
    date: day(-5),
    description: "Conta de Energia — CEMIG",
    category: "Energia/Água",
    amount: 1840,
    type: "saida",
    status: "Pago",
  },
  {
    id: "t3",
    date: day(-4),
    description: "Compra de insumos frigobar",
    category: "Insumos/Frigobar",
    amount: 720,
    type: "saida",
    status: "Pago",
  },
  {
    id: "t4",
    date: day(-3),
    description: "Diárias — Quarto 103 (Família Andrade)",
    category: "Hospedagem",
    amount: 1020,
    type: "entrada",
    status: "Pago",
  },
  {
    id: "t5",
    date: day(-2),
    description: "Lavanderia terceirizada",
    category: "Lavanderia",
    amount: 460,
    type: "saida",
    status: "Pendente",
  },
  {
    id: "t6",
    date: day(-1),
    description: "Consumo frigobar — Quarto 101",
    category: "Consumo",
    amount: 68,
    type: "entrada",
    status: "Pago",
  },
  {
    id: "t7",
    date: day(0),
    description: "Diárias — Quarto 102 (Carlos Menezes)",
    category: "Hospedagem",
    amount: 760,
    type: "entrada",
    status: "Pago",
  },
  {
    id: "t8",
    date: day(0),
    description: "Manutenção do ar-condicionado",
    category: "Manutenção",
    amount: 380,
    type: "saida",
    status: "Pendente",
  },
];

const uid = () => Math.random().toString(36).slice(2, 10);

function usePmsState() {
  const [guests, setGuests] = useState<Guest[]>(seedGuests);
  const [reservations, setReservations] = useState<Reservation[]>(seedReservations);
  const [consumptions, setConsumptions] = useState<ConsumptionItem[]>(seedConsumptions);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [supplies, setSupplies] = useState<SupplyItem[]>(seedSupplies);
  const [supplyMovements, setSupplyMovements] =
    useState<SupplyMovement[]>(seedSupplyMovements);

  return useMemo(
    () => ({
      rooms,
      guests,
      reservations,
      consumptions,
      transactions,
      products,
      supplies,
      supplyMovements,
      addGuest: (g: Omit<Guest, "id" | "stays">) =>
        setGuests((prev) => [{ ...g, id: uid(), stays: 0 }, ...prev]),
      addReservation: (r: Omit<Reservation, "id">) =>
        setReservations((prev) => [...prev, { ...r, id: uid() }]),
      updateReservationStatus: (id: string, status: ReservationStatus) =>
        setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r))),
      updateReservationPayment: (id: string, amountPaid: number) =>
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, amountPaid: Math.max(0, amountPaid) } : r)),
        ),
      addConsumption: (item: Omit<ConsumptionItem, "id">) =>
        setConsumptions((prev) => [...prev, { ...item, id: uid() }]),
      addTransaction: (t: Omit<Transaction, "id">) =>
        setTransactions((prev) => [...prev, { ...t, id: uid() }]),
      addProduct: (p: Omit<Product, "id">) =>
        setProducts((prev) => [{ ...p, id: uid() }, ...prev]),
      removeProduct: (id: string) => setProducts((prev) => prev.filter((p) => p.id !== id)),
      addSupply: (s: Omit<SupplyItem, "id">) =>
        setSupplies((prev) => [{ ...s, id: uid() }, ...prev]),
      // Registra a movimentação e já ajusta a quantidade do insumo (sem deixar
      // ficar negativa). Uma entrada com custo também lança a despesa sozinha
      // no Financeiro - é o "alimenta automaticamente o financeiro" pedido.
      addSupplyMovement: (m: Omit<SupplyMovement, "id">) => {
        const id = uid();
        setSupplyMovements((prev) => [{ ...m, id }, ...prev]);
        setSupplies((prev) =>
          prev.map((s) => {
            if (s.id !== m.supplyId) return s;
            const delta = m.type === "entrada" ? m.quantity : -m.quantity;
            return { ...s, quantity: Math.max(0, s.quantity + delta) };
          }),
        );
        if (m.type === "entrada" && m.unitCost) {
          const supply = supplies.find((s) => s.id === m.supplyId);
          setTransactions((prev) => [
            ...prev,
            {
              id: uid(),
              date: m.date,
              description: `Compra de insumo — ${supply?.name ?? "item"} (${m.quantity} ${supply?.unit ?? ""})`,
              category: "Insumos/Frigobar",
              amount: m.quantity * m.unitCost!,
              type: "saida",
              status: "Pago",
            },
          ]);
        }
      },
    }),
    [guests, reservations, consumptions, transactions, products, supplies, supplyMovements],
  );
}

type PmsContextValue = ReturnType<typeof usePmsState>;
const PmsContext = createContext<PmsContextValue | null>(null);

export function PmsProvider({ children }: { children: ReactNode }) {
  const value = usePmsState();
  return <PmsContext.Provider value={value}>{children}</PmsContext.Provider>;
}

export function usePms() {
  const ctx = useContext(PmsContext);
  if (!ctx) throw new Error("usePms deve ser usado dentro de PmsProvider");
  return ctx;
}

export const statusStyles: Record<ReservationStatus, string> = {
  confirmada: "bg-info text-info-foreground",
  andamento: "bg-success text-success-foreground",
  finalizada: "bg-muted-foreground/60 text-background",
  cancelada: "bg-destructive text-destructive-foreground",
};

export const statusLabels: Record<ReservationStatus, string> = {
  confirmada: "Confirmada",
  andamento: "Em andamento",
  finalizada: "Finalizada",
  cancelada: "Cancelada / No-show",
};

// Valor total da diária da reserva (sem contar consumo extra, que é
// controlado à parte no extrato/checkout).
export function reservationTotal(res: Reservation): number {
  return res.nights * res.rate;
}

export type PaymentSituation = "nao_pago" | "parcial" | "pago";

export function paymentSituation(res: Reservation): PaymentSituation {
  const total = reservationTotal(res);
  if (res.amountPaid <= 0) return "nao_pago";
  if (res.amountPaid >= total) return "pago";
  return "parcial";
}

// Etiqueta mostrada nas barras do mapa e nas listas: em vez de um rótulo
// genérico ("Sinal"), mostra sempre o valor concreto que falta pagar - fica
// claro pra quem está olhando, sem precisar decorar o que cada palavra quer dizer.
export function paymentTag(res: Reservation): string {
  const situation = paymentSituation(res);
  if (situation === "nao_pago") return "Não pago";
  if (situation === "pago") return "PG";
  const remaining = reservationTotal(res) - res.amountPaid;
  return `Falta ${brl(remaining)}`;
}

export const paymentSituationStyles: Record<PaymentSituation, string> = {
  nao_pago: "bg-muted text-muted-foreground",
  parcial: "bg-warning/20 text-warning",
  pago: "bg-success/15 text-success",
};

// Esquema de cores do Mapa de Reservas: branco (disponível - célula sem
// reserva), laranja (reservado, pagamento pendente), verde (ocupado -
// check-in feito ou pago integral) e vermelho (cancelada - sinaliza problema).
export type OccupancyColor = "reservado" | "ocupado" | "cancelada" | "encerrada";

export function occupancyColor(res: Reservation): OccupancyColor {
  if (res.status === "cancelada") return "cancelada";
  if (res.status === "finalizada") return "encerrada";
  const isOcupado = res.status === "andamento" || paymentSituation(res) === "pago";
  return isOcupado ? "ocupado" : "reservado";
}

export const occupancyStyles: Record<OccupancyColor, string> = {
  reservado: "bg-warning text-warning-foreground",
  ocupado: "bg-success text-success-foreground",
  cancelada: "bg-destructive text-destructive-foreground",
  encerrada: "bg-muted-foreground/40 text-background",
};

export const occupancyLabels: Record<OccupancyColor, string> = {
  reservado: "Reservado (pagamento pendente)",
  ocupado: "Ocupado",
  cancelada: "Cancelada",
  encerrada: "Encerrada",
};

export function isLowStock(s: SupplyItem): boolean {
  return s.quantity <= s.minQuantity;
}
