/* Aplica o tema Luz/Sombra escolhido no menu do site antes de a tela de entrada aparecer. */
try {
  if (localStorage.getItem('cicluz-tema') === 'sombra') document.documentElement.classList.add('tema-sombra');
} catch (e) { /* sem acesso ao armazenamento: fica no tema claro */ }
