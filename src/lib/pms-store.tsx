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
    eta: "11:00",
    nights: 3,
    rate: 340,
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

  return useMemo(
    () => ({
      rooms,
      guests,
      reservations,
      consumptions,
      transactions,
      products,
      addGuest: (g: Omit<Guest, "id" | "stays">) =>
        setGuests((prev) => [{ ...g, id: uid(), stays: 0 }, ...prev]),
      addReservation: (r: Omit<Reservation, "id">) =>
        setReservations((prev) => [...prev, { ...r, id: uid() }]),
      updateReservationStatus: (id: string, status: ReservationStatus) =>
        setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r))),
      addConsumption: (item: Omit<ConsumptionItem, "id">) =>
        setConsumptions((prev) => [...prev, { ...item, id: uid() }]),
      addTransaction: (t: Omit<Transaction, "id">) =>
        setTransactions((prev) => [...prev, { ...t, id: uid() }]),
      addProduct: (p: Omit<Product, "id">) =>
        setProducts((prev) => [{ ...p, id: uid() }, ...prev]),
      removeProduct: (id: string) => setProducts((prev) => prev.filter((p) => p.id !== id)),
    }),
    [guests, reservations, consumptions, transactions, products],
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
