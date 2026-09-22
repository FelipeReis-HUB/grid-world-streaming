// viewport.js — Câmera e sistema de ativação de áreas (level streaming)
//
// Núcleo conceitual do exercício: a "janela de visualização" (câmera) é
// puramente uma questão de RENDERIZAÇÃO — segue o jogador em pixels — e é
// TOTALMENTE INDEPENDENTE de quais áreas da malha estão ativas para fins de
// SIMULAÇÃO. A ativação é decidida em coordenadas de GRADE (área atual +
// vizinhas), não em pixels de câmera. Por isso, mesmo que a câmera mostre só
// uma fatia pequena do mundo, o conjunto ativo cobre uma vizinhança maior de
// áreas — garantindo que um NPC logo fora da tela já esteja "acordado" antes
// do jogador alcançá-lo, evitando que ele apareça parado no meio do nada.

class Camera {
  constructor(viewW, viewH, worldW, worldH) {
    this.width = viewW;
    this.height = viewH;
    this.worldW = worldW;
    this.worldH = worldH;
    this.x = 0;
    this.y = 0;
  }

  follow(target) {
    this.x = target.x - this.width / 2;
    this.y = target.y - this.height / 2;
    this.x = Math.max(0, Math.min(this.worldW - this.width, this.x));
    this.y = Math.max(0, Math.min(this.worldH - this.height, this.y));
  }
}

// Retorna a área atual do jogador e o conjunto (Set) de ids de áreas ativas.
// radius=1 ativa a área atual + até 8 vizinhas (Chebyshev / "Moore neighborhood").
function computeActiveAreas(grid, player, radius = 1) {
  const current = grid.areaFromWorld(player.x, player.y);
  const neighbors = grid.neighborsOf(current, radius);
  return { current, activeIds: new Set(neighbors.map(a => a.id)) };
}
