// npc.js — IA simples de perseguição em linha reta (sem pathfinding)
//
// Máquina de estados com 2 estados:
//   PATROL — anda entre dois waypoints fixos dentro da área de origem.
//   CHASE  — persegue o jogador usando apenas o vetor normalizado
//            (player.pos - npc.pos), recalculado a cada frame. Não há
//            A*/pathfinding: se houver obstáculo, o NPC não desvia — é uma
//            IA propositalmente simples, como pedido no enunciado.
//
// Importante: update() só é chamado pelo loop principal quando a área de
// origem do NPC está no conjunto de áreas ativas (ver main.js). Um NPC
// "congelado" não roda nenhuma lógica — nem detecção, nem movimento — o que
// é a otimização central deste exercício (equivalente a um "enemy pooling"
// por streaming de setores).
//
// Cada NPC também tem pontos de vida: uma caixa de munição usada pelo
// jogador aplica dano em área (ver main.js/useAmmoBox), e o NPC morre
// (deixa de ser atualizado e desenhado) quando a vida chega a zero.

const NPC_STATE = { PATROL: 'patrol', CHASE: 'chase' };

class NPC {
  constructor(x, y, homeArea) {
    this.x = x;
    this.y = y;
    this.initX = x;
    this.initY = y;
    this.radius = 14;
    this.homeArea = homeArea;
    this.state = NPC_STATE.PATROL;

    this.patrolSpeed = 60;   // px/s
    this.chaseSpeed = 110;   // px/s (mais rápido que a patrulha, mais lento que o jogador)
    this.detectionRadius = 160;
    this.leashRadius = 260;  // além desse raio, desiste e volta a patrulhar

    this.maxHealth = 60;
    this.health = this.maxHealth;
    this.dead = false;
    this.hitFlashUntil = 0;

    const margin = 80;
    this.waypointA = { x: homeArea.x + margin, y: homeArea.y + homeArea.height / 2 };
    this.waypointB = { x: homeArea.x + homeArea.width - margin, y: homeArea.y + homeArea.height / 2 };
    this.target = this.waypointB;
  }

  update(dt, player) {
    const dxPlayer = player.x - this.x;
    const dyPlayer = player.y - this.y;
    const distToPlayer = Math.hypot(dxPlayer, dyPlayer);

    if (this.state === NPC_STATE.PATROL) {
      if (distToPlayer < this.detectionRadius) {
        this.state = NPC_STATE.CHASE;
      } else {
        this._patrol(dt);
      }
    } else if (this.state === NPC_STATE.CHASE) {
      if (distToPlayer > this.leashRadius) {
        this.state = NPC_STATE.PATROL;
      } else {
        const nx = dxPlayer / (distToPlayer || 1);
        const ny = dyPlayer / (distToPlayer || 1);
        this.x += nx * this.chaseSpeed * dt;
        this.y += ny * this.chaseSpeed * dt;
      }
    }
  }

  _patrol(dt) {
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      this.target = this.target === this.waypointA ? this.waypointB : this.waypointA;
      return;
    }
    this.x += (dx / dist) * this.patrolSpeed * dt;
    this.y += (dy / dist) * this.patrolSpeed * dt;
  }

  collidesWith(entity) {
    if (this.dead) return false;
    const dx = this.x - entity.x;
    const dy = this.y - entity.y;
    return Math.hypot(dx, dy) < this.radius + entity.radius;
  }

  // Aplicada pela caixa de munição (dano em área centrado no jogador).
  takeDamage(amount, now) {
    if (this.dead) return;
    this.health = Math.max(0, this.health - amount);
    this.hitFlashUntil = now + 150;
    if (this.health === 0) this.dead = true;
  }

  reset() {
    this.x = this.initX;
    this.y = this.initY;
    this.state = NPC_STATE.PATROL;
    this.target = this.waypointB;
    this.health = this.maxHealth;
    this.dead = false;
    this.hitFlashUntil = 0;
  }

  draw(ctx, camera, now) {
    if (this.dead) return;
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    const flashing = now < this.hitFlashUntil;
    ctx.save();
    ctx.fillStyle = flashing ? '#ffffff' : (this.state === NPC_STATE.CHASE ? '#ef4565' : '#c23a52');
    ctx.shadowColor = this.state === NPC_STATE.CHASE ? '#ef4565' : 'transparent';
    ctx.shadowBlur = this.state === NPC_STATE.CHASE ? 14 : 0;
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0e14';
    ctx.beginPath();
    ctx.arc(sx, sy - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Barra de vida só aparece quando o NPC já sofreu dano
    if (this.health < this.maxHealth) {
      const barW = 28, barH = 4;
      const bx = sx - barW / 2, by = sy - this.radius - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = '#ef4565';
      ctx.fillRect(bx, by, barW * (this.health / this.maxHealth), barH);
    }
    ctx.restore();
  }
}

function spawnNPCsForArea(area, count) {
  const npcs = [];
  for (let i = 0; i < count; i++) {
    const y = area.y + area.height * (0.3 + 0.4 * i);
    const npc = new NPC(area.x + area.width / 2, y, area);
    npcs.push(npc);
    area.npcs.push(npc);
  }
  return npcs;
}
