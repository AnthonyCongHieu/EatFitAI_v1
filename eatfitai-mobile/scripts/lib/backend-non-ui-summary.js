function cloneFailures(value) {
  return Array.isArray(value) ? [...value] : [];
}

function normalizeGate(name, gate) {
  return {
    name,
    passed: Boolean(gate?.passed),
    failures: cloneFailures(gate?.failures),
  };
}

function summarizeCodeHealth(codeHealth) {
  const dotnetTests = {
    passed: Boolean(codeHealth?.dotnetTests?.passed),
    command: codeHealth?.dotnetTests?.command || 'dotnet test EatFitAI_v1.sln',
    details: cloneFailures(codeHealth?.dotnetTests?.details),
  };
  const pythonUnitTests = {
    passed: Boolean(codeHealth?.pythonUnitTests?.passed),
    command:
      codeHealth?.pythonUnitTests?.command ||
      'python -m unittest discover -s ai-provider/tests -v',
    details: cloneFailures(codeHealth?.pythonUnitTests?.details),
  };
  const waived = Boolean(codeHealth?.waived);
  const waiverReason = codeHealth?.waiverReason || '';
  const failedChecks = [];

  if (!dotnetTests.passed) {
    failedChecks.push('dotnet-tests');
  }
  if (!pythonUnitTests.passed) {
    failedChecks.push('python-unit-tests');
  }

  return {
    waived,
    waiverReason,
    passed: waived || failedChecks.length === 0,
    failedChecks,
    dotnetTests,
    pythonUnitTests,
  };
}

function buildBackendNonUiSummary(input) {
  const gates = {
    preflight: normalizeGate('preflight', input?.preflight),
    authApi: normalizeGate('auth-api', input?.authApi),
    userApi: normalizeGate('user-api', input?.userApi),
    aiApi: normalizeGate('ai-api', input?.aiApi),
    cleanup: normalizeGate('cleanup', input?.cleanup),
  };
  const codeHealth = summarizeCodeHealth(input?.codeHealth);
  const failedCloudGates = Object.values(gates)
    .filter((gate) => !gate.passed)
    .map((gate) => gate.name);
  const cloudGatePass = Object.values(gates).every((gate) => gate.passed);
  const failedChecks = [...codeHealth.failedChecks];

  return {
    generatedAt: new Date().toISOString(),
    outputDir: input?.outputDir || '',
    backendUrl: input?.backendUrl || '',
    aiProviderUrl: input?.aiProviderUrl || '',
    gates,
    codeHealth,
    cloudGate: {
      passed: cloudGatePass,
      failedGates: failedCloudGates,
    },
    cloudGatePass,
    cloudFunctionalPass: cloudGatePass,
    codeHealthPass: codeHealth.passed,
    overallPassed: cloudGatePass && codeHealth.passed,
    failedGates: failedCloudGates,
    failedChecks,
  };
}

module.exports = {
  buildBackendNonUiSummary,
  summarizeCodeHealth,
};
