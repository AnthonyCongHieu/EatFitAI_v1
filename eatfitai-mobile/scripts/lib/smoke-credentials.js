function trim(value) {
  return String(value || '').trim();
}

function resolveSmokeCredentials(options = {}) {
  const smokeEmail = trim(process.env.EATFITAI_SMOKE_EMAIL);
  const smokePassword = trim(process.env.EATFITAI_SMOKE_PASSWORD);
  if (smokeEmail && smokePassword) {
    return {
      email: smokeEmail,
      password: smokePassword,
      source: 'EATFITAI_SMOKE_EMAIL/EATFITAI_SMOKE_PASSWORD',
    };
  }

  const demoEmail = trim(process.env.EATFITAI_DEMO_EMAIL);
  const demoPassword = trim(process.env.EATFITAI_DEMO_PASSWORD);
  if (demoEmail && demoPassword) {
    return {
      email: demoEmail,
      password: demoPassword,
      source: 'EATFITAI_DEMO_EMAIL/EATFITAI_DEMO_PASSWORD',
    };
  }

  if (
    options.allowLocalDefaults &&
    typeof options.looksLocalUrl === 'function' &&
    options.looksLocalUrl(options.backendUrl)
  ) {
    return {
      email: options.defaultEmail || '',
      password: options.defaultPassword || '',
      source: 'local-default-demo-account',
    };
  }

  return null;
}

module.exports = {
  resolveSmokeCredentials,
  trim,
};
