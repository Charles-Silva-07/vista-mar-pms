import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  createReservation as apiCreateReservation,
  createRoom as apiCreateRoom,
  fetchReservations,
  fetchRooms,
  patchReservation,
} from "./api";

export type ReservationStatus = "confirmada" | "andamento" | "finalizada" | "cancelada";

export type ReservationOrigin = "Booking" | "Airbnb" | "Direto" | "Outro";

export const reservationOrigins: ReservationOrigin[] = ["Direto", "Booking", "Airbnb", "Outro"];

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
  origin: ReservationOrigin;
};

export type ConsumptionItem = {
  id: string;
  reservationId: string;
  name: string;
  qty: number;
  unitPrice: number;
  // Snapshot do insumo baixado do estoque no momento da venda (se o produto
  // tinha vínculo com estoque). Guardamos aqui, e não só no Product, porque o
  // catálogo pode mudar depois - se o vínculo mudar ou o produto for
  // excluído, ainda precisamos saber exatamente o que devolver ao estoque
  // caso esse consumo seja removido do extrato por engano.
  supplyId?: string;
  supplyQty?: number;
};

export type ProductCategory = "Bebidas" | "Alimentos" | "Serviços";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  // Vínculo opcional com o estoque de insumos: ao vender este item no
  // extrato do hóspede, dá baixa automática em supplyId, na quantidade
  // qtyPerSale (padrão 1 unidade de estoque por venda). Deixe sem vínculo
  // para itens que não controlam estoque próprio (ex.: "Serviços").
  supplyId?: string;
  qtyPerSale?: number;
};

export const productCategories: ProductCategory[] = ["Bebidas", "Alimentos", "Serviços"];

// Categoria é texto livre (não um union fixo) porque o usuário pode criar e
// renomear grupos pela própria tela de Estoque — ver addSupplyCategory /
// renameSupplyCategory mais abaixo.
export type SupplyCategory = string;

const seedSupplyCategories: SupplyCategory[] = [
  "Governança e Quartos",
  "Alimentos e Bebidas",
  "Limpeza e Higiene",
  "Outros",
];

