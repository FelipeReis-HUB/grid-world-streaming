// items.js — Coletáveis espalhados pelas 9 áreas
//
// Cada item pertence a uma área (dono lógico) mas vive em coordenadas de
// mundo. Isso permite decidir, por área, se um item deve ser simulado
// (animação de flutuação, checagem de colisão) só quando sua área está ativa.
//
// Três tipos de item, todos representados pela mesma classe (só muda o
// visual e o que acontece ao coletar — a lógica de "o que fazer com o
// item" fica em main.js, não aqui):
//   score  — losango dourado, conta para a condição de vitória.
//   medkit — caixa de primeiros socorros (➕): vai para o inventário do
//            jogador e cura ao ser USADA (tecla 1), não automaticamente.
//   ammo   — caixa de munição (⚡): vai para o inventário e, ao ser usada
//            (tecla 2), causa dano em área nos inimigos ao redor.

const ITEM_TYPES = { SCORE: 'score', MEDKIT: 'medkit', AMMO: 'ammo' };

class Item {
  constructor(x, y, area, type = ITEM_TYPES.SCORE) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.radius = type === ITEM_TYPES.SCORE ? 10 : 12;
    this.collected = false;
    this.area = area;
    this.bob = Math.random() * Math.PI * 2; // fase da animação de flutuação
  }

  update(dt) {
    this.bob += dt * 3;
  }

  draw(ctx, camera) {
    if (this.collected) return;
    const sx = this.x - camera.x;
    const sy = this.y - camera.y + Math.sin(this.bob) * 3;
    ctx.save();

    if (this.type === ITEM_TYPES.SCORE) {
      ctx.fillStyle = '#f5a623';
      ctx.shadowColor = '#f5a623';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(sx, sy - this.radius);
      ctx.lineTo(sx + this.radius, sy);
      ctx.lineTo(sx, sy + this.radius);
      ctx.lineTo(sx - this.radius, sy);
      ctx.closePath();
      ctx.fill();
    } else {
      const isMedkit = this.type === ITEM_TYPES.MEDKIT;
      const boxColor = isMedkit ? '#2fbf71' : '#f5d90a';
      ctx.fillStyle = boxColor;
      ctx.shadowColor = boxColor;
      ctx.shadowBlur = 10;
      ctx.fillRect(sx - this.radius, sy - this.radius, this.radius * 2, this.radius * 2);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b0e14';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isMedkit ? '➕' : '⚡', sx, sy + 1);
    }
    ctx.restore();
  }

  collidesWith(entity) {
    if (this.collected) return false;
    const dx = this.x - entity.x;
    const dy = this.y - entity.y;
    return Math.hypot(dx, dy) < this.radius + entity.radius;
  }
}

// Gera os itens de uma área usando um gerador pseudo-aleatório determinístico
// (seed derivado do id da área): 2 itens de pontuação, 1 kit médico e 1 caixa
// de munição. O layout fica reprodutível entre recarregamentos, o que ajuda a
// demonstrar o comportamento do viewport de forma consistente.
function spawnItemsForArea(area) {
  const items = [];
  const margin = 60;
  let seed = area.id * 97 + 13;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const layout = [ITEM_TYPES.SCORE, ITEM_TYPES.SCORE, ITEM_TYPES.MEDKIT, ITEM_TYPES.AMMO];
  for (const type of layout) {
    const x = area.x + margin + rand() * (area.width - margin * 2);
    const y = area.y + margin + rand() * (area.height - margin * 2);
    const item = new Item(x, y, area, type);
    items.push(item);
    area.items.push(item);
  }
  return items;
}
