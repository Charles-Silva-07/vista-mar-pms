# Pousada Flow

Crie um sistema de gestão hoteleira (PMS) e financeiro moderno e responsivo para pousadas, focado em alta usabilidade e design clean, inspirado na eficiência do Booking.com, no minimalismo do Airbnb e na estrutura profissional do Cloudbeds. O sistema deve ser um Single Page Application (SPA) com uma barra de navegação lateral (Sidebar) fixa e os seguintes módulos e telas intercambiáveis:

1. DIRETRIZES DE ESTILO VISUAL E UX:

- Use Tailwind CSS com uma paleta de cores profissional: tons de azul-escuro/marinho para a marca (confiança), cinzas claros para o fundo do sistema, verde para status "Disponível/Pago/Entrada" e vermelho/laranja para alertas ou "Ocupado/Saída".

- Interface totalmente responsiva (Mobile Friendly), pois os funcionários e camareiras usarão tablets e telemóveis na pousada.

- Utilize componentes modernos (como os da Shadcn UI) para calendários, tabelas, modais estruturados e cards de métricas.

2. BARRA LATERAL DE NAVEGAÇÃO (Sidebar):

- Deve conter o logotipo/nome da pousada ("Pousada Vista Mar") e os links de navegação para alternar entre as telas: "Dashboard (Visão Geral)", "Mapa de Reservas", "Hóspedes (FNRH)" e "Financeiro".

- No rodapé da sidebar, inclua uma identificação fixa do funcionário logado (ex: "Recepção - Ana Paula | Turno 07:00 - 15:00").

3. TELA 1: DASHBOARD (Visão Geral):

- Cards de Métricas no topo: Ocupação Hoje (%), Quartos Ocupados (X/Y), Check-ins Pendentes, Check-outs Pendentes e Faturamento do Dia (R$).

- Seção de "Ações Rápidas": Botões destacados para "Nova Reserva", "Fazer Check-in" e "Lançar Consumo".

- Duas colunas principais abaixo das métricas:

  - Coluna Esquerda ("Chegadas previstas para hoje"): Lista com nome do hóspede, horário previsto, número do quarto e tipo de acomodação.

  - Coluna Direita ("Hospedagens em andamento"): Lista dos quartos ocupados no momento. Cada item deve ter um botão "Conta" que abre um modal detalhado de extrato do quarto (descrito no item 7).

4. TELA 2: MAPA DE RESERVAS (Grid de Ocupação):

- O coração do sistema: Uma grade/grid interativa simulando uma linha do tempo (timeline).

- Linhas: Lista de quartos numerados com suas categorias (ex: "101 - Suíte Luxo", "102 - Standard Casal", etc.).

- Colunas: Dias do mês atual em sequência horizontal cronológica.

- Dentro do grid, exiba barras horizontais coloridas representando as reservas que ocupam aqueles dias com o nome do hóspede por cima.

- Cores das barras por status: Azul (Confirmada), Verde (Em andamento/Check-in feito), Cinza (Finalizada), Vermelho (Cancelada/No-show).

- Interação: Clicar em uma célula vazia abre o modal "Nova Reserva". Clicar em uma barra existente abre o modal de detalhes da reserva.

5. TELA 3: CADASTRO DE HÓSPEDES (Foco em Legislação FNRH):

- Barra de busca funcional no topo (filtrar por Nome ou CPF/Passaporte) e um botão "+ Novo Hóspede".

- Tabela listando os clientes com colunas: Hóspede (com país de origem), Documento, Contato (Telefone e E-mail), Viagem (Motivo e itinerário), Estadias (Quantidade) e Ações (botão "Ficha").

- O formulário de cadastro do hóspede (FNRH) deve coletar obrigatoriamente: Nome Completo, CPF/Passaporte, Telefone, E-mail, Motivo da Viagem (Lazer, Negócios, Eventos, etc.), Meio de Transporte utilizado, Última Cidade/Estado e Próximo Destino.

6. TELA 4: FINANCEIRO (Fluxo de Caixa e Despesas da Pousada):

- Cards de Resumo no topo: "Total de Entradas (Mês)", "Total de Saídas (Despesas)" e "Lucro Líquido / Saldo Atual".

- Botão de ação destacado: "+ Lançar Despesa", que abre um modal com formulário contendo: Descrição (ex: "Conta de Energia", "Compra de Insumos"), Valor (R$), Categoria (Dropdown com: Energia/Água, Lavanderia, Insumos/Frigobar, Salários, Manutenção), Data de Vencimento e Status (Pago ou Pendente).

- Tabela de Fluxo de Caixa Centralizada: Lista unificada em ordem cronológica de todas as movimentações financeiras da pousada. As entradas de dinheiro (vindos de reservas e consumos) devem exibir valores em verde (+). As saídas (despesas operacionais lançadas) devem exibir valores em vermelho (-).

- Inclua um gráfico visual simples (de barras ou linhas) comparando o total de Entradas vs. Saídas para análise de saúde financeira da pousada.

7. MODAL DE DETALHES DA CONTA / CONSUMO (Acoplado ao botão "Conta" do Dashboard):

- Interface em modal simulando o extrato final do hóspede para o Check-out.

- Deve listar o valor acumulado das diárias do quarto atual mais uma lista detalhada de itens consumidos extras (ex: 2 Águas minerais, 1 Refrigerante, Taxa de lavanderia).

- Inclua um botão interno "+ Adicionar Item ao Consumo" com campos de nome do produto, quantidade e valor unitário para atualizar o extrato instantaneamente.

- Exiba o valor total geral somado e as opções de pagamento (Pix, Cartão de Crédito, Dinheiro) com um botão final de destaque: "Concluir Check-out e Emitir Recibo".

Substitua os dados rígidos por estados locais (useState) do React para que a navegação da sidebar funcione perfeitamente, os modais abram e fechem corretamente ao clique dos botões e as buscas na tabela filtrem de verdade os dados simulados na tela. O código deve ser modular, limpo e preparado para futuras integrações com uma API em Python/Django.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/34c4d958-05a7-4fcd-9cce-af8d426c519d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
