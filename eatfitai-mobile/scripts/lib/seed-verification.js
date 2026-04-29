function trim(value) {
  return String(value || '').trim();
}

function getResponseMessage(result) {
  return trim(result?.body?.message || result?.body?.error || result?.rawText || result?.error);
}

function isEmailUnverifiedLogin(result) {
  const message = getResponseMessage(result).toLowerCase();
  return (
    Number(result?.status) === 401 &&
    message.includes('email') &&
    (message.includes('minh') || message.includes('verify') || message.includes('verification'))
  );
}

function redactVerificationCodes(value) {
  return trim(value).replace(/\b\d{6}\b/g, '<redacted-code>');
}

function buildSafeMailboxArtifact(mailbox = {}) {
  return {
    generatedAt: new Date().toISOString(),
    provider: 'mail.tm',
    address: trim(mailbox.address),
    mailApi: trim(mailbox.mailApi),
    mailboxTokenPresent: Boolean(mailbox.token),
  };
}

function buildSafeVerificationArtifact(message = {}) {
  return {
    generatedAt: new Date().toISOString(),
    mailbox: trim(message.mailbox),
    messageCount: Number(message.messageCount || 0),
    newestMessageId: trim(message.newestMessageId || message.messageId),
    subject: redactVerificationCodes(message.subject),
    verificationCodeFound: Boolean(trim(message.verificationCode)),
  };
}

function createMailboxUnavailableError(detail) {
  const error = new Error(
    `demo-mailbox-unavailable: ${trim(detail) || 'mailbox cannot be accessed for demo account verification'}`,
  );
  error.reason = 'demo-mailbox-unavailable';
  return error;
}

function getErrorReason(error) {
  return trim(error?.reason) || '';
}

module.exports = {
  buildSafeMailboxArtifact,
  buildSafeVerificationArtifact,
  createMailboxUnavailableError,
  getErrorReason,
  getResponseMessage,
  isEmailUnverifiedLogin,
  redactVerificationCodes,
};
