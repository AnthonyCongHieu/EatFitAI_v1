const fs = require('fs');
const path = require('path');

const DEFAULT_MAIL_API = 'https://api.mail.tm';

function trim(value) {
  return String(value || '').trim();
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMailItems(body) {
  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.['hydra:member'])) {
    return body['hydra:member'];
  }

  return [];
}

function extractSixDigitCode(message) {
  const candidates = [message?.text, message?.html, message?.intro, message?.subject]
    .filter(Boolean)
    .map((value) => (Array.isArray(value) ? value.join('\n') : String(value)));

  for (const candidate of candidates) {
    const match = candidate.match(/\b(\d{6})\b/);
    if (match) {
      return match[1];
    }
  }

  return '';
}

function selectNewestMatchingMessage(items, options = {}) {
  const subjectIncludes = trim(options.subjectIncludes);
  const introIncludes = trim(options.introIncludes);
  const createdAfterIso = trim(options.createdAfterIso);
  const createdAfterMs = createdAfterIso ? Date.parse(createdAfterIso) : Number.NaN;
  const minimumMatches = Number.parseInt(String(options.minimumMatches || 1), 10) || 1;

  const matches = [...(Array.isArray(items) ? items : [])]
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (subjectIncludes && !String(item?.subject || '').includes(subjectIncludes)) {
        return false;
      }

      if (introIncludes && !String(item?.intro || '').includes(introIncludes)) {
        return false;
      }

      if (!Number.isFinite(createdAfterMs)) {
        return true;
      }

      const createdAtMs = Date.parse(item?.createdAt || 0);
      return Number.isFinite(createdAtMs) && createdAtMs >= createdAfterMs - 1000;
    });

  if (matches.length < minimumMatches) {
    return null;
  }

  return matches.sort((leftEntry, rightEntry) => {
      const left = leftEntry.item;
      const right = rightEntry.item;
      const rightUpdatedAt = Date.parse(right?.updatedAt || right?.createdAt || 0);
      const leftUpdatedAt = Date.parse(left?.updatedAt || left?.createdAt || 0);
      if (rightUpdatedAt !== leftUpdatedAt) {
        return rightUpdatedAt - leftUpdatedAt;
      }

      const rightCreatedAt = Date.parse(right?.createdAt || 0);
      const leftCreatedAt = Date.parse(left?.createdAt || 0);
      if (rightCreatedAt !== leftCreatedAt) {
        return rightCreatedAt - leftCreatedAt;
      }

      return leftEntry.index - rightEntry.index;
    })[0]?.item || null;
}

async function requestJson(url, options = {}) {
  const startedAtMs = Date.now();
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
      body: options.body,
    });
    const rawText = await response.text();
    let body = null;

    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = rawText;
    }

    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAtMs,
      body,
      rawText,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      durationMs: Date.now() - startedAtMs,
      body: null,
      rawText: '',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function createDisposableMailbox(options = {}) {
  const apiBaseUrl = trim(options.apiBaseUrl || DEFAULT_MAIL_API).replace(/\/+$/, '');
  const outputDir = trim(options.outputDir);
  const artifactName = trim(options.artifactName || 'disposable-mailbox.json');
  const domains = await requestJson(`${apiBaseUrl}/domains`);

  const domain = getMailItems(domains.body)[0]?.domain;
  if (!domains.ok || !domain) {
    throw new Error(`Failed to resolve disposable mail domains. Status=${domains.status}`);
  }

  const localPart = `eatfitai${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const address = `${localPart}@${domain}`;
  const password = `Tm${Date.now()}!${Math.random().toString(36).slice(2, 8)}`;

  const account = await requestJson(`${apiBaseUrl}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address, password }),
  });
  if (!account.ok) {
    throw new Error(
      `Failed to create disposable mailbox. Status=${account.status} Error=${account.error || account.rawText || ''}`,
    );
  }

  let tokenResponse = null;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    tokenResponse = await requestJson(`${apiBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, password }),
    });

    if (tokenResponse.ok && tokenResponse.body?.token) {
      break;
    }

    if (attempt < 6) {
      await sleep(5000);
    }
  }

  if (!tokenResponse?.ok || !tokenResponse.body?.token) {
    throw new Error(
      `Failed to create disposable mailbox token. Status=${tokenResponse?.status}`,
    );
  }

  const artifact = {
    generatedAt: new Date().toISOString(),
    provider: 'mail.tm',
    address,
    password,
    token: tokenResponse.body.token,
    domain,
  };

  if (outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    writeJson(path.join(outputDir, artifactName), artifact);
  }

  return artifact;
}

async function waitForMatchingMessage(options) {
  const apiBaseUrl = trim(options?.apiBaseUrl || DEFAULT_MAIL_API).replace(/\/+$/, '');
  const mailbox = options?.mailbox || {};
  const outputDir = trim(options?.outputDir);
  const artifactName = trim(options?.artifactName || 'disposable-mail-message.json');
  const timeoutMs = Number.parseInt(String(options?.timeoutMs || 240000), 10) || 240000;
  const pollIntervalMs =
    Number.parseInt(String(options?.pollIntervalMs || 10000), 10) || 10000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const messages = await requestJson(`${apiBaseUrl}/messages`, {
      headers: {
        Authorization: `Bearer ${mailbox.token}`,
      },
    });

    if (messages.ok) {
      const newest = selectNewestMatchingMessage(getMailItems(messages.body), {
        subjectIncludes: options?.subjectIncludes,
        introIncludes: options?.introIncludes,
        createdAfterIso: options?.createdAfterIso,
        minimumMatches: options?.minimumMatches,
      });

      if (newest?.id) {
        const detail = await requestJson(`${apiBaseUrl}/messages/${newest.id}`, {
          headers: {
            Authorization: `Bearer ${mailbox.token}`,
          },
        });

        if (detail.ok) {
          const code = extractSixDigitCode(detail.body);
          const artifact = {
            generatedAt: new Date().toISOString(),
            mailbox: mailbox.address,
            messageId: newest.id,
            subject: detail.body?.subject || newest.subject || '',
            code,
            message: detail.body,
          };

          if (outputDir) {
            fs.mkdirSync(outputDir, { recursive: true });
            writeJson(path.join(outputDir, artifactName), artifact);
          }

          return artifact;
        }
      }
    }

    await sleep(pollIntervalMs);
  }

  throw new Error('Timed out waiting for disposable mailbox message.');
}

module.exports = {
  DEFAULT_MAIL_API,
  createDisposableMailbox,
  extractSixDigitCode,
  getMailItems,
  requestJson,
  selectNewestMatchingMessage,
  waitForMatchingMessage,
};
