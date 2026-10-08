/**
 * Wrap every word of an element in masking spans so headings can rise in word by word.
 * Inline children such as <em> are preserved; their words are wrapped in place.
 */
export function splitWords(el, { wordClass = 'split-word', inner = true } = {}) {
  let index = 0;

  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          const word = document.createElement('span');
          word.className = wordClass;
          word.style.setProperty('--i', index++);
          if (inner) {
            const span = document.createElement('span');
            span.textContent = part;
            word.appendChild(span);
          } else {
            word.textContent = part;
          }
          frag.appendChild(word);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };

  // words stay as real text separated by spaces, so screen readers read the sentence normally
  walk(el);
  el.classList.add('is-split');
  return index;
}
