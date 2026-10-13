import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);

let modo = 'entrar'; // 'entrar' ou 'criar'

// ---------- Mensagens ----------

function mensagem(texto, tipo = 'erro') {
  const el = $('msg');
  el.textContent = texto;
  el.className = tipo;
}

function traduzirErro(erro) {
  const m = (erro && erro.message ? erro.message : '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (m.includes('already registered')) return 'Este e-mail já tem conta. Use "Entrar".';
  if (m.includes('database error saving new user')) {
    return 'Não foi possível criar a conta. O apelido pode já estar em uso.';
  }
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Sem conexão com o servidor. Confira a internet e o config.js.';
  }
  return 'Algo deu errado: ' + (erro && erro.message ? erro.message : 'erro desconhecido');
}

// ---------- Abas Entrar / Criar conta ----------

function definirModo(novo) {
  modo = novo;
  const criar = modo === 'criar';
  $('aba-entrar').classList.toggle('ativa', !criar);
  $('aba-criar').classList.toggle('ativa', criar);
  $('campo-apelido').hidden = !criar;
  $('btn-enviar').textContent = criar ? 'Criar conta' : 'Entrar';
  $('senha').autocomplete = criar ? 'new-password' : 'current-password';
  mensagem('');
}

$('aba-entrar').addEventListener('click', () => definirModo('entrar'));
$('aba-criar').addEventListener('click', () => definirModo('criar'));

// ---------- Envio do formulário ----------

$('form-auth').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('email').value.trim();
  const senha = $('senha').value;
  const apelido = $('apelido').value.trim();

  if (!email || senha.length < 6) {
    return mensagem('Informe um e-mail e uma senha de pelo menos 6 caracteres.');
  }
  if (modo === 'criar' && (apelido.length < 3 || apelido.length > 20)) {
    return mensagem('O apelido deve ter de 3 a 20 caracteres.');
  }

  $('btn-enviar').disabled = true;
  mensagem('');
  try {
    if (modo === 'criar') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { username: apelido } },
      });
      if (error) throw error;
      if (!data.session) {
        mensagem('Conta criada! Confirme pelo e-mail enviado e depois entre.', 'ok');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
    }
  } catch (erro) {
    mensagem(traduzirErro(erro));
  } finally {
    $('btn-enviar').disabled = false;
  }
});

$('btn-sair').addEventListener('click', () => supabase.auth.signOut());

// ---------- Telas ----------

function mostrarAuth() {
  $('tela-app').hidden = true;
  $('tela-auth').hidden = false;
  $('senha').value = '';
}

async function mostrarApp(user) {
  $('tela-auth').hidden = true;
  $('tela-app').hidden = false;

  const [resPerfil, resRanking] = await Promise.all([
    supabase.from('profiles').select('username, points').eq('id', user.id).single(),
    supabase
      .from('ranking')
      .select('posicao, username, points, nivel')
      .order('posicao')
      .order('username')
      .limit(20),
  ]);

  if (resPerfil.error || resRanking.error) {
    $('nome').textContent = 'Erro ao carregar';
    return;
  }

  const perfil = resPerfil.data;
  const lista = resRanking.data;
  const minhaLinha = lista.find((l) => l.username === perfil.username);
  const nivel = minhaLinha ? minhaLinha.nivel : 'bronze';

  $('nome').textContent = perfil.username;
  $('pontos').textContent = String(perfil.points);
  $('selo').textContent = nivel;
  $('selo').className = 'selo ' + nivel;

  desenharRanking(lista, perfil.username);
}

function desenharRanking(lista, meuNome) {
  const ol = $('ranking');
  ol.replaceChildren();

  if (lista.length === 0) {
    const p = document.createElement('p');
    p.className = 'vazio';
    p.textContent = 'Ainda não há jogadores.';
    ol.appendChild(p);
    return;
  }

  for (const item of lista) {
    const li = document.createElement('li');
    if (item.username === meuNome) li.className = 'eu';

    const pos = document.createElement('span');
    pos.className = 'pos';
    pos.textContent = item.posicao + 'º';

    // textContent (e não innerHTML) evita que um apelido com HTML vire código na página
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = item.username;

    const pts = document.createElement('span');
    pts.className = 'pts';
    pts.textContent = item.points + ' pts';

    const selo = document.createElement('span');
    selo.className = 'selo ' + item.nivel;
    selo.textContent = item.nivel;

    li.append(pos, nome, pts, selo);
    ol.appendChild(li);
  }
}

// ---------- Sessão ----------
// Dispara ao abrir a página (com ou sem sessão salva), no login e no logout.
// O setTimeout evita fazer chamadas ao Supabase de dentro do próprio callback.

supabase.auth.onAuthStateChange((_evento, sessao) => {
  setTimeout(() => {
    if (sessao && sessao.user) mostrarApp(sessao.user);
    else mostrarAuth();
  }, 0);
});
