function trim(value) {
  return String(value || '').trim();
}

function pascalCaseKey(key) {
  const normalized = trim(key);
  return normalized ? `${normalized[0].toUpperCase()}${normalized.slice(1)}` : '';
}

function extractResponseCode(body, key) {
  const candidates = [
    body?.[key],
    body?.[pascalCaseKey(key)],
  ];

  for (const candidate of candidates) {
    const code = trim(candidate);
    if (/^\d{6}$/.test(code)) {
      return code;
    }
  }

  return '';
}

function resolveAuthCode({ responseBodies, responseKey, mailboxMessage }) {
  for (const body of Array.isArray(responseBodies) ? responseBodies : []) {
    const responseCode = extractResponseCode(body, responseKey);
    if (responseCode) {
      return {
        code: responseCode,
        source: 'response',
      };
    }
  }

  const mailboxCode = trim(mailboxMessage?.code);
  return {
    code: /^\d{6}$/.test(mailboxCode) ? mailboxCode : '',
    source: mailboxCode ? 'mailbox' : '',
  };
}

module.exports = {
  extractResponseCode,
  resolveAuthCode,
};
