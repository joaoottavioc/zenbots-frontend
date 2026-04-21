// Single source of truth for the QA corpus scenario registers.
// Adding/removing a scenario: update LABELS + DESCRIPTIONS + ORDER + GROUPS
// here. SCENARIO_COUNT derives from ORDER.length so it can't drift.

export const SCENARIO_LABELS: Record<string, string> = {
  add_single: "Add",
  add_multi: "Multi",
  continuation: "Cont",
  unavailable: "Unavail",
  remove: "Remove",
  suggestions: "Suggest",
  checkout: "Checkout",
  greeting: "Greet",
  abbreviation: "Abbrev",
  double_add: "Dbl Add",
  question: "Question",
  add_remove: "Add/Rm",
  // P1 Day 1.5 — added 2026-04-08
  digit_in_name: "Digit",
  subset_remove: "Subset",
  multi_remove: "Multi Rm",
  qty_reduction: "Qty -",
  multiturn_flow: "Multi-Turn",
  trap_question: "Trap Q",
  trap_clear: "Trap C",
  trap_unrelated_add: "Trap +",
  trap_finish: "Trap F",
};

// Plain-Portuguese descriptions for each scenario. Shown in tooltips on the
// heatmap column headers and in the Scenario Guide card.
export const SCENARIO_DESCRIPTIONS: Record<string, { title: string; desc: string; example: string }> = {
  add_single: {
    title: "Adicionar um item",
    desc: "Cliente pede UM produto. O bot deve colocar no carrinho com quantidade 1.",
    example: "\"quero uma coca-cola\"",
  },
  add_multi: {
    title: "Adicionar múltiplos itens",
    desc: "Cliente pede 2+ produtos diferentes com quantidades variadas em uma única mensagem.",
    example: "\"quero 2 hambúrgueres e uma coca\"",
  },
  digit_in_name: {
    title: "Dígitos no nome do produto",
    desc: "Testa se o bot não confunde números que fazem parte do nome (ex: \"pizza 4 queijos\") com quantidade.",
    example: "\"quero uma pizza 4 queijos\" (não 4 pizzas)",
  },
  abbreviation: {
    title: "Pedido por abreviação",
    desc: "Cliente usa apelido/abreviação do produto em vez do nome completo.",
    example: "\"manda uma brahma\" (para Cerveja Brahma 600ml)",
  },
  double_add: {
    title: "Mesmo item duas vezes",
    desc: "Cliente pede o mesmo produto em duas mensagens separadas. A quantidade deve somar (não duplicar linha).",
    example: "\"quero uma coca\" → ... → \"manda mais uma\"",
  },
  continuation: {
    title: "Continuação sem verbo",
    desc: "Após adicionar algo, cliente continua a lista sem repetir \"quero\". O padrão mais comum em produção.",
    example: "\"quero um hambúrguer\" → \"e uma coca\"",
  },
  remove: {
    title: "Remover item",
    desc: "Cliente pede para tirar um produto do carrinho pelo nome.",
    example: "\"tira o hambúrguer\"",
  },
  add_remove: {
    title: "Adicionar e depois remover",
    desc: "Cliente adiciona um produto e em seguida remove-o. O carrinho deve ficar vazio no final.",
    example: "\"quero uma coca\" → \"pode tirar a coca\"",
  },
  subset_remove: {
    title: "Remover parte do carrinho",
    desc: "Com múltiplos itens no carrinho, remover apenas UM deles sem afetar os outros.",
    example: "Carrinho [A×2, B×1] → \"tira o B\" → [A×2]",
  },
  multi_remove: {
    title: "Remover múltiplos itens",
    desc: "Cliente remove 2+ produtos diferentes de uma vez, mantendo os restantes.",
    example: "Carrinho [A, B, C] → \"tira o A e o B\" → [C]",
  },
  qty_reduction: {
    title: "Redução de quantidade",
    desc: "\"Deixa só N\" — muda a quantidade para um valor fixo (não subtrai). Guard F2.",
    example: "Carrinho [Coca×3] → \"deixa só 1 coca\" → [Coca×1]",
  },
  unavailable: {
    title: "Produto em falta",
    desc: "Cliente pede produtos, alguns disponíveis e outros em falta. Bot deve adicionar disponíveis e avisar sobre faltantes.",
    example: "\"quero X e Y\" (Y está em falta)",
  },
  multiturn_flow: {
    title: "Fluxo multi-turno (9 passos)",
    desc: "Conversa completa: saudação → sugestão → adicionar → continuar → pergunta → remover → finalizar → entrega → carrinho persiste.",
    example: "Teste composto de 9 mensagens consecutivas",
  },
  suggestions: {
    title: "Pedir sugestões",
    desc: "\"O que tem de bom?\" — bot mostra lista numerada, NÃO adiciona nada ao carrinho.",
    example: "\"o que vocês recomendam?\"",
  },
  trap_question: {
    title: "Armadilha: pergunta com sugestões ativas",
    desc: "Com sugestões visíveis, cliente pergunta sobre preço. Bot não pode confundir com seleção.",
    example: "(sugestões mostradas) → \"quanto custa o X?\"",
  },
  trap_clear: {
    title: "Armadilha: limpar com sugestões ativas",
    desc: "Com sugestões visíveis, cliente pede para limpar carrinho. Guard F4.",
    example: "(sugestões mostradas) → \"limpa tudo\"",
  },
  trap_unrelated_add: {
    title: "Armadilha: adicionar item não listado",
    desc: "Com sugestões visíveis, cliente pede um produto que NÃO está nas sugestões. Guard F5.",
    example: "(sugestões: A, B, C) → \"quero um D\"",
  },
  trap_finish: {
    title: "Armadilha: finalizar com sugestões ativas",
    desc: "Com sugestões visíveis, cliente fala \"finalizar\" em gíria. Bot deve iniciar checkout. Guard F1.",
    example: "(sugestões mostradas) → \"vamo finalizar\"",
  },
  question: {
    title: "Pergunta sobre produto",
    desc: "Cliente pergunta preço/descrição de um item. Bot responde, NÃO adiciona ao carrinho.",
    example: "\"quanto custa o hambúrguer?\"",
  },
  checkout: {
    title: "Proteção no checkout",
    desc: "Verifica que o carrinho persiste durante o fluxo de checkout (endereço, pagamento, etc.).",
    example: "Navegar pela máquina de estados do checkout",
  },
  greeting: {
    title: "Saudação",
    desc: "Cliente diz \"oi\", \"bom dia\". Bot responde amigável, sem modificar carrinho.",
    example: "\"oi\", \"boa noite\"",
  },
};

