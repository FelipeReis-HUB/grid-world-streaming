// grid.js — Define a malha (grade) de áreas do mundo do jogo
//
// Decisão de projeto: em vez de o jogador "teletransportar" entre 9 cenas
// separadas, o mundo é um único espaço de coordenadas contínuo (2400x1800px)
// dividido LOGICAMENTE em 9 áreas de 800x600. Isso permite caminhar
// livremente entre áreas sem cortes de tela, enquanto o sistema de streaming
// (ver viewport.js) ainda trata cada área como uma unidade independente de
// ativação/desativação — como os "chunks" de um mundo aberto.

const GRID_COLS = 3;
const GRID_ROWS = 3;
const AREA_W = 800;
const AREA_H = 600;
const WORLD_W = GRID_COLS * AREA_W;
const WORLD_H = GRID_ROWS * AREA_H;

class Area {
  constructor(row, col) {
    this.row = row;
    this.col = col;
    this.id = row * GRID_COLS + col;
    this.x = col * AREA_W;
    this.y = row * AREA_H;
    this.width = AREA_W;
    this.height = AREA_H;
    this.items = [];
    this.npcs = [];
    // Terreno é só cosmético (alterna o tom de fundo) para deixar a malha visível
    this.terrain = (row + col) % 2 === 0 ? 'plain' : 'rocky';
  }

  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }
}

class Grid {
  constructor() {
    this.areas = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        this.areas.push(new Area(row, col));
      }
    }
  }

  areaAt(row, col) {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
    return this.areas[row * GRID_COLS + col];
  }

  areaFromWorld(x, y) {
    const col = Math.min(GRID_COLS - 1, Math.max(0, Math.floor(x / AREA_W)));
    const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(y / AREA_H)));
    return this.areaAt(row, col);
  }
}
