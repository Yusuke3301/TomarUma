// Jogo da Velha: você (X) contra o bot (O).
// O bot usa a jogada perfeita (minimax), mas erra de propósito em parte das jogadas.
// Assim ele é desafiador e ainda dá pra vencer. Para deixar mais fácil/difícil,
// mude CHANCE_ERRO (0 = bot perfeito e invencível, 1 = bot totalmente aleatório).

export const CHANCE_ERRO = 0.3;

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

// Retorna 'X', 'O', 'empate' ou null (jogo em andamento)
export function resultadoJogo(t) {
  const linha = linhaVencedora(t);
  if (linha) return t[linha[0]];
  return t.every(Boolean) ? 'empate' : null;
}

const livres = (t) => t.flatMap((v, i) => (v ? [] : [i]));

// Guarda o valor de cada posição já calculada (deixa o bot instantâneo)
const memoria = new Map();

// Valor de uma posição para o bot: vitória rápida vale mais, derrota rápida vale menos.
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

export function jogadaBot(t, chanceErro = CHANCE_ERRO, rand = Math.random) {
  const casas = livres(t);
  if (rand() < chanceErro) return casas[Math.floor(rand() * casas.length)];
  return melhorJogada(t);
}

// ---------- Interface ----------
// palco: elemento onde o jogo é desenhado.
// aoTerminar(resultado): 'vitoria' | 'empate' | 'derrota'
export function iniciar(palco, aoTerminar) {
  const t = Array(9).fill(null);
  let encerrada = false;
  let esperandoBot = false;
  const timers = new Set();

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

  palco.append(status, grade);
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
      resultado === 'vitoria' ? 'VOCÊ VENCEU' : resultado === 'derrota' ? 'O BOT VENCEU' : 'DEU VELHA';
    agendar(() => aoTerminar(resultado, ''), 900);
    return true;
  }

  function jogadaHumano(i) {
    if (encerrada || esperandoBot || t[i]) return;
    marcar(i, 'X');
    if (verificarFim()) return;

    esperandoBot = true;
    status.textContent = 'BOT CALCULANDO...';
    agendar(() => {
      marcar(jogadaBot(t), 'O');
      esperandoBot = false;
      if (!verificarFim()) status.textContent = 'SUA VEZ // VOCÊ É X';
    }, 500);
  }

  return {
    destruir() {
      encerrada = true;
      timers.forEach(clearTimeout);
      timers.clear();
    },
  };
}
