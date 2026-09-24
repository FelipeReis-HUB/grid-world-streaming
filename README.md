# Setor Ativo

Nível 2D com malha 3×3 de áreas, viewport independente da grade e NPCs
que só "pensam" quando o setor onde estão é ativado — um exercício de
**Representação do Mundo** para a disciplina de IA para Jogos.

JavaScript vanilla + HTML5 Canvas, sem dependências externas de lógica
(apenas fontes do Google Fonts para o visual).

## O que tem

- **Malha 3×3** — mundo contínuo de 2400×1800px dividido logicamente em 9
  áreas de 800×600.
- **Viewport independente da malha** — a câmera segue o jogador em pixels;
  a ativação de áreas é calculada à parte: ficam ativas as áreas que a
  câmera enxerga, mais uma folga de 40px, então uma vizinha só é ativada
  quando o jogador se aproxima da borda com ela e nenhuma área visível fica
  congelada. A câmera (720×540) com a folga cabe exatamente numa área
  (800×600), o que garante **no máximo 4 áreas ativas**. Só NPCs de áreas
  ativas são atualizados por frame.
- **Objetivo: sobreviver 1 minuto** — um cronômetro regressivo no HUD; ao
  zerar, o jogador vence. Se a saúde chegar a zero antes, é fim de jogo.
- **Overlay de debug** (tecla `M`) mostrando ao vivo quais das 9 áreas
  estão ativas no momento.
- **NPCs com IA simples** — patrulham entre dois pontos e perseguem o
  jogador em linha reta (vetor normalizado, sem pathfinding) ao entrar no
  raio de detecção.
- **3 tipos de coletável**: núcleos de pontuação, kits de primeiros
  socorros (➕) e caixas de munição (⚡). Kits e munição vão para o
  inventário e só fazem efeito quando usados; os núcleos só contam pontos.

## Controles

| Tecla | Ação |
|---|---|
| `W A S D` / setas | Mover |
| `1` | Usar kit médico — recupera saúde |
| `2` | Usar munição — dano em área nos inimigos ao redor |
| `M` | Alternar overlay de debug |
| `R` | Reiniciar (após vitória ou derrota) |

## Como executar

Sem build e sem dependências: basta abrir o **`index.html`** no navegador
(duplo clique no arquivo, ou pelo terminal):

```bash
xdg-open index.html     # Linux
open index.html         # macOS
start index.html        # Windows
```

Opcionalmente, é possível servir os arquivos por HTTP:

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

As fontes vêm do Google Fonts; sem internet o jogo funciona normalmente,
apenas com as fontes padrão do navegador.

## Estrutura

```
grid-world-streaming/
├── index.html      # marcação da página, HUD e overlay de fim de jogo
├── style.css        # identidade visual (tema "radar/arcade" escuro)
├── js/
│   ├── grid.js       # malha 3x3 de áreas
│   ├── items.js       # coletáveis (núcleos, kits, munição)
│   ├── npc.js           # IA de perseguição + vida dos inimigos
│   ├── player.js        # controle, saúde e inventário do jogador
│   ├── viewport.js     # câmera + cálculo de áreas ativas
│   └── main.js           # loop principal, cronômetro, integra tudo
└── RELATORIO.md    # relatório da atividade com as decisões de projeto
```

## Relatório da atividade

As decisões de projeto (por que a malha é um espaço contínuo, como o
streaming de áreas funciona, a máquina de estados dos NPCs, etc.) estão
detalhadas em [`RELATORIO.md`](./RELATORIO.md).
