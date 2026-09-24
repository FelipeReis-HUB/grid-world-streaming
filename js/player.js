// player.js — Personagem controlado pelo jogador
//
// O jogador se move livremente em coordenadas de MUNDO, não preso a uma
// área específica. A malha (grid.js) é usada apenas para decidir quais
// áreas estão ativas — não existem paredes internas entre elas, só o
// limite externo do mundo inteiro.
//
// Sistema de saúde/inventário: em vez de "vidas" inteiras, o jogador tem
// pontos de saúde (0-100). Kits médicos e caixas de munição são coletados
// para o inventário (medkits/ammo) e só fazem efeito quando USADOS pelo
// jogador (teclas 1 e 2, ver main.js) — a coleta em si não cura nem ataca.

class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.speed = 220; // px/s

    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.medkits = 0;
    this.ammo = 0;

    this.invulnerableUntil = 0;
  }

  update(dt, input, worldW, worldH, now) {
    let dx = 0, dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this.x += (dx / len) * this.speed * dt;
      this.y += (dy / len) * this.speed * dt;
    }

    // Colisão simples: clamp nas bordas externas do mundo (2400x1800)
    this.x = Math.max(this.radius, Math.min(worldW - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(worldH - this.radius, this.y));
  }

  isInvulnerable(now) {
    return now < this.invulnerableUntil;
  }

  hit(now, damage = 20) {
    this.health = Math.max(0, this.health - damage);
    this.invulnerableUntil = now + 1500; // 1.5s de invencibilidade após ser pego
  }

  // Usa 1 kit de primeiros socorros do inventário, se houver, recuperando saúde.
  useMedkit(healAmount = 40) {
    if (this.medkits <= 0) return false;
    this.medkits -= 1;
    this.health = Math.min(this.maxHealth, this.health + healAmount);
    return true;
  }

  draw(ctx, camera, now) {
    const blinking = this.isInvulnerable(now) && Math.floor(now / 100) % 2 === 0;
    if (blinking) return;
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    ctx.save();
    // Halo como círculo translúcido em vez de ctx.shadowBlur (ver npc.js)
    ctx.fillStyle = 'rgba(79, 209, 197, 0.35)';
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4fd1c5';
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
