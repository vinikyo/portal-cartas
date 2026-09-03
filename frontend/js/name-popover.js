// name-popover.js
// Nomes de carta muito longos são truncados via CSS (ellipsis) pra nunca
// esticar a tabela/layout — ver .truncate-name no style.css. Este módulo dá
// um jeito de ver o nome completo sem sair da página: clicar num nome
// truncado abre um popover leve (não é um <dialog>/modal de verdade de
// propósito, é só um balão de texto) perto do elemento, com o nome inteiro.
//
// Funciona em qualquer elemento com a classe .truncate-name — não precisa
// registrar nada por página, só incluir este script depois de utils.js.

(function () {
  let activePopover = null;
  let activeTrigger = null;

  function closePopover() {
    if (!activePopover) return;
    activePopover.remove();
    activePopover = null;
    activeTrigger = null;
    document.removeEventListener('click', onOutsideClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', closePopover);
    window.removeEventListener('scroll', closePopover, true);
  }

  function onOutsideClick(event) {
    if (activePopover && !activePopover.contains(event.target) && event.target !== activeTrigger) {
      closePopover();
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') closePopover();
  }

  function positionPopover(popover, trigger) {
    const rect = trigger.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;

    let left = rect.left + window.scrollX;
    const maxLeft = window.scrollX + viewportWidth - popRect.width - 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);

    let top = rect.bottom + window.scrollY + 6;
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function showPopover(trigger) {
    closePopover();

    const popover = document.createElement('div');
    popover.className = 'name-popover';
    popover.setAttribute('role', 'tooltip');
    popover.textContent = trigger.textContent;
    document.body.appendChild(popover);

    positionPopover(popover, trigger);

    activePopover = popover;
    activeTrigger = trigger;

    // registra os listeners de fechar só depois deste clique terminar de
    // borbulhar, senão o próprio clique que abriu já fecharia de novo
    setTimeout(() => {
      document.addEventListener('click', onOutsideClick, true);
      document.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('resize', closePopover);
      window.addEventListener('scroll', closePopover, true);
    }, 0);
  }

  document.addEventListener('click', (event) => {
    const el = event.target.closest('.truncate-name');
    if (!el) return;

    // só intercepta o clique se o nome estiver de fato cortado — nomes
    // curtos continuam funcionando normalmente (ex: navegar pelo link)
    const isTruncated = el.scrollWidth > el.clientWidth + 1;
    if (!isTruncated) return;

    event.preventDefault();
    event.stopPropagation();
    showPopover(el);
  });
})();
