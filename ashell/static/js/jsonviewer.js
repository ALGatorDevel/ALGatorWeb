/**
 * Convert a JS value (object/array/primitive) into an HTML <pre> element
 * showing nicely indented JSON-like structure. Colors are applied via spans.
 *
 * @param {any} value    - The JS value (object/array/primitive) to render.
 * @param {number} indentSpaces - Number of spaces to use per level (default 2).
 * @returns {HTMLElement} - A <pre> element (class "json-pre") with the HTML.
 */
function jsonToHtml(value, indentSpaces = 2) {
  // Escape text for HTML
  const esc = s => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Render a primitive (string/number/boolean/null) wrapped in span
  function renderPrimitive(v) {
    if (v === null) return `<span class="json-null">null</span>`;
    const t = typeof v;
    if (t === 'string') return `<span class="json-string">"${esc(v)}"</span>`;
    if (t === 'number') return `<span class="json-number">${esc(v)}</span>`;
    if (t === 'boolean') return `<span class="json-boolean">${esc(v)}</span>`;
    // fallback
    return `<span>${esc(String(v))}</span>`;
  }

  // Recursive renderer: returns HTML string (no outer <pre>)
  function render(value, level) {
    const pad = ' '.repeat(level * indentSpaces);
    const innerPad = ' '.repeat((level + 1) * indentSpaces);

    if (value === null || typeof value !== 'object') {
      return renderPrimitive(value);
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return `<span class="json-brace">[]</span>`;
      let out = `<span class="json-brace">[</span>\n`;
      for (let i = 0; i < value.length; i++) {
        out += innerPad + render(value[i], level + 1);
        if (i < value.length - 1) out += `<span class="json-brace">,</span>`;
        out += '\n';
      }
      out += pad + `<span class="json-brace">]</span>`;
      return out;
    }

    // object
    const keys = Object.keys(value);
    if (keys.length === 0) return `<span class="json-brace">{}</span>`;
    let out = `<span class="json-brace">{</span>\n`;
    keys.forEach((k, idx) => {
      const comma = (idx < keys.length - 1) ? `<span class="json-brace">,</span>` : '';
      out += innerPad
           + `<span class="json-key">"${esc(k)}"</span>`
           + `<span class="json-brace">: </span>`
           + render(value[k], level + 1)
           + comma
           + '\n';
    });
    out += pad + `<span class="json-brace">}</span>`;
    return out;
  }

  const html = render(value, 0);
  const pre = document.createElement('pre');
  pre.className = 'json-pre';
  pre.innerHTML = html;
  return pre;
}
