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

module.exports = {
  logcatContainsAppCrash,
};
