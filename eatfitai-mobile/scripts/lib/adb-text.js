const LETTER_KEY_CODES = Object.fromEntries(
  'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => [letter, `KEYCODE_${letter.toUpperCase()}`]),
);

const DIGIT_KEY_CODES = Object.fromEntries(
  '0123456789'.split('').map((digit) => [digit, `KEYCODE_${digit}`]),
);

const ASCII_KEY_CODES = {
  ...LETTER_KEY_CODES,
  ...DIGIT_KEY_CODES,
  '@': 'KEYCODE_AT',
  '.': 'KEYCODE_PERIOD',
  '-': 'KEYCODE_MINUS',
  '_': 'KEYCODE_MINUS',
};

function buildAsciiKeyEventArgs(text, options = {}) {
  const value = options.lowercase ? String(text || '').toLowerCase() : String(text || '');
  const keyCodes = [];

  for (const char of value) {
    const keyCode = ASCII_KEY_CODES[char];
    if (!keyCode || (char === '_' && !options.allowUnderscoreFallback)) {
      return null;
    }
    keyCodes.push(keyCode);
  }

  return keyCodes.length > 0 ? ['shell', 'input', 'keyevent', ...keyCodes] : null;
}

module.exports = {
  buildAsciiKeyEventArgs,
};
