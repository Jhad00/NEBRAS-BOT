export function formatText({ text = "", font = "bold", effects = [] }) {
  const fonts = {
    bold: { a: 0x1d41a, A: 0x1d400, n: 0x1d7ce },
    monospace: { a: 0x1d68a, A: 0x1d670, n: 0x1d7f6 },
    sans: { a: 0x1d5ba, A: 0x1d5a0, n: 0x1d7e2 },
    serifBold: { a: 0x1d482, A: 0x1d468, n: 0x1d7ce },
  };

  const effectsMap = {
    bold: (t) => `*${t}*`,
    italic: (t) => `_${t}_`,
    strike: (t) => `~${t}~`,
    code: (t) => `\`${t}\``,
  };

  let result = text;

  if (fonts[font]) {
    const base = fonts[font];
    result = text
      .split("")
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code >= 97 && code <= 122) {
          return String.fromCodePoint(base.a + (code - 97));
        }
        if (code >= 65 && code <= 90) {
          return String.fromCodePoint(base.A + (code - 65));
        }
        if (code >= 48 && code <= 57 && base.n !== null) {
          return String.fromCodePoint(base.n + (code - 48));
        }
        return char;
      })
      .join("");
  }

  effects.forEach((style) => {
    if (effectsMap[style]) {
      result = effectsMap[style](result);
    }
  });

  return result;
}
