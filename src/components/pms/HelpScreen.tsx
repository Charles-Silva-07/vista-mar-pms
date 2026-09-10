import type { ReactNode } from "react";
import { BedDouble, ShoppingBag, UserCheck, CalendarRange, DoorOpen, Receipt, Info } from "lucide-react";

// Manual de uso do sistema, na ordem em que a pousada deve alimentar os
// cadastros: quartos > catálogo > hóspedes > reservas > check-in ao
// check-out. Fica dentro do próprio app (tela "Ajuda") pra não depender de
// um link externo - qualquer funcionário novo acha isso na hora.

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 flex gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <p>{children}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-accent text-xs font-semibold text-accent-foreground">
        {n}
      </span>
      <span className="text-foreground/90">{children}</span>
    </li>
  );
}

function Feature({
  icon: Icon,
  title,
  where,
  what,
  children,
  note,
}: {
  icon: typeof BedDouble;
  title: string;
  where: string;
  what: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-primary" />
          {title}
        </h3>
        <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
          {where}
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{what}</p>
      <ol className="mt-3 space-y-2">{children}</ol>
      {note && <Note>{note}</Note>}
    </div>
  );
}

function Part({ n, title, subtitle, children }: { n: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {n}
        </span>
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      <p className="ml-9 text-sm text-muted-foreground">{subtitle}</p>
      <div className="ml-0 space-y-3 sm:ml-9">{children}</div>
    </section>
  );
}

