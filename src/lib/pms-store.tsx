import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  createConsumption as apiCreateConsumption,
  createGuest as apiCreateGuest,
  createProduct as apiCreateProduct,
  createReservation as apiCreateReservation,
  createRoom as apiCreateRoom,
  createSalaryPayment as apiCreateSalaryPayment,
  createSupply as apiCreateSupply,
  createSupplyCategory as apiCreateSupplyCategory,
  createSupplyMovement as apiCreateSupplyMovement,
  createTransaction as apiCreateTransaction,
  deleteConsumptionApi,
  deleteProductApi,
  deleteSalaryPaymentApi,
  deleteSupplyApi,
  fetchConsumptions,
  fetchGuests,
  fetchProducts,
  fetchReservations,
  fetchRooms,
  fetchSalaryPayments,
  fetchSupplies,
  fetchSupplyCategories,
  fetchSupplyMovements,
  fetchTransactions,
  patchReservation,
  renameSupplyCategoryApi,
  updateSupplyApi,
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
// "yyyy-mm" do mês corrente — usado pra achar se um colaborador já foi pago
// este mês (ver StaffScreen/FinanceScreen).
export const currentMonth = () => day(0).slice(0, 7);

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

// Busca uma lista no backend ao montar e devolve [dados, loading, error] —
// mesmo padrão usado por rooms/reservations, agora reaproveitado pelas
// entidades que antes só existiam em memória (Hóspedes, Produtos, Estoque,
// Financeiro). Sem seed: se o backend não responder, a tela mostra vazio (e
// o erro), em vez de dado de demonstração fixo.
function useFetchedList<T>(fetcher: () => Promise<T[]>): [T[], boolean, string | null, (v: T[] | ((prev: T[]) => T[])) => void] {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        console.error("Não consegui buscar dados do backend:", err);
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [data, loading, error, setData];
}

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

  const [guests, , guestsError, setGuests] = useFetchedList(fetchGuests);
  const [consumptions, , , setConsumptions] = useFetchedList(fetchConsumptions);
  const [transactions, , transactionsError, setTransactions] = useFetchedList(fetchTransactions);
  const [products, , productsError, setProducts] = useFetchedList(fetchProducts);
  const [supplies, , suppliesError, setSupplies] = useFetchedList(fetchSupplies);
  const [supplyMovements, , , setSupplyMovements] = useFetchedList(fetchSupplyMovements);
  const [salaryPayments, , , setSalaryPayments] = useFetchedList(fetchSalaryPayments);

  // Categorias de insumo: guarda também o registro completo (id + nome) —
  // exposto ao resto do app só como string[] (nome), mas o id é necessário
  // aqui dentro pra poder renomear a categoria certa no backend.
  const [supplyCategoryRecords, setSupplyCategoryRecords] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchSupplyCategories()
      .then((data) => {
        if (!cancelled) setSupplyCategoryRecords(data);
      })
      .catch((err) => console.error("Não consegui buscar categorias de estoque:", err));
    return () => {
      cancelled = true;
    };
  }, []);
  const supplyCategories = useMemo(() => supplyCategoryRecords.map((c) => c.name), [supplyCategoryRecords]);

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
      guestsError,
      reservations,
      reservationsLoading,
      reservationsError,
      consumptions,
      transactions,
      transactionsError,
      products,
      productsError,
      supplies,
      suppliesError,
      supplyCategories,
      supplyMovements,
      salaryPayments,
      addGuest: async (g: Omit<Guest, "id" | "stays">) => {
        const created = await apiCreateGuest(g);
        setGuests((prev) => [created, ...prev]);
        return created;
      },
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
      // vínculo com um insumo do estoque, o próprio backend já dá baixa
      // automática e registra a movimentação — ver ConsumptionItemViewSet.
      addConsumption: async (item: Omit<ConsumptionItem, "id">) => {
        const created = await apiCreateConsumption(item);
        setConsumptions((prev) => [...prev, created]);
        if (created.supplyId && created.supplyQty) {
          const supplyId = created.supplyId;
          const supplyQty = created.supplyQty;
          setSupplies((prev) =>
            prev.map((s) => (s.id === supplyId ? { ...s, quantity: Math.max(0, s.quantity - supplyQty) } : s)),
          );
        }
        return created;
      },
      // Remove o item do extrato — o backend estorna a quantidade ao
      // estoque sozinho, senão excluir um lançamento errado deixaria o
      // estoque faltando sem motivo real.
      removeConsumption: async (id: string) => {
        const item = consumptions.find((c) => c.id === id);
        await deleteConsumptionApi(id);
        setConsumptions((prev) => prev.filter((c) => c.id !== id));
        if (item?.supplyId && item.supplyQty) {
          const supplyId = item.supplyId;
          const supplyQty = item.supplyQty;
          setSupplies((prev) =>
            prev.map((s) => (s.id === supplyId ? { ...s, quantity: s.quantity + supplyQty } : s)),
          );
        }
      },
      addTransaction: async (t: Omit<Transaction, "id">) => {
        const created = await apiCreateTransaction(t);
        setTransactions((prev) => [...prev, created]);
        return created;
      },
      addProduct: async (p: Omit<Product, "id">) => {
        const created = await apiCreateProduct(p);
        setProducts((prev) => [created, ...prev]);
        return created;
      },
      removeProduct: async (id: string) => {
        await deleteProductApi(id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
      },
      addSupply: async (s: Omit<SupplyItem, "id">) => {
        const created = await apiCreateSupply(s);
        setSupplies((prev) => [created, ...prev]);
        return created;
      },
      // Cria um grupo/categoria novo pra organizar o estoque. Ignora se já
      // existir um com o mesmo nome (case-insensitive), pra não duplicar
      // "Bebidas" e "bebidas" como grupos diferentes.
      addSupplyCategory: async (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        if (supplyCategoryRecords.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
        const created = await apiCreateSupplyCategory(trimmed);
        setSupplyCategoryRecords((prev) => [...prev, created]);
      },
      // Renomeia um grupo no backend — como SupplyItem referencia a
      // categoria por FK, todos os insumos daquele grupo acompanham o novo
      // nome automaticamente, sem precisar de UPDATE em massa manual.
      renameSupplyCategory: async (oldName: string, newName: string) => {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === oldName) return;
        const record = supplyCategoryRecords.find((c) => c.name === oldName);
        if (!record) return;
        const updated = await renameSupplyCategoryApi(record.id, trimmed);
        setSupplyCategoryRecords((prev) => prev.map((c) => (c.id === record.id ? updated : c)));
        setSupplies((prev) =>
          prev.map((s) => (s.category === oldName ? { ...s, category: trimmed } : s)),
        );
      },
      // Edita nome, categoria, unidade e mínimo. A quantidade em estoque em
      // si só muda por movimentação (entrada/saída), pra manter o histórico
      // de movimentações sempre batendo com o saldo atual.
      updateSupply: async (id: string, patch: Partial<Omit<SupplyItem, "id" | "quantity">>) => {
        const updated = await updateSupplyApi(id, patch);
        setSupplies((prev) => prev.map((s) => (s.id === id ? updated : s)));
      },
      // Remove o insumo — o backend desfaz sozinho o vínculo em qualquer
      // produto do catálogo que apontava pra ele, senão o produto
      // continuaria "vendendo" um insumo que não existe mais.
      removeSupply: async (id: string) => {
        await deleteSupplyApi(id);
        setSupplies((prev) => prev.filter((s) => s.id !== id));
        setProducts((prev) =>
          prev.map((p) => {
            if (p.supplyId !== id) return p;
            const { supplyId: _supplyId, qtyPerSale: _qtyPerSale, ...rest } = p;
            return rest;
          }),
        );
      },
      // Registra a movimentação — o backend já ajusta a quantidade do
      // insumo (sem deixar ficar negativa) e, se for entrada com custo,
      // lança a despesa sozinho no Financeiro.
      addSupplyMovement: async (m: Omit<SupplyMovement, "id">) => {
        const created = await apiCreateSupplyMovement(m);
        setSupplyMovements((prev) => [created, ...prev]);
        setSupplies((prev) =>
          prev.map((s) => {
            if (s.id !== m.supplyId) return s;
            const delta = m.type === "entrada" ? m.quantity : -m.quantity;
            return { ...s, quantity: Math.max(0, s.quantity + delta) };
          }),
        );
        if (m.type === "entrada" && m.unitCost) {
          fetchTransactions()
            .then(setTransactions)
            .catch((err) => console.error("Não consegui atualizar o financeiro:", err));
        }
        return created;
      },
      // Registra o pagamento do mês (salário + benefícios já somados) — o
      // backend lança sozinho a despesa correspondente no Financeiro,
      // ligada pelo transactionId, pra dar pra desfazer os dois juntos.
      addSalaryPayment: async (p: Omit<SalaryPayment, "id" | "transactionId">) => {
        const created = await apiCreateSalaryPayment(p);
        setSalaryPayments((prev) => [created, ...prev]);
        fetchTransactions()
          .then(setTransactions)
          .catch((err) => console.error("Não consegui atualizar o financeiro:", err));
        return created;
      },
      // Desfaz um pagamento lançado errado: o backend remove o registro e o
      // lançamento correspondente no Financeiro juntos, pra não deixar o
      // dinheiro "gasto" no fluxo de caixa sem o pagamento existir mais.
      removeSalaryPayment: async (paymentId: string) => {
        await deleteSalaryPaymentApi(paymentId);
        setSalaryPayments((prev) => prev.filter((p) => p.id !== paymentId));
        fetchTransactions()
          .then(setTransactions)
          .catch((err) => console.error("Não consegui atualizar o financeiro:", err));
      },
    }),
    [
      rooms,
      roomsLoading,
      roomsError,
      guests,
      guestsError,
      reservations,
      reservationsLoading,
      reservationsError,
      consumptions,
      transactions,
      transactionsError,
      products,
      productsError,
      supplies,
      suppliesError,
      supplyCategories,
      supplyCategoryRecords,
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
