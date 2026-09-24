# Relatório — Malha, Viewport e IA de Perseguição

**Disciplina:** IA para Jogos — Representação do Mundo
**Autor:** Felipe Reis
**Como executar:** abrir o arquivo `index.html` no navegador

---

## 1. Visão geral

O jogo implementa um nível composto por uma malha de **9 áreas organizadas em
uma grade 3×3**, contendo itens coletáveis e NPCs. O jogador se move
livremente pelo cenário e é perseguido por NPCs quando entra no raio de
detecção deles. A câmera (viewport) é independente da malha: ela segue o
jogador em pixels, enquanto a ativação/desativação de áreas — e,
consequentemente, dos NPCs nelas contidos — é decidida separadamente, pela
região que a câmera enxerga (mais uma pequena folga). O objetivo do
nível é **sobreviver durante 1 minuto**.

Tecnologia: **JavaScript vanilla + HTML5 Canvas**, sem dependências
externas de lógica (as únicas referências externas são fontes do Google
Fonts, puramente estéticas).

## 2. Estrutura do projeto

```
grid-world-streaming/
├── index.html      # marcação da página e elementos de HUD/overlay
├── style.css        # identidade visual (tema "radar/arcade" escuro)
├── js/
│   ├── grid.js       # malha 3x3 de áreas
│   ├── items.js      # coletáveis
│   ├── npc.js         # IA de perseguição
│   ├── player.js      # controle do jogador
│   ├── viewport.js   # câmera + cálculo de áreas ativas
│   └── main.js        # loop principal, cronômetro, integra tudo
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

Vista como grafo, a malha é uma estrutura bem simples: cada área é um nó e
áreas vizinhas são ligadas por arestas. Por isso não é preciso guardar
matriz nem lista de adjacência: os vizinhos de `(row, col)` são obtidos
direto pelos índices (`Grid.areaAt(row ± 1, col ± 1)`), que retorna `null`
fora dos limites da malha.

### 3.2 Viewport independente da malha (viewport.js + main.js)

Este é o ponto central do exercício. Duas responsabilidades são mantidas
propositalmente **desacopladas**:

- **Câmera (`Camera.follow`)** — puramente visual. Segue o jogador em
  pixels, com clamp para não mostrar fora dos limites do mundo. Não sabe
  nada sobre a malha.
- **Conjunto de áreas ativas (`computeActiveAreas`)** — puramente lógico.
  A cada frame, pega o retângulo da câmera, expande pela folga de ativação
  e retorna um `Set` com os ids das áreas que esse retângulo intersecta.

**Regra de ativação.** Uma área está ativa se estiver na tela ou a menos
da folga (`ACTIVATION_MARGIN_X/Y`, 40px × 30px) de entrar nela. Como a
câmera segue o jogador, isso equivale a dizer que a vizinha só é ativada
quando o jogador se aproxima da borda com ela; e, ao contrário de uma regra
baseada só na posição do jogador, nenhuma área que aparece na tela fica
congelada.

O limite de **no máximo 4 áreas ativas** vem do tamanho da câmera: ela tem
720×540px, e somada à folga dos dois lados dá exatamente 800×600px, o
tamanho de uma área. Um retângulo que não é maior que uma área cobre no
máximo 2 colunas e 2 linhas da malha, ou seja, 4 áreas (num canto). No
meio de uma área só ela fica ativa. Os índices são limitados às bordas da
malha, então nas extremidades do mundo nenhuma área inexistente é
considerada. Uma verificação percorrendo todas as posições do mapa
confirmou: nunca mais de 4 áreas ativas e nenhuma área visível inativa.

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
perde 20 de saúde e recebe 1.5s de invencibilidade (com piscar visual).
Assim, enquanto houver sobreposição com um NPC, o jogador continua perdendo
saúde em intervalos, sem zerar a vida num único contato. O jogo termina
quando a saúde chega a zero.

### 3.4 IA dos NPCs (npc.js)

Máquina de estados simples com dois estados. O enunciado pede que os NPCs
ativos vão em direção ao jogador; a patrulha foi acrescentada para que eles
não fiquem parados enquanto o jogador está longe:

- **PATROL** — anda entre dois waypoints fixos dentro da própria área,
  invertendo o sentido ao chegar perto de um deles.
- **CHASE** — ativado quando a distância até o jogador fica menor que
  `detectionRadius` (160px). O NPC persegue usando apenas o **vetor
  normalizado `(player.pos - npc.pos)`**, recalculado a cada frame, sem
  pathfinding. Se o jogador escapar além de
  `leashRadius` (260px), o NPC desiste e volta a patrulhar.

Cada área recebe **8 NPCs** (`NPCS_PER_AREA` em `main.js`), totalizando
**72 inimigos** no mundo. Eles nascem distribuídos numa elipse ao redor do
centro da área (35% da largura e da altura), o que mantém todos dentro da
própria área e longe do ponto de partida do jogador: na área central, o
inimigo mais próximo começa a 210px, fora do raio de detecção. O valor foi
ajustado jogando: com 1 ou 2 NPCs por área o nível era fácil, com 5 ficou
com dificuldade mediana, e 8 deixa o nível difícil, que foi o objetivo.

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

- **Núcleo (losango dourado)** — item de pontuação (`score/total`). Não
  decide a vitória, que depende só do cronômetro; aparece no placar final.
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

O jogador começa com 100 de saúde na área central (1,1), com um
**cronômetro regressivo de 60 segundos** no HUD (`SURVIVAL_TIME` em
`main.js`), que fica vermelho nos últimos 10 segundos. Vencer = sobreviver
até o cronômetro zerar. Perder = saúde chegar a zero ao ser tocado por NPCs
antes disso. Os núcleos coletados (18 no total, 2 por área × 9 áreas)
aparecem no placar final como pontuação.

## 5. Testes de balanceamento e performance

*Seção a preencher com os resultados dos testes.*

O enunciado pede para testar o balanceamento em diferentes cenários. Os
parâmetros abaixo são os pontos de ajuste do jogo e os valores atuais:

| Parâmetro | Onde | Valor atual |
|---|---|---|
| Inimigos por área | `main.js` (`NPCS_PER_AREA`) | 8 |
| Tamanho das áreas | `grid.js` (`AREA_W`, `AREA_H`) | 800×600px |
| Folga de ativação | `viewport.js` (`ACTIVATION_MARGIN_X/Y`) | 40×30px |
| Dano por contato | `player.js` (`hit`) | 20 |
| Tempo de sobrevivência | `main.js` (`SURVIVAL_TIME`) | 60s |

### 5.1 Quantidade de inimigos (dezenas / centenas / milhares)

| Cenário | Total de inimigos | Resultado | Observações |
|---|---|---|---|
| Dezenas | | | |
| Centenas | | | |
| Milhares | | | |

### 5.2 Tamanho das áreas (pequenas / médias / grandes)

| Cenário | Tamanho | Resultado | Observações |
|---|---|---|---|
| Pequenas | | | |
| Médias | 800×600px | | |
| Grandes | | | |

### 5.3 Distância de ativação, dano e tempo

| Parâmetro | Valor testado | Resultado | Observações |
|---|---|---|---|
| Folga de ativação | | | |
| Dano por contato | | | |
| Tempo de sobrevivência | | | |

### 5.4 Performance

| Cenário | Total de inimigos | Áreas ativas | Desempenho (FPS / ms por quadro) |
|---|---|---|---|
| | | | |

### 5.5 Conclusões

*A preencher.*

## 6. Como executar

O projeto não precisa de build nem de instalação: basta abrir o arquivo
**`index.html`** em qualquer navegador moderno (duplo clique ou
`xdg-open index.html`). Opcionalmente, pode ser servido por HTTP com
`python3 -m http.server 8000` e acessado em `http://localhost:8000`.
