const { execFileSync } = require('child_process');

function readWindowsUserEnv(name) {
  if (process.platform !== 'win32') {
    return '';
  }

  try {
    return execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `[Environment]::GetEnvironmentVariable('${name.replace(/'/g, "''")}', 'User')`,
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();
  } catch {
    return '';
  }
}

function resolveEnv(name) {
  return process.env[name] || readWindowsUserEnv(name) || '';
}

module.exports = {
  resolveEnv,
};
