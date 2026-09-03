// name-popover.js
// Mostra nomes truncados no hover/foco sem interceptar a navegação do link.

(function () {
  let activePopover = null;
  let activeTrigger = null;

  function closePopover() {
    if (!activePopover) return;
    activePopover.remove();
    if (activeTrigger) {
      activeTrigger.closest('.cards-table__link')?.removeAttribute('aria-describedby');
    }
    activePopover = null;
    activeTrigger = null;
    document.removeEventListener('click', onOutsideClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('resize', closePopover);
    window.removeEventListener('scroll', closePopover, true);
  }

  function onOutsideClick(event) {
    if (activePopover && !activePopover.contains(event.target) && !activeTrigger?.contains(event.target)) {
      closePopover();
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') closePopover();
  }

  function positionPopover(popover, trigger) {
    const rect = trigger.getBoundingClientRect();
    const popRect = popover.getBoundingClientRect();
    const gap = 6;
    const horizontalPadding = 8;

    let left = Math.min(
      Math.max(horizontalPadding, rect.left),
      window.innerWidth - popRect.width - horizontalPadding
    );

    let top = rect.bottom + gap;
    if (top + popRect.height > window.innerHeight - horizontalPadding) {
      top = rect.top - popRect.height - gap;
    }
    top = Math.max(horizontalPadding, top);

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function showPopover(trigger) {
    if (!trigger || trigger.scrollWidth <= trigger.clientWidth + 1) return;
    closePopover();

    const popover = document.createElement('div');
    popover.className = 'name-popover';
    popover.setAttribute('role', 'tooltip');
    popover.id = `name-popover-${Date.now()}`;
    popover.textContent = trigger.textContent;
    document.body.appendChild(popover);

    positionPopover(popover, trigger);
    activePopover = popover;
    activeTrigger = trigger;

    if (trigger.closest('.cards-table__link')) {
      trigger.closest('.cards-table__link').setAttribute('aria-describedby', popover.id);
    }

    document.addEventListener('click', onOutsideClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', closePopover);
    window.addEventListener('scroll', closePopover, true);
  }

  function triggerFromEvent(target) {
    const element = target.closest('.truncate-name');
    if (element) return element;

    const link = target.closest('.cards-table__link');
    return link?.querySelector('.truncate-name') || null;
  }

  document.addEventListener('pointerover', (event) => {
    const trigger = triggerFromEvent(event.target);
    if (trigger) showPopover(trigger);
  });

  document.addEventListener('focusin', (event) => {
    const trigger = triggerFromEvent(event.target);
    if (trigger) showPopover(trigger);
  });

  document.addEventListener('focusout', (event) => {
    const trigger = triggerFromEvent(event.target);
    if (trigger && !trigger.contains(event.relatedTarget) && !event.relatedTarget?.closest?.('.name-popover')) {
      closePopover();
    }
  });
})();