export type SupplyItem = {
  id: string;
  name: string;
  category: SupplyCategory;
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

export type SalaryPayment = {
  id: string;
  staffId: string;
  staffName: string; // guardado junto pra não depender do cadastro do colaborador ainda existir
  month: string; // "yyyy-mm"
  amount: number; // salário + benefícios do mês, somados
  date: string;
  transactionId: string; // liga com o lançamento gerado no Financeiro, pra dar pra desfazer os dois juntos
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

// Usado só como fallback (estado inicial antes da API responder, ou se o
// backend estiver fora do ar) — a fonte de verdade agora é o Django
// (/api/rooms/), ver fetchRooms em lib/api.ts.
const seedRooms: Room[] = [
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
    origin: "Direto",
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
    origin: "Booking",
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
    origin: "Airbnb",
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
    origin: "Direto",
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
    origin: "Booking",
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
    origin: "Airbnb",
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
    origin: "Direto",
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
    origin: "Direto",
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
    origin: "Direto",
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
    origin: "Booking",
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
    origin: "Direto",
  },
];

const seedProducts: Product[] = [
  // Exemplo de vínculo com estoque: cada venda deste item baixa 1 unidade
  // do insumo "s8" (Água mineral - galão). Os demais itens do catálogo
  // ficam sem vínculo por padrão; cadastre o vínculo na tela Produtos &
  // Preços quando o insumo correspondente existir no estoque.
  { id: "p1", name: "Água mineral 500ml", category: "Bebidas", price: 7, supplyId: "s8", qtyPerSale: 1 },
  { id: "p2", name: "Água de coco", category: "Bebidas", price: 10, supplyId: "s9", qtyPerSale: 1 },
  { id: "p3", name: "Refrigerante lata", category: "Bebidas", price: 9, supplyId: "s10", qtyPerSale: 1 },
  { id: "p4", name: "Cerveja artesanal", category: "Bebidas", price: 18, supplyId: "s11", qtyPerSale: 1 },
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
  { id: "s1", name: "Papel higiênico", category: "Governança e Quartos", unit: "rolo", quantity: 18, minQuantity: 24 },
  { id: "s2", name: "Sabonete", category: "Governança e Quartos", unit: "un", quantity: 40, minQuantity: 30 },
  { id: "s7", name: "Toalha de banho", category: "Governança e Quartos", unit: "un", quantity: 35, minQuantity: 20 },
  { id: "s4", name: "Café em pó", category: "Alimentos e Bebidas", unit: "kg", quantity: 6, minQuantity: 4 },
  { id: "s5", name: "Açúcar", category: "Alimentos e Bebidas", unit: "kg", quantity: 8, minQuantity: 5 },
  { id: "s8", name: "Água mineral (galão)", category: "Alimentos e Bebidas", unit: "un", quantity: 4, minQuantity: 6 },
  { id: "s9", name: "Água de coco (unidade)", category: "Alimentos e Bebidas", unit: "un", quantity: 20, minQuantity: 12 },
  { id: "s10", name: "Refrigerante lata", category: "Alimentos e Bebidas", unit: "un", quantity: 30, minQuantity: 18 },
  { id: "s11", name: "Cerveja artesanal", category: "Alimentos e Bebidas", unit: "un", quantity: 15, minQuantity: 12 },
  { id: "s3", name: "Detergente", category: "Limpeza e Higiene", unit: "L", quantity: 3, minQuantity: 5 },
  { id: "s6", name: "Álcool em gel", category: "Limpeza e Higiene", unit: "L", quantity: 2, minQuantity: 6 },
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
  {
    id: "t9",
    date: day(-10),
    description: "Salário — Ana Paula (2026-08)",
    category: "Salários",
    amount: 1800 + 220 + 450,
    type: "saida",
    status: "Pago",
  },
];

// Exemplo: a Ana Paula (u1) já foi paga esse mês, o Carlos (u2) ainda não -
// pra demonstrar os dois estados (Pago/Pendente) na tela de Colaboradores.
export const currentMonth = () => day(0).slice(0, 7);

const seedSalaryPayments: SalaryPayment[] = [
  {
    id: "sp1",
    staffId: "u1",
    staffName: "Ana Paula",
    month: currentMonth(),
    amount: 1800 + 220 + 450,
    date: day(-10),
    transactionId: "t9",
  },
];

const uid = () => Math.random().toString(36).slice(2, 10);

function usePmsState() {
  const [rooms, setRooms] = useState<Room[]>(seedRooms);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRooms()
      .then((data) => {
        if (!cancelled) setRooms(data);
      })
      .catch((err) => {
        // Mantém seedRooms na tela e só reporta o erro — não trava o app se
        // o backend estiver fora do ar durante a transição.
        console.error("Não consegui buscar quartos do backend, usando dados locais:", err);
        if (!cancelled) setRoomsError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [reservations, setReservations] = useState<Reservation[]>(seedReservations);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchReservations()
      .then((data) => {
        if (!cancelled) setReservations(data);
      })
      .catch((err) => {
        console.error(
          "Não consegui buscar reservas do backend, usando dados locais:",
          err,
        );
        if (!cancelled) setReservationsError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setReservationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [guests, setGuests] = useState<Guest[]>(seedGuests);
  const [consumptions, setConsumptions] = useState<ConsumptionItem[]>(seedConsumptions);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [supplies, setSupplies] = useState<SupplyItem[]>(seedSupplies);
  const [supplyCategories, setSupplyCategories] =
    useState<SupplyCategory[]>(seedSupplyCategories);
  const [supplyMovements, setSupplyMovements] =
    useState<SupplyMovement[]>(seedSupplyMovements);
  const [salaryPayments, setSalaryPayments] =
    useState<SalaryPayment[]>(seedSalaryPayments);

  return useMemo(
    () => ({
      rooms,
      roomsLoading,
      roomsError,
      addRoom: async (room: Omit<Room, "id">) => {
        const created = await apiCreateRoom(room);
        setRooms((prev) => [...prev, created]);
        return created;
      },
      guests,
      reservations,
      reservationsLoading,
      reservationsError,
      consumptions,
      transactions,
      products,
      supplies,
      supplyCategories,
      supplyMovements,
      salaryPayments,
      addGuest: (g: Omit<Guest, "id" | "stays">) =>
        setGuests((prev) => [{ ...g, id: uid(), stays: 0 }, ...prev]),
      addReservation: async (r: Omit<Reservation, "id">) => {
        const created = await apiCreateReservation(r);
        setReservations((prev) => [...prev, created]);
        return created;
      },
      updateReservationStatus: async (id: string, status: ReservationStatus) => {
        // Otimista: atualiza a tela na hora, e reconcilia com a resposta
        // real da API (ou desfaz, se a chamada falhar).
        const previous = reservations;
        setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
        try {
          const updated = await patchReservation(id, { status });
          setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
        } catch (err) {
          console.error("Não consegui atualizar o status da reserva no backend:", err);
          setReservations(previous);
        }
      },
      updateReservationPayment: async (id: string, amountPaid: number) => {
        const previous = reservations;
        const safeAmount = Math.max(0, amountPaid);
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, amountPaid: safeAmount } : r)),
        );
        try {
          const updated = await patchReservation(id, { amountPaid: safeAmount });
          setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
        } catch (err) {
          console.error("Não consegui atualizar o pagamento da reserva no backend:", err);
          setReservations(previous);
        }
      },
      // Lança o consumo no extrato do hóspede e, se o item vendido tem
      // vínculo com um insumo do estoque, já dá baixa automática na mesma
      // hora - sem isso, o sistema venderia frigobar/produtos pra sempre sem
      // nunca acusar falta de estoque real.
      addConsumption: (item: Omit<ConsumptionItem, "id">) => {
        setConsumptions((prev) => [...prev, { ...item, id: uid() }]);
        if (item.supplyId && item.supplyQty) {
          const supplyId = item.supplyId;
          const supplyQty = item.supplyQty;
          setSupplyMovements((prev) => [
            {
              id: uid(),
              supplyId,
              type: "saida",
              quantity: supplyQty,
              date: day(0),
              note: `Venda no extrato — ${item.name}`,
            },
            ...prev,
          ]);
          setSupplies((prev) =>
            prev.map((s) => (s.id === supplyId ? { ...s, quantity: Math.max(0, s.quantity - supplyQty) } : s)),
          );
        }
      },
      // Remove o item do extrato e, se ele tinha baixado estoque na hora da
      // venda, devolve a quantidade certinho - senão excluir um lançamento
      // errado deixaria o estoque faltando sem motivo real.
      removeConsumption: (id: string) => {
        setConsumptions((prev) => {
          const item = prev.find((c) => c.id === id);
          if (item?.supplyId && item.supplyQty) {
            const supplyId = item.supplyId;
            const supplyQty = item.supplyQty;
            setSupplyMovements((sm) => [
              {
                id: uid(),
                supplyId,
                type: "entrada",
                quantity: supplyQty,
                date: day(0),
                note: `Estorno — item removido do extrato (${item.name})`,
              },
              ...sm,
            ]);
            setSupplies((sp) =>
              sp.map((s) => (s.id === supplyId ? { ...s, quantity: s.quantity + supplyQty } : s)),
            );
          }
          return prev.filter((c) => c.id !== id);
        });
      },
      addTransaction: (t: Omit<Transaction, "id">) =>
        setTransactions((prev) => [...prev, { ...t, id: uid() }]),
      addProduct: (p: Omit<Product, "id">) =>
        setProducts((prev) => [{ ...p, id: uid() }, ...prev]),
      removeProduct: (id: string) => setProducts((prev) => prev.filter((p) => p.id !== id)),
      addSupply: (s: Omit<SupplyItem, "id">) =>
        setSupplies((prev) => [{ ...s, id: uid() }, ...prev]),
      // Cria um grupo/categoria novo pra organizar o estoque. Ignora se já
      // existir um com o mesmo nome (case-insensitive), pra não duplicar
      // "Bebidas" e "bebidas" como grupos diferentes.
      addSupplyCategory: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        setSupplyCategories((prev) =>
          prev.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed],
        );
      },
      // Renomeia um grupo e atualiza todos os insumos que pertenciam a ele,
      // senão os itens ficariam presos no nome antigo (categoria "fantasma").
      renameSupplyCategory: (oldName: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === oldName) return;
        setSupplyCategories((prev) => prev.map((c) => (c === oldName ? trimmed : c)));
        setSupplies((prev) =>
          prev.map((s) => (s.category === oldName ? { ...s, category: trimmed } : s)),
        );
      },
      // Edita nome, categoria, unidade e mínimo. A quantidade em estoque em
      // si só muda por movimentação (entrada/saída), pra manter o histórico
      // de movimentações sempre batendo com o saldo atual.
      updateSupply: (id: string, patch: Partial<Omit<SupplyItem, "id" | "quantity">>) =>
        setSupplies((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s))),
      // Remove o insumo e desfaz o vínculo em qualquer produto do catálogo
      // que apontava pra ele — senão o produto continuaria "vendendo" um
      // insumo que não existe mais.
      removeSupply: (id: string) => {
        setSupplies((prev) => prev.filter((s) => s.id !== id));
        setProducts((prev) =>
          prev.map((p) => {
            if (p.supplyId !== id) return p;
            const { supplyId: _supplyId, qtyPerSale: _qtyPerSale, ...rest } = p;
            return rest;
          }),
        );
      },
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
      // Registra o pagamento do mês (salário + benefícios já somados) e
      // lança sozinho a despesa correspondente no Financeiro - mesmo
      // princípio do addSupplyMovement acima. Os dois ficam ligados pelo
      // transactionId, pra dar pra desfazer os dois juntos depois.
      addSalaryPayment: (p: Omit<SalaryPayment, "id" | "transactionId">) => {
        const transactionId = uid();
        setSalaryPayments((prev) => [{ ...p, id: uid(), transactionId }, ...prev]);
        setTransactions((prev) => [
          ...prev,
          {
            id: transactionId,
            date: p.date,
            description: `Salário — ${p.staffName} (${p.month})`,
            category: "Salários",
            amount: p.amount,
            type: "saida",
            status: "Pago",
          },
        ]);
      },
      // Desfaz um pagamento lançado errado: remove o registro e o lançamento
      // correspondente no Financeiro juntos, pra não deixar o dinheiro
      // "gasto" no fluxo de caixa sem o pagamento existir mais.
      removeSalaryPayment: (paymentId: string) => {
        setSalaryPayments((prev) => {
          const payment = prev.find((p) => p.id === paymentId);
          if (payment) {
            setTransactions((tx) => tx.filter((t) => t.id !== payment.transactionId));
          }
          return prev.filter((p) => p.id !== paymentId);
        });
      },
    }),
    [
      rooms,
      roomsLoading,
      roomsError,
      guests,
      reservations,
      reservationsLoading,
      reservationsError,
      consumptions,
      transactions,
      products,
      supplies,
      supplyCategories,
      supplyMovements,
      salaryPayments,
    ],
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

// Estilo do "chip" pequeno dentro das barras do mapa e das listas do
// Dashboard. Um quarto com check-in feito fica verde mesmo se ainda faltar
// pagar (o hóspede já está hospedado) - então "Falta pagar" precisa saltar
// aos olhos em cima de QUALQUER cor de barra (verde ou laranja), não pode
// ficar discreto igual o "PG", senão passa despercebido por quem olha rápido.
export function paymentChipStyle(res: Reservation): string {
  return paymentSituation(res) === "pago"
    ? "bg-black/15 text-current"
    : "bg-white text-destructive shadow-sm";
}

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
