# Relatório — Malha, Viewport e IA de Perseguição

**Disciplina:** IA para Jogos — Representação do Mundo
**Autor:** Felipe Reis
**Link para teste:** https://claude.ai/artifact/CucAqvc9YwgazKWR4oyTrD

---

## 1. Visão geral

O jogo implementa um nível composto por uma malha de **9 áreas organizadas em
uma grade 3×3**, contendo itens coletáveis e NPCs. O jogador se move
livremente pelo cenário e é perseguido por NPCs quando entra no raio de
detecção deles. A câmera (viewport) é independente da malha: ela segue o
jogador em pixels, enquanto a ativação/desativação de áreas — e,
consequentemente, dos NPCs nelas contidos — é decidida separadamente, em
coordenadas de grade.

Tecnologia: **JavaScript vanilla + HTML5 Canvas**, sem dependências
externas de lógica (as únicas referências externas são fontes do Google
Fonts, puramente estéticas).

## 2. Estrutura do projeto

```
jogo-ia/
├── index.html      # marcação da página e elementos de HUD/overlay
├── style.css        # identidade visual (tema "radar/arcade" escuro)
├── js/
│   ├── grid.js       # malha 3x3 de áreas
│   ├── items.js      # coletáveis
│   ├── npc.js         # IA de perseguição
│   ├── player.js      # controle do jogador
│   ├── viewport.js   # câmera + cálculo de áreas ativas
│   └── main.js        # loop principal, integra tudo
└── RELATORIO.md
```

## 3. Decisões de projeto

### 3.1 Malha (grid.js)

Em vez de tratar as 9 áreas como cenas separadas (com carregamento/corte de
tela ao trocar de área), optei por um **único espaço de coordenadas
contínuo** de 2400×1800px, dividido **logicamente** em 9 áreas de 800×600.
Cada área (`Area`) guarda `row`, `col`, `id`, posição/dimensões em pixels de
mundo, e as listas de `items` e `npcs` que pertencem a ela.

Essa escolha evita telas de carregamento entre setores (o jogador anda
livremente de uma área para outra) e, ao mesmo tempo, preserva a malha como
unidade lógica de organização — que é o que o exercício pede para explorar
no sistema de viewport/streaming.

A função `Grid.neighborsOf(area, radius)` usa **distância de Chebyshev**
(`max(|Δrow|, |Δcol|)`) para encontrar vizinhos: com `radius = 1`, uma área
no meio da grade tem até 8 vizinhas (inclui diagonais), enquanto áreas de
canto têm menos, por estarem na borda da malha.

### 3.2 Viewport independente da malha (viewport.js + main.js)

Este é o ponto central do exercício. Duas responsabilidades são mantidas
propositalmente **desacopladas**:

- **Câmera (`Camera.follow`)** — puramente visual. Segue o jogador em
  pixels, com clamp para não mostrar fora dos limites do mundo. Não sabe
  nada sobre a malha.
- **Conjunto de áreas ativas (`computeActiveAreas`)** — puramente lógico.
  A cada frame, calcula a área atual do jogador (`grid.areaFromWorld`) e
  suas vizinhas (`grid.neighborsOf`), retornando um `Set` de ids de áreas
  ativas.

No loop principal (`main.js`), **somente os NPCs cuja `homeArea` está no
conjunto ativo recebem `update()`** a cada frame; os demais permanecem
parados na última posição simulada, sem gastar ciclos com detecção de
jogador ou movimento. Isso reproduz, em pequena escala, a técnica de
**level streaming**/ativação de chunks usada em mundos abertos: o custo de
simulação de IA cresce com o número de áreas *ativas*, não com o tamanho
total do mundo.

Itens seguem a mesma regra (só são atualizados/checados para colisão
quando a área a que pertencem está ativa), embora o ganho de desempenho
aqui seja menor, já que sua "atualização" é apenas uma animação de
flutuação.

Um **overlay de debug** (desenhado no canto superior direito do canvas,
alternável com a tecla `M`) mostra a grade 3×3 em miniatura: células em
ciano são áreas ativas, células cinza são áreas inativas/congeladas, e um
contorno laranja marca a área onde o jogador está no momento. As próprias
áreas do mundo também são desenhadas de forma visualmente diferente
(ativas: coloridas e com borda cian; inativas: escurecidas), tornando o
comportamento do streaming visível mesmo sem o overlay.

