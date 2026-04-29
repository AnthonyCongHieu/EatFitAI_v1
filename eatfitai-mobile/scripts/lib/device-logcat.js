function logcatContainsAppCrash(text, packageName = 'com.eatfitai.app') {
  const escapedPackage = String(packageName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const packagePattern = new RegExp(escapedPackage, 'i');
  const processPattern = new RegExp(`Process:\\s*${escapedPackage}`, 'i');
  const lines = String(text || '').split(/\r?\n/);

  return lines.some((line, index) => {
    if (processPattern.test(line)) {
      return true;
    }

    if (!/FATAL EXCEPTION|FATAL SIGNAL|FATAL.*AndroidRuntime|AndroidRuntime.*FATAL/i.test(line)) {
      return false;
    }

    const crashWindow = lines.slice(index, index + 12).join('\n');
    return processPattern.test(crashWindow) || packagePattern.test(crashWindow);
  });
}

function redactLogcatLine(line) {
  return String(line || '')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(
      /\b(access_token|refresh_token|id_token|token|api_key|apikey|password)=([^&\s]+)/gi,
      '$1=[REDACTED]',
    )
    .replace(
      /("(?:accessToken|refreshToken|idToken|token|apiKey|password)"\s*:\s*")[^"]+"/gi,
      '$1[REDACTED]"',
    );
}

function redactLogcatText(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(redactLogcatLine)
    .join('\n');
}

module.exports = {
  logcatContainsAppCrash,
  redactLogcatLine,
  redactLogcatText,
};
