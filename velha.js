// Jogo da Velha: você (X) contra o bot (O).

const COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function linhaVencedora(t) {
  for (const combo of COMBOS) {
    const [a, b, c] = combo;
    if (t[a] && t[a] === t[b] && t[a] === t[c]) return combo;
  }
  return null;
}

export function resultadoJogo(t) {
  const linha = linhaVencedora(t);
  if (linha) return t[linha[0]];
  return t.every(Boolean) ? 'empate' : null;
}

const livres = (t) => t.flatMap((v, i) => (v ? [] : [i]));
const memoria = new Map();

function minimax(t, vez, bot, humano) {
  const r = resultadoJogo(t);
  const ocupadas = t.filter(Boolean).length;
  if (r === bot) return 100 - ocupadas;
  if (r === humano) return ocupadas - 100;
  if (r === 'empate') return 0;

  const chave = t.map((v) => v || '-').join('') + vez + bot;
  if (memoria.has(chave)) return memoria.get(chave);

  let melhor = vez === bot ? -Infinity : Infinity;
  for (const i of livres(t)) {
    t[i] = vez;
    const v = minimax(t, vez === bot ? humano : bot, bot, humano);
    t[i] = null;
    melhor = vez === bot ? Math.max(melhor, v) : Math.min(melhor, v);
  }
  memoria.set(chave, melhor);
  return melhor;
}

export function melhorJogada(t, bot = 'O', humano = 'X') {
  let melhor = -Infinity;
  let escolha = null;
  for (const i of livres(t)) {
    t[i] = bot;
    const v = minimax(t, humano, bot, humano);
    t[i] = null;
    if (v > melhor) {
      melhor = v;
      escolha = i;
    }
  }
  return escolha;
}

export function jogadaBot(t, chanceErro = 0.3, rand = Math.random) {
  const casas = livres(t);
  // Se a chance de erro for 0 (difícil), ele SEMPRE joga a melhor jogada perfeita
  if (chanceErro > 0 && rand() < chanceErro) {
    return casas[Math.floor(rand() * casas.length)];
  }
  return melhorJogada(t);
}

// ---------- Interface ----------
export function iniciar(palco, dificuldade = 'medio', aoTerminar, aoReiniciar) {
  const t = Array(9).fill(null);
  let encerrada = false;
  let esperandoBot = false;
  const timers = new Set();

  let chanceErro = 0.3; // Médio
  if (dificuldade === 'facil') chanceErro = 0.6;
  if (dificuldade === 'dificil') chanceErro = 0.0; // 0% de erro = Bot Imbatível (Perfeito)

  const agendar = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  palco.replaceChildren();

  const status = document.createElement('p');
  status.className = 'status-jogo';
  
  const grade = document.createElement('div');
  grade.className = 'velha';

  const celulas = t.map((_, i) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'celula';
    botao.setAttribute('aria-label', 'Casa ' + (i + 1));
    botao.addEventListener('click', () => jogadaHumano(i));
    grade.appendChild(botao);
    return botao;
  });

  const painelFim = document.createElement('div');
  painelFim.className = 'painel-fim-jogo';
  painelFim.hidden = true;

  const btnReiniciar = document.createElement('button');
  btnReiniciar.type = 'button';
  btnReiniciar.className = 'btn-principal btn-largura-total';
  btnReiniciar.textContent = 'Jogar Novamente';
  btnReiniciar.addEventListener('click', () => {
    if (aoReiniciar) aoReiniciar();
  });

  painelFim.appendChild(btnReiniciar);
  palco.append(status, grade, painelFim);
  status.textContent = 'SUA VEZ // VOCÊ É X';

  function marcar(i, marca) {
    t[i] = marca;
    celulas[i].textContent = marca;
    celulas[i].classList.add(marca === 'X' ? 'x' : 'o');
    celulas[i].disabled = true;
  }

  function verificarFim() {
    const r = resultadoJogo(t);
    if (!r) return false;

    encerrada = true;
    const linha = linhaVencedora(t);
    if (linha) linha.forEach((i) => celulas[i].classList.add('vit'));
    celulas.forEach((c) => (c.disabled = true));

    const resultado = r === 'X' ? 'vitoria' : r === 'O' ? 'derrota' : 'empate';
    status.textContent =
      resultado === 'vitoria' ? 'VOCÊ VENCEU!' : resultado === 'derrota' ? 'O BOT VENCEU!' : 'DEU VELHA!';
    
    painelFim.hidden = false;
    aoTerminar(resultado);
    return true;
  }

  function jogadaHumano(i) {
    if (encerrada || esperandoBot || t[i]) return;
    marcar(i, 'X');
    if (verificarFim()) return;

    esperandoBot = true;
    status.textContent = 'BOT CALCULANDO...';
    agendar(() => {
      marcar(jogadaBot(t, chanceErro), 'O');
      esperandoBot = false;
      if (!verificarFim()) status.textContent = 'SUA VEZ // VOCÊ É X';
    }, 300);
  }

  return {
    destruir() {
      encerrada = true;
      timers.forEach(clearTimeout);
      timers.clear();
    },
  };
}
