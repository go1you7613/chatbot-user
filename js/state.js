(() => {
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-state-action]');
    if (!trigger) return;

    const action = trigger.dataset.stateAction;
    if (action === 'back') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = 'chatbot.html';
      }
    }
    if (action === 'chatbot') {
      window.location.href = 'chatbot.html';
    }
    if (action === 'navigate') {
      const href = trigger.dataset.stateHref;
      if (href) window.location.href = href;
    }
    if (action === 'retry') {
      trigger.classList.add('is-loading');
      trigger.textContent = '다시 확인 중';
      window.setTimeout(() => {
        trigger.classList.remove('is-loading');
        trigger.textContent = '다시 시도하기';
      }, 700);
    }
  });
})();
