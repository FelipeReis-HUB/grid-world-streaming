// main.js — Loop principal: junta grid, player, npc, items e viewport
//
// Fluxo por frame:
//   1. Atualiza o jogador (input) e a câmera (segue o jogador).
//   2. Calcula o conjunto de áreas ativas (as que a câmera enxerga, mais
//      uma pequena folga; no máximo 4).
//   3. Atualiza SÓ os NPCs e itens cujas áreas estão nesse conjunto — o
//      restante do mundo fica "congelado" (nenhum custo de simulação).
//   4. Desenha tudo (áreas ativas em destaque, inativas "apagadas") mais o
//      overlay de debug mostrando visualmente quais áreas estão ativas.

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const VIEW_W = canvas.width;
  const VIEW_H = canvas.height;

  // --- Construção do mundo: 9 áreas, cada uma com seus próprios itens/NPCs
  const NPCS_PER_AREA = 8;
  const grid = new Grid();
  let allNPCs = [];
  let allItems = [];
  grid.areas.forEach((area) => {
    allItems = allItems.concat(spawnItemsForArea(area));
    allNPCs = allNPCs.concat(spawnNPCsForArea(area, NPCS_PER_AREA));
  });
  const scoreItems = allItems.filter((it) => it.type === ITEM_TYPES.SCORE);
  const totalItems = scoreItems.length;

  const startArea = grid.areaAt(1, 1); // jogador começa na área central
  const player = new Player(startArea.centerX, startArea.centerY);
  const camera = new Camera(VIEW_W, VIEW_H, WORLD_W, WORLD_H);

  // --- Input (WASD + setas)
  const input = { up: false, down: false, left: false, right: false };
  const KEY_MAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
  };

  let debugOverlay = true;
  let score = 0;
  let state = 'playing'; // 'playing' | 'win' | 'gameover'
  camera.follow(player);
  let activeState = computeActiveAreas(grid, player, camera);
  let ammoBlast = null; // { x, y, startTime } — efeito visual da caixa de munição

  const AMMO_RADIUS = 220; // alcance do dano em área da caixa de munição
  const AMMO_DAMAGE = 35;  // 2 usos derrubam um NPC (60 de vida)
  const SURVIVAL_TIME = 60; // segundos que o jogador precisa sobreviver
  let timeLeft = SURVIVAL_TIME;

  const overlayEl = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const scoreEl = document.getElementById('hud-score');
  const timerEl = document.getElementById('hud-timer');
  const healthValueEl = document.getElementById('hud-health-value');
  const healthFillEl = document.getElementById('hud-health-fill');
  const medkitsEl = document.getElementById('hud-medkits');
  const ammoEl = document.getElementById('hud-ammo');

  document.getElementById('restart-btn').addEventListener('click', resetGame);

  window.addEventListener('keydown', (e) => {
    if (KEY_MAP[e.code]) { input[KEY_MAP[e.code]] = true; e.preventDefault(); }
    if (e.code === 'KeyM') debugOverlay = !debugOverlay;
    if (e.code === 'KeyR' && state !== 'playing') resetGame();
    if (state !== 'playing') return;
    if (e.code === 'Digit1' || e.code === 'Numpad1') useMedkit();
    if (e.code === 'Digit2' || e.code === 'Numpad2') useAmmoBox(performance.now());
  });
  window.addEventListener('keyup', (e) => {
    if (KEY_MAP[e.code]) { input[KEY_MAP[e.code]] = false; e.preventDefault(); }
  });

  // Consome 1 kit de primeiros socorros do inventário e recupera saúde.
  function useMedkit() {
    if (player.useMedkit()) updateHUD();
  }

  // Consome 1 caixa de munição do inventário e aplica dano em área,
  // centrado na posição do jogador, a todos os NPCs vivos dentro do raio —
  // independentemente de a área deles estar ativa no momento (é um efeito
  // instantâneo e local, não uma simulação contínua).
  function useAmmoBox(now) {
    if (player.ammo <= 0) return;
    player.ammo -= 1;
    for (const npc of allNPCs) {
      if (npc.dead) continue;
      const dist = Math.hypot(npc.x - player.x, npc.y - player.y);
      if (dist <= AMMO_RADIUS) npc.takeDamage(AMMO_DAMAGE, now);
    }
    ammoBlast = { x: player.x, y: player.y, startTime: now };
    updateHUD();
  }

  function resetGame() {
    allItems.forEach((it) => { it.collected = false; });
    allNPCs.forEach((npc) => npc.reset());
    player.x = startArea.centerX;
    player.y = startArea.centerY;
    player.health = player.maxHealth;
    player.medkits = 0;
    player.ammo = 0;
    player.invulnerableUntil = 0;
    ammoBlast = null;
    score = 0;
    timeLeft = SURVIVAL_TIME;
    state = 'playing';
    overlayEl.hidden = true;
    updateHUD();
  }

  function updateHUD() {
    scoreEl.textContent = `${score}/${totalItems}`;
    updateTimerHUD();
    healthValueEl.textContent = `${player.health}/${player.maxHealth}`;
    healthFillEl.style.width = `${(player.health / player.maxHealth) * 100}%`;
    medkitsEl.textContent = String(player.medkits);
    ammoEl.textContent = String(player.ammo);
  }

  function updateTimerHUD() {
    const secs = Math.ceil(timeLeft);
    timerEl.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    timerEl.classList.toggle('danger', secs <= 10);
  }

  function showOverlay(title, text) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlayEl.hidden = false;
  }

  function update(dt, now) {
    // Objetivo do nível: sobreviver até o cronômetro zerar.
    timeLeft = Math.max(0, timeLeft - dt);
    updateTimerHUD();
    if (timeLeft === 0) {
      state = 'win';
      showOverlay('Você sobreviveu!', `Resistiu ${SURVIVAL_TIME} segundos e coletou ${score} de ${totalItems} núcleos. Pressione R para jogar de novo.`);
      return;
    }

    player.update(dt, input, WORLD_W, WORLD_H, now);
    camera.follow(player);
    activeState = computeActiveAreas(grid, player, camera);
    const { activeIds } = activeState;

    // --- Ponto central do exercício -----------------------------------
    // Só NPCs cuja área de origem está no conjunto ativo recebem update().
    // Os demais permanecem parados na última posição simulada: zero custo
    // de detecção/movimento, exatamente como "chunks" desativados em um
    // mundo aberto com streaming de setores.
    for (const npc of allNPCs) {
      if (npc.dead || !activeIds.has(npc.homeArea.id)) continue;
      npc.update(dt, player);
      if (!player.isInvulnerable(now) && npc.collidesWith(player)) {
        player.hit(now);
        updateHUD();
        if (player.health <= 0) {
          state = 'gameover';
          showOverlay('Fim de jogo', `Você caiu faltando ${Math.ceil(timeLeft)} s. Pressione R para tentar de novo.`);
        }
      }
    }

    for (const item of allItems) {
      if (item.collected || !activeIds.has(item.area.id)) continue;
      item.update(dt);
      if (!item.collidesWith(player)) continue;
      item.collected = true;
      if (item.type === ITEM_TYPES.SCORE) {
        score++;
      } else if (item.type === ITEM_TYPES.MEDKIT) {
        player.medkits++;
      } else if (item.type === ITEM_TYPES.AMMO) {
        player.ammo++;
      }
      updateHUD();
    }
  }

  function render(now) {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const { current, activeIds } = activeState;

    // Áreas: ativas em tom mais claro/contornado, inativas "apagadas"
    for (const area of grid.areas) {
      const sx = area.x - camera.x;
      const sy = area.y - camera.y;
      if (sx + area.width < 0 || sx > VIEW_W || sy + area.height < 0 || sy > VIEW_H) continue;
      const active = activeIds.has(area.id);
      ctx.fillStyle = active
        ? (area.terrain === 'rocky' ? '#182233' : '#151f2e')
        : '#0e131c';
      ctx.fillRect(sx, sy, area.width, area.height);
      ctx.strokeStyle = active ? 'rgba(79,209,197,0.35)' : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, area.width, area.height);
    }

    for (const item of allItems) item.draw(ctx, camera);
    for (const npc of allNPCs) npc.draw(ctx, camera, now);
    player.draw(ctx, camera, now);
    drawAmmoBlast(now);

    if (debugOverlay) drawDebugOverlay(current, activeIds);
  }

  // Anel expansivo que mostra o alcance da caixa de munição ao ser usada.
  function drawAmmoBlast(now) {
    if (!ammoBlast) return;
    const DURATION = 260;
    const elapsed = now - ammoBlast.startTime;
    if (elapsed >= DURATION) { ammoBlast = null; return; }
    const t = elapsed / DURATION;
    const sx = ammoBlast.x - camera.x;
    const sy = ammoBlast.y - camera.y;
    ctx.save();
    ctx.strokeStyle = `rgba(245, 217, 10, ${1 - t})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx, sy, AMMO_RADIUS * t, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawDebugOverlay(current, activeIds) {
    const cell = 22;
    const pad = 8;
    const boxW = GRID_COLS * cell + pad * 2;
    const boxH = GRID_ROWS * cell + pad * 2 + 16;
    const originX = VIEW_W - boxW - 14;
    const originY = 14;

    ctx.save();
    ctx.fillStyle = 'rgba(11,14,20,0.8)';
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.fillRect(originX, originY, boxW, boxH);
    ctx.strokeRect(originX, originY, boxW, boxH);

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#8b93a3';
    ctx.textBaseline = 'top';
    ctx.fillText('ÁREAS ATIVAS', originX + pad, originY + 6);

    for (const area of grid.areas) {
      const gx = originX + pad + area.col * cell;
      const gy = originY + 20 + area.row * cell;
      const active = activeIds.has(area.id);
      ctx.fillStyle = active ? '#4fd1c5' : '#2a3140';
      ctx.fillRect(gx, gy, cell - 3, cell - 3);
      if (area.id === current.id) {
        ctx.strokeStyle = '#f5a623';
        ctx.lineWidth = 2;
        ctx.strokeRect(gx, gy, cell - 3, cell - 3);
      }
    }
    ctx.restore();
  }

  let lastTime = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (state === 'playing') update(dt, now);
    render(now);
    requestAnimationFrame(loop);
  }

  updateHUD();
  requestAnimationFrame(loop);
})();