// Grouped by failure-mode family so the matrix reads left-to-right as
// "increasingly risky comprehension territory":
//   1. Adds and add variants
//   2. Continuation + remove + remove variants + multi-turn integration
//   3. Suggestion-trap variants
//   4. Trivial / state-machine scenarios (excluded from comprehension metric)
export const SCENARIO_ORDER: string[] = [
  // Adds
  "add_single", "add_multi", "digit_in_name", "abbreviation", "double_add",
  // Flow + removes
  "continuation", "remove", "add_remove", "subset_remove", "multi_remove", "qty_reduction",
  "unavailable", "multiturn_flow",
  // Suggestion handler / question
  "suggestions", "trap_question", "trap_clear", "trap_unrelated_add", "trap_finish", "question",
  // Easy / state-machine (excluded from comprehension)
  "checkout", "greeting",
];

// Groups for the Scenario Guide — mirrors SCENARIO_ORDER families
export const SCENARIO_GROUPS: { title: string; ids: string[] }[] = [
  {
    title: "Adicionar produtos",
    ids: ["add_single", "add_multi", "digit_in_name", "abbreviation", "double_add"],
  },
  {
    title: "Fluxo e remoção",
    ids: [
      "continuation", "remove", "add_remove", "subset_remove",
      "multi_remove", "qty_reduction", "unavailable", "multiturn_flow",
    ],
  },
  {
    title: "Sugestões e armadilhas",
    ids: [
      "suggestions", "trap_question", "trap_clear",
      "trap_unrelated_add", "trap_finish", "question",
    ],
  },
  {
    title: "Estado / Fáceis",
    ids: ["checkout", "greeting"],
  },
];

export const SCENARIO_COUNT = SCENARIO_ORDER.length;
