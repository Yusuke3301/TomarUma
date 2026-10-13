// Manipulação da PokeAPI e FreeToGame API

export async function carregarPokemonAleatorio(elementos) {
  const { imgEl, statusEl, inputEl, btnEnviar, btnProximo } = elementos;
  statusEl.textContent = 'Carregando Pokémon...';
  imgEl.style.filter = 'brightness(0)'; // Silhueta preta
  inputEl.value = '';
  inputEl.disabled = false;
  btnEnviar.disabled = false;
  btnProximo.hidden = true;

  // Sorteia um ID aleatório entre 1 e 151 (1ª Geração)
  const idAleatorio = Math.floor(Math.random() * 151) + 1;

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${idAleatorio}`);
    const data = await res.json();
    
    const nomeReal = data.name.toLowerCase();
    imgEl.src = data.sprites.front_default;
    statusEl.textContent = 'Quem é esse Pokémon?';

    // Retorna os dados necessários para validar o palpite
    return nomeReal;
  } catch (err) {
    statusEl.textContent = 'Erro ao carregar Pokémon. Tente novamente.';
    return null;
  }
}

export async function carregarJogosGratis(containerEl) {
  containerEl.replaceChildren();
  const pCarregando = document.createElement('p');
  pCarregando.className = 'vazio';
  pCarregando.textContent = 'Buscando jogos gratuitos...';
  containerEl.appendChild(pCarregando);

  try {
    const res = await fetch('https://www.freetogame.com/api/games?platform=browser');
    const jogos = await res.json();
    
    containerEl.replaceChildren();

    if (!jogos || jogos.length === 0) {
      containerEl.innerHTML = '<p class="vazio">Nenhum jogo encontrado.</p>';
      return;
    }

    // Exibe os primeiros 15 jogos da lista
    jogos.slice(0, 15).forEach((jogo) => {
      const card = document.createElement('div');
      card.style.cssText = 'display: flex; gap: 12px; align-items: center; background: #070a14; padding: 10px; border-radius: 12px; border: 1px solid var(--borda);';

      const thumb = document.createElement('img');
      thumb.src = jogo.thumbnail;
      thumb.alt = jogo.title;
      thumb.style.cssText = 'width: 80px; height: 50px; object-fit: cover; border-radius: 8px;';

      const info = document.createElement('div');
      info.style.flex = '1';
      info.innerHTML = `
        <strong style="font-size: 0.95rem; display: block; color: var(--texto);">${jogo.title}</strong>
        <small style="color: var(--suave); display: block; margin-top: 2px;">${jogo.genre} • ${jogo.publisher}</small>
      `;

      const btnJogar = document.createElement('a');
      btnJogar.href = jogo.game_url;
      btnJogar.target = '_blank';
      btnJogar.className = 'btn-principal';
      btnJogar.textContent = 'Jogar';
      btnJogar.style.cssText = 'padding: 6px 12px; font-size: 0.85rem; text-decoration: none;';

      card.append(thumb, info, btnJogar);
      containerEl.appendChild(card);
    });
  } catch (err) {
    containerEl.innerHTML = '<p class="vazio">Erro ao carregar catálogo de jogos. Verifique sua conexão.</p>';
  }
}
