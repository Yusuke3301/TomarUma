// Cobrinha: coma maçãs sem bater na parede nem no próprio corpo.
export const COLUNAS = 16;
export const LINHAS = 16;
export const META = 10;
export const MINIMO_EMPATE = 5;

export function sortearComida(cobra, rand = Math.random) {
  const ocupadas = new Set(cobra.map((c) => c.x + ',' + c.y));
  const livres = [];
  for (let y = 0; y < LINHAS; y++) {
    for (let x = 0; x < COLUNAS; x++) {
      if (!ocupadas.has(x + ',' + y)) livres.push({ x, y });
    }
  }
  return livres.length ? livres[Math.floor(rand() * livres.length)] : null;
}

export function novoEstado(rand = Math.random) {
  const cobra = [{ x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }];
  return { cobra, dir: { x: 1, y: 0 }, comida: sortearComida(cobra, rand), macas: 0, fim: null };
}

export function passo(estado, dirDesejada, rand = Math.random) {
  if (estado.fim) return estado;

  let dir = estado.dir;
  if (dirDesejada && !(dirDesejada.x === -dir.x && dirDesejada.y === -dir.y)) dir = dirDesejada;

  const cabeca = estado.cobra[0];
  const nova = { x: cabeca.x + dir.x, y: cabeca.y + dir.y };

  if (nova.x < 0 || nova.x >= COLUNAS || nova.y < 0 || nova.y >= LINHAS) {
    return { ...estado, dir, fim: 'parede' };
  }

  const comeu = !!estado.comida && nova.x === estado.comida.x && nova.y === estado.comida.y;
  const corpo = comeu ? estado.cobra : estado.cobra.slice(0, -1);
  if (corpo.some((c) => c.x === nova.x && c.y === nova.y)) {
    return { ...estado, dir, fim: 'corpo' };
  }

  const cobra = [nova, ...corpo];
  if (!comeu) return { ...estado, cobra, dir };

  const macas = estado.macas + 1;
  const atingiuMeta = macas >= META;
  return {
    cobra,
    dir,
    macas,
    comida: atingiuMeta ? null : sortearComida(cobra, rand),
    fim: atingiuMeta ? 'meta' : null,
  };
}

export function classificar(macas) {
  if (macas >= META) return 'vitoria';
  if (macas >= MINIMO_EMPATE) return 'empate';
  return 'derrota';
}

export const intervalo = (macas) => Math.max(70, 140 - macas * 7);

// ---------- Interface ----------
export function iniciar(palco, aoTerminar, aoReiniciar, aoVoltarMenu) {
  palco.replaceChildren();

  let estado = novoEstado();
  const fila = [];
  let timer = null;
  let rodando = false;
  let encerrado = false;

  const info = document.createElement('p');
  info.className = 'status-jogo';

  const canvas = document.createElement('canvas');
  canvas.className = 'cobrinha-canvas';
  canvas.width = 480;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  const C = canvas.width / COLUNAS;

  const botaoIniciar = document.createElement('button');
  botaoIniciar.type = 'button';
  botaoIniciar.className = 'btn-principal btn-largura-total';
  botaoIniciar.textContent = 'Iniciar Partida';
  botaoIniciar.style.marginBottom = '12px';

  const dpad = document.createElement('div');
  dpad.className = 'dpad';
  const setas = [
    ['cima', '▲', 0, -1],
    ['esq', '◀', -1, 0],
    ['baixo', '▼', 0, 1],
    ['dir', '▶', 1, 0],
  ];
  for (const [classe, simbolo, dx, dy] of setas) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn ' + classe;
    b.textContent = simbolo;
    b.setAttribute('aria-label', 'Mover ' + classe);
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      pedir(dx, dy);
    });
    dpad.appendChild(b);
  }

  // Painel de fim de jogo
  const painelFim = document.createElement('div');
  painelFim.className = 'painel-fim-jogo';
  painelFim.hidden = true;

  const btnReiniciar = document.createElement('button');
  btnReiniciar.type = 'button';
  btnReiniciar.className = 'btn-principal';
  btnReiniciar.textContent = 'Jogar Novamente';
  btnReiniciar.addEventListener('click', () => {
    if (aoReiniciar) aoReiniciar();
  });

  const btnMenu = document.createElement('button');
  btnMenu.type = 'button';
  btnMenu.className = 'btn-secundario';
  btnMenu.textContent = 'Menu Principal';
  btnMenu.addEventListener('click', () => {
    if (aoVoltarMenu) aoVoltarMenu();
  });

  painelFim.append(btnReiniciar, btnMenu);
  palco.append(info, canvas, botaoIniciar, dpad, painelFim);

  function atualizarInfo() {
    info.textContent = 'MAÇÃS ' + estado.macas + ' / ' + META;
  }

  function desenhar() {
    const W = canvas.width;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#060814';
    ctx.fillRect(0, 0, W, W);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let i = 1; i < COLUNAS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * C, 0);
      ctx.lineTo(i * C, W);
      ctx.moveTo(0, i * C);
      ctx.lineTo(W, i * C);
      ctx.stroke();
    }

    if (estado.comida) {
      ctx.shadowColor = '#ff2bd6';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ff2bd6';
      ctx.beginPath();
      ctx.arc((estado.comida.x + 0.5) * C, (estado.comida.y + 0.5) * C, C * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    estado.cobra.forEach((seg, i) => {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = i === 0 ? 20 : 8;
      ctx.fillStyle = i === 0 ? '#e8ffff' : '#00f0ff';
      ctx.fillRect(seg.x * C + 2, seg.y * C + 2, C - 4, C - 4);
    });
    ctx.shadowBlur = 0;
  }

  function pedir(dx, dy) {
    if (!rodando || fila.length >= 2) return;
    fila.push({ x: dx, y: dy });
  }

  function tick() {
    estado = passo(estado, fila.shift());
    desenhar();
    atualizarInfo();
    if (estado.fim) {
      rodando = false;
      encerrado = true;
      info.textContent =
        estado.fim === 'meta' ? 'META ATINGIDA!' : estado.fim === 'parede' ? 'BATEU NA PAREDE!' : 'BATEU NO PRÓPRIO CORPO!';
      
      dpad.hidden = true;
      painelFim.hidden = false;

      aoTerminar(classificar(estado.macas));
      return;
    }
    timer = setTimeout(tick, intervalo(estado.macas));
  }

  function comecar() {
    if (rodando || encerrado) return;
    rodando = true;
    botaoIniciar.hidden = true;
    timer = setTimeout(tick, intervalo(0));
  }

  botaoIniciar.addEventListener('click', comecar);

  const teclas = {
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
  };
  function aoTeclar(e) {
    const mov = teclas[e.key];
    if (!mov) return;
    if (rodando) e.preventDefault();
    pedir(mov[0], mov[1]);
  }
  document.addEventListener('keydown', aoTeclar);

  let inicio = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    inicio = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', (e) => {
    if (!inicio) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    inicio = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) pedir(dx > 0 ? 1 : -1, 0);
    else pedir(0, dy > 0 ? 1 : -1);
  }, { passive: true });

  desenhar();
  atualizarInfo();

  return {
    destruir() {
      rodando = false;
      encerrado = true;
      clearTimeout(timer);
      document.removeEventListener('keydown', aoTeclar);
    },
  };
}
