# Setor Ativo

Nível 2D com malha 3×3 de áreas, viewport independente da grade e NPCs
que só "pensam" quando o setor onde estão é ativado — um exercício de
**Representação do Mundo** para a disciplina de IA para Jogos.

**Jogue agora:** https://claude.ai/artifact/CucAqvc9YwgazKWR4oyTrD

JavaScript vanilla + HTML5 Canvas, sem dependências externas de lógica
(apenas fontes do Google Fonts para o visual).

## O que tem

- **Malha 3×3** — mundo contínuo de 2400×1800px dividido logicamente em 9
  áreas de 800×600.
- **Viewport independente da malha** — a câmera segue o jogador em pixels;
  a ativação de áreas (área atual + até 8 vizinhas) é calculada à parte, em
  coordenadas de grade. Só NPCs de áreas ativas são atualizados por frame.
- **Overlay de debug** (tecla `M`) mostrando ao vivo quais das 9 áreas
  estão ativas no momento.
- **NPCs com IA simples** — patrulham entre dois pontos e perseguem o
  jogador em linha reta (vetor normalizado, sem pathfinding) ao entrar no
  raio de detecção.
- **3 tipos de coletável**: núcleos de pontuação, kits de primeiros
  socorros (➕) e caixas de munição (⚡) — ambos vão para o inventário e só
  fazem efeito quando usados.

## Controles

| Tecla | Ação |
|---|---|
| `W A S D` / setas | Mover |
| `1` | Usar kit médico — recupera saúde |
| `2` | Usar munição — dano em área nos inimigos ao redor |
| `M` | Alternar overlay de debug |
| `R` | Reiniciar (após vitória ou derrota) |

## Rodando localmente

Sem build, sem dependências — é só servir os arquivos estáticos:

```bash
python3 -m http.server 8000
# depois abra http://localhost:8000
```

(Abrir o `index.html` direto pelo `file://` também funciona na maioria dos
navegadores, mas servir por HTTP evita restrições de CORS em alguns casos.)

## Estrutura

```
jogo-ia/
├── index.html      # marcação da página, HUD e overlay de fim de jogo
├── style.css        # identidade visual (tema "radar/arcade" escuro)
├── js/
│   ├── grid.js       # malha 3x3 de áreas
│   ├── items.js       # coletáveis (núcleos, kits, munição)
│   ├── npc.js           # IA de perseguição + vida dos inimigos
│   ├── player.js        # controle, saúde e inventário do jogador
│   ├── viewport.js     # câmera + cálculo de áreas ativas
│   └── main.js           # loop principal, integra tudo
└── RELATORIO.md    # relatório da atividade com as decisões de projeto
```

## Relatório da atividade

As decisões de projeto (por que a malha é um espaço contínuo, como o
streaming de áreas funciona, a máquina de estados dos NPCs, etc.) estão
detalhadas em [`RELATORIO.md`](./RELATORIO.md).
