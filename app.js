// Small UI enhancements: close open edit panels when clicking elsewhere and validate forms.
document.querySelectorAll('form').forEach(form => {
  form.addEventListener('submit', () => {
    const button = form.querySelector('button[type="submit"], button:not([type])');
    if (button && !form.hasAttribute('onsubmit')) {
      button.dataset.originalText = button.textContent;
      button.textContent = 'Please wait…';
    }
  });
});
