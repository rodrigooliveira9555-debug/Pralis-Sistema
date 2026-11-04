/* Aplica o tema Luz/Sombra escolhido no menu do site antes de a tela de entrada aparecer. */
try {
  if (localStorage.getItem('cicluz-tema') === 'sombra') {
    document.documentElement.classList.add('tema-sombra');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#151419');
  }
} catch (e) { /* sem acesso ao armazenamento: fica no tema claro */ }