export function HelpScreen() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-6">
      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground sm:p-5">
        Guia rápido pra colocar a pousada pra funcionar no sistema: cadastre nesta ordem — quartos,
        catálogo, hóspedes — e depois é só operar o dia a dia (reserva, consumo e check-out).
      </div>

      <Part
        n="1"
        title="Configurações iniciais"
        subtitle="Antes da primeira reserva: cadastre os quartos e o catálogo do que a pousada vende."
      >
        <Feature
          icon={BedDouble}
          title="Cadastrar os quartos"
          where="Mapa → Gerenciar quartos"
          what="Cada acomodação física da pousada, com o valor da diária já embutido. É o quarto que aparece no mapa de reservas."
          note={
            <>
              Não existe tela separada de &ldquo;tarifário&rdquo;: o valor da diária fica direto no
              cadastro do quarto. Pra mudar o preço depois, use o lápis de editar ao lado do quarto na
              mesma janela.
            </>
          }
        >
          <Step n={1}>
            Na tela <b>Mapa</b>, clique em <b>Gerenciar quartos</b>, no canto superior.
          </Step>
          <Step n={2}>
            Clique em <b>Cadastrar quarto</b> e preencha o <b>Número</b> (ex.: 01, 102) e a{" "}
            <b>Categoria</b> (ex.: Standard, Suíte, Solteiro).
          </Step>
          <Step n={3}>
            Informe o <b>Valor da diária</b> em reais — é o preço padrão que o sistema vai usar em toda
            reserva desse quarto.
          </Step>
          <Step n={4}>
            Clique em <b>Cadastrar quarto</b> para salvar.
          </Step>
        </Feature>

        <Feature
          icon={ShoppingBag}
          title="Cadastrar o catálogo (frigobar, bebidas, serviços)"
          where="Menu → Produtos"
          what="Tudo que a pousada vende além da diária — água, refrigerante, passeio, lavanderia. É o que aparece na hora de lançar consumo na conta do hóspede."
          note="O vínculo com estoque é opcional. Se não quiser controlar quantidade (só cobrar o item), deixe em “Nenhum (sem controle de estoque)”."
        >
          <Step n={1}>
            Abra a tela <b>Produtos</b> no menu lateral e clique em <b>Novo Item</b>.
          </Step>
          <Step n={2}>
            Preencha o <b>Nome</b> (ex.: &ldquo;Água mineral 500ml&rdquo;), a <b>Categoria</b> e o{" "}
            <b>Valor</b> cobrado do hóspede.
          </Step>
          <Step n={3}>
            <i>Opcional:</i> em <b>Vincular a insumo do estoque</b>, ligue o item a um insumo já
            cadastrado na tela <b>Estoque</b> — assim, toda venda desconta automaticamente a quantidade
            do estoque.
          </Step>
          <Step n={4}>
            Clique em <b>Salvar item</b>.
          </Step>
        </Feature>
      </Part>

      <Part
        n="2"
        title="Cadastro de hóspedes"
        subtitle="Registre o hóspede com os dados exigidos pela Ficha Nacional de Registro de Hóspedes (FNRH), obrigatória por lei."
      >
        <Feature
          icon={UserCheck}
          title="Registrar um novo hóspede"
          where="Menu → Hóspedes"
          what="A ficha completa do hóspede — documento, contato e dados de viagem — que fica guardada no histórico da pousada."
          note={
            <>
              Cadastre o hóspede aqui <b>antes</b> de criar a reserva dele — assim você já tem a ficha
              pronta e só escreve o nome na hora de reservar. Use a busca por nome ou CPF pra achar um
              hóspede que já se hospedou antes.
            </>
          }
        >
          <Step n={1}>
            Na tela <b>Hóspedes</b>, clique em <b>Novo Hóspede</b>.
          </Step>
          <Step n={2}>
            Preencha <b>Nome completo</b>, <b>CPF/Passaporte</b>, <b>Telefone</b> e <b>E-mail</b> —
            esses quatro são obrigatórios.
          </Step>
          <Step n={3}>
            Complete o restante da FNRH: país de origem, motivo da viagem, meio de transporte, cidade de
            origem e próximo destino.
          </Step>
          <Step n={4}>
            Clique em <b>Cadastrar hóspede</b>.
          </Step>
        </Feature>
      </Part>

      <Part
        n="3"
        title="Operação de reservas"
        subtitle="O dia a dia: reservar um quarto no mapa, definir a tarifa da estadia e registrar o pagamento antecipado, se houver."
      >
        <Feature
          icon={CalendarRange}
          title="Criar uma reserva"
          where="Mapa → clique numa célula vazia"
          what="O agendamento da estadia — quarto, período e hóspede — que aparece como uma barra colorida no mapa de ocupação."
          note={
            <>
              O campo de hóspede na reserva é só o nome (texto livre) — ele não puxa automaticamente a
              ficha da tela Hóspedes. Digite o nome completo igual ao da ficha, pra não ficar duplicado
              no histórico.
            </>
          }
        >
          <Step n={1}>
            Na tela <b>Mapa</b>, clique em qualquer célula vazia na linha do quarto desejado (ou em{" "}
            <b>+ Nova Reserva</b> no menu).
          </Step>
          <Step n={2}>
            Digite o <b>nome do hóspede</b> e confira o <b>Quarto</b> selecionado.
          </Step>
          <Step n={3}>
            Ajuste <b>Check-in</b>, quantidade de <b>Diárias</b> e a <b>Origem da reserva</b> (Direto,
            Booking, etc.).
          </Step>
          <Step n={4}>
            A <b>tarifa</b> é puxada automaticamente do valor cadastrado no quarto — o total da estadia
            aparece no canto da tela.
          </Step>
          <Step n={5}>
            Se o hóspede já pagou algo adiantado, informe em <b>Valor pago agora</b> (ou use os atalhos{" "}
            <b>Sinal (50%)</b> / <b>Pago integral</b>).
          </Step>
          <Step n={6}>
            Clique em <b>Salvar reserva</b>.
          </Step>
        </Feature>

        <Feature
          icon={Receipt}
          title="Acompanhar pagamento da reserva"
          where="Mapa → clique na barra da reserva"
          what="O status financeiro da estadia antes do hóspede chegar — se ainda não pagou nada, deu sinal ou já quitou tudo."
        >
          <Step n={1}>No mapa, clique na barra colorida da reserva.</Step>
          <Step n={2}>
            Em <b>Situação financeira</b>, atualize o <b>Valor pago</b> conforme o hóspede for pagando,
            ou use <b>Marcar sinal (50%)</b> / <b>Marcar pago integral</b>.
          </Step>
          <Step n={3}>
            A etiqueta ao lado (ex.: <i>Pendente</i>, <i>Sinal</i>, <i>Pago</i>) muda sozinha conforme o
            valor.
          </Step>
        </Feature>
      </Part>

      <Part
        n="4"
        title="Check-in, consumo e check-out"
        subtitle="Do dia em que o hóspede chega até o fechamento da conta na saída."
      >
        <Feature
          icon={DoorOpen}
          title="Check-in"
          where="Automático na data marcada"
          what="O momento em que a reserva vira uma hospedagem em andamento."
        >
          <Step n={1}>
            Não existe um botão de &ldquo;fazer check-in&rdquo;: assim que chega o dia de entrada
            cadastrado na reserva, ela sai da cor de <i>reservado</i> e passa para <i>ocupado</i>{" "}
            sozinha, tanto no <b>Mapa</b> quanto no <b>Dashboard</b>.
          </Step>
          <Step n={2}>
            No <b>Dashboard</b>, a seção <b>Hospedagens em andamento</b> lista todos os quartos ocupados
            no momento.
          </Step>
        </Feature>

        <Feature
          icon={ShoppingBag}
          title="Lançar consumo na conta"
          where="Dashboard → Conta"
          what="Registrar o que o hóspede consumiu durante a estadia (frigobar, serviços) pra cobrar tudo junto na saída."
        >
          <Step n={1}>
            No <b>Dashboard</b>, em <b>Hospedagens em andamento</b>, clique em <b>Conta</b> ao lado do
            hóspede.
          </Step>
          <Step n={2}>
            Em <b>Adicionar item ao consumo</b>, escolha o produto do catálogo (ou <i>Outro (avulso)</i>{" "}
            pra algo fora do catálogo) e a <b>quantidade</b>.
          </Step>
          <Step n={3}>
            Clique em <b>Adicionar item</b> — ele entra na lista de <b>Consumos extras</b> do extrato,
            somado ao valor da diária.
          </Step>
          <Step n={4}>
            Repita a cada novo consumo durante a estadia. Dá pra remover um item lançado errado clicando
            na lixeira ao lado dele.
          </Step>
        </Feature>

        <Feature
          icon={Receipt}
          title="Fechar a conta (check-out)"
          where="Mesma janela de Conta"
          what="Encerrar a estadia, cobrar o saldo restante e emitir o recibo."
        >
          <Step n={1}>
            Na janela de <b>Conta</b>, confira o <b>Total da estadia</b> (diárias + consumos) e o que já
            foi pago antes (sinal/entrada).
          </Step>
          <Step n={2}>
            O sistema mostra o <b>Saldo a pagar agora</b> — só a diferença que falta.
          </Step>
          <Step n={3}>
            Selecione a <b>Forma de pagamento</b> (Pix, Cartão de Crédito ou Dinheiro).
          </Step>
          <Step n={4}>
            Clique em <b>Receber e Concluir Check-out</b>.
          </Step>
          <Step n={5}>
            O recibo é gerado automaticamente na tela — a reserva sai de &ldquo;em andamento&rdquo; e vai
            para o histórico de hóspedes finalizados.
          </Step>
        </Feature>
      </Part>
    </div>
  );
}