### 3.3 Jogador (player.js)

Movimento em 8 direções com WASD ou setas, normalizado (`dx/len, dy/len`)
para não andar mais rápido na diagonal. Colisão simples: `clamp` da
posição nos limites externos do mundo — não há paredes internas entre
áreas, pois a malha é uma divisão lógica, não física.

O jogador tem **saúde numérica (0–100)** em vez de vidas inteiras, além de
um pequeno **inventário** (`medkits`, `ammo`). Ao ser tocado por um NPC,
perde 20 de saúde e recebe 1.5s de invencibilidade (com piscar visual),
evitando perder saúde repetidamente em um único contato contínuo. O jogo
termina quando a saúde chega a zero.

### 3.4 IA dos NPCs (npc.js)

Máquina de estados simples com dois estados, exatamente como sugerido no
enunciado ("perseguir o jogador em linha reta"):

- **PATROL** — anda entre dois waypoints fixos dentro da própria área,
  invertendo o sentido ao chegar perto de um deles.
- **CHASE** — ativado quando a distância até o jogador fica menor que
  `detectionRadius` (160px). O NPC persegue usando apenas o **vetor
  normalizado `(player.pos - npc.pos)`**, recalculado a cada frame — sem
  pathfinding, exatamente como pedido. Se o jogador escapar além de
  `leashRadius` (260px), o NPC desiste e volta a patrulhar.

Como descrito acima, a IA só roda (`update()` é chamado) quando a área de
origem do NPC está ativa — um NPC "congelado" não faz detecção nem
movimento algum.

Cada NPC também tem **pontos de vida** (60): ao ser atingido pela caixa de
munição do jogador, sofre dano e pisca branco por 150ms; uma barra de vida
aparece acima dele enquanto estiver danificado. Ao chegar a 0, o NPC morre
(`dead = true`) e para de ser atualizado e desenhado.

### 3.5 Coletáveis (items.js)

Cada área recebe **4 itens** de 3 tipos diferentes, posicionados com um
gerador pseudo-aleatório determinístico (seed derivada do id da área) — o
layout do nível é sempre o mesmo entre recarregamentos, o que facilita
testar/demonstrar o comportamento do viewport de forma reprodutível:

- **Núcleo (losango dourado)** — item de pontuação original; conta para a
  condição de vitória (`score/total`).
- **Kit de primeiros socorros ➕ (caixa verde)** — ao ser coletado, vai
  para o inventário (`player.medkits++`). Não cura sozinho: o jogador
  precisa **usar** o kit (tecla `1`) para recuperar 40 de saúde,
  consumindo uma unidade do inventário.
- **Caixa de munição ⚡ (caixa amarela)** — ao ser coletada, vai para o
  inventário (`player.ammo++`). Ao ser **usada** (tecla `2`), aplica dano
  em área (35 de dano, raio de 220px) a todos os NPCs vivos ao redor do
  jogador — independentemente de a área deles estar ativa no momento, já
  que é um efeito instantâneo e local, não uma simulação contínua. Um
  anel amarelo expansivo é desenhado por ~260ms para visualizar o alcance
  do ataque.

Todos usam a mesma checagem de colisão círculo-círculo contra o jogador;
o que muda ao coletar é só o efeito, decidido em `main.js` de acordo com
`item.type`.

## 4. Controles e fluxo de jogo

- **WASD / setas** — mover o jogador
- **1** — usar kit de primeiros socorros (➕ cura 40 de saúde)
- **2** — usar caixa de munição (⚡ dano em área nos inimigos ao redor)
- **M** — alternar overlay de debug (grade de áreas ativas)
- **R** — reiniciar após vitória ou derrota

O jogador começa com 100 de saúde na área central (1,1). Vencer = coletar
todos os núcleos do mundo (18 no total, 2 por área × 9 áreas). Perder =
saúde chegar a zero ao ser tocado por NPCs em estado de perseguição.

## 5. Link para testar a solução

**https://claude.ai/artifact/CucAqvc9YwgazKWR4oyTrD**

O link acima roda a versão publicada do jogo (mesmo código-fonte deste
repositório) diretamente no navegador, sem necessidade de instalação.
