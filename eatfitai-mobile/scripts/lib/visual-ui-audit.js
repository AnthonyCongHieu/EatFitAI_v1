const VISUAL_AUDIT_FLOWS = {
  'bottom-nav': {
    label: 'Bottom navigation safe-area and tab transitions',
    expectedClipSeconds: 45,
  },
  'onboarding-rulers': {
    label: 'Onboarding body metric ruler snap interactions',
    expectedClipSeconds: 45,
  },
  'core-app': {
    label: 'Logged-in core app surfaces and transitions',
    expectedClipSeconds: 60,
  },
};

const KNOWN_VISUAL_ISSUES = [
  {
    id: 'UI-001',
    flow: 'bottom-nav',
    screen: 'HomeTab',
    severity: 'S2 visible bug',
    timestamp: '',
    expected: 'Bottom tab bar stays above the Android system navigation area.',
    actual: 'Reported issue: phone navigation controls can cover the app bottom bar.',
    evidence: { video: '', screenshot: '' },
    suspectedArea: 'src/components/navigation/CustomTabBar.tsx',
    fixCandidate: 'Use a larger Android safe-area fallback and verify on real device.',
    regressionRisks: 'Tab height changes can reduce visible content or move the center scan button.',
    status: 'known-before-run',
  },
  {
    id: 'UI-002',
    flow: 'onboarding-rulers',
    screen: 'Onboarding Step 1',
    severity: 'S2 visible bug',
    timestamp: '',
    expected: 'Ruler controls snap to a discrete tick and stop shortly after release.',
    actual: 'Reported issue: ruler can keep sliding continuously instead of stopping by step.',
    evidence: { video: '', screenshot: '' },
    suspectedArea: 'src/app/screens/auth/OnboardingScreen.tsx',
    fixCandidate: 'Disable interval momentum and programmatically snap final offsets.',
    regressionRisks: 'Over-aggressive snapping can make intentional fast flicks feel unresponsive.',
    status: 'known-before-run',
  },
];

function trim(value) {
  return String(value || '').trim();
}

function resolveVisualAuditFlowNames(flowName) {
  const requested = trim(flowName) || 'all';
  if (requested === 'all') {
    return Object.keys(VISUAL_AUDIT_FLOWS);
  }

  if (!VISUAL_AUDIT_FLOWS[requested]) {
    throw new Error(
      `Unknown visual audit flow "${requested}". Expected one of: all, ${Object.keys(VISUAL_AUDIT_FLOWS).join(', ')}`,
    );
  }

  return [requested];
}

function buildVisualBugMatrix(flowNames) {
  const selected = new Set(flowNames);
  const items = KNOWN_VISUAL_ISSUES.filter((item) => selected.has(item.flow)).map((item) => ({
    id: item.id,
    flow: item.flow,
    screen: item.screen,
    severity: item.severity,
    timestamp: item.timestamp,
    expected: item.expected,
    actual: item.actual,
    evidence: { ...item.evidence },
    suspectedArea: item.suspectedArea,
    fixCandidate: item.fixCandidate,
    regressionRisks: item.regressionRisks,
    status: item.status,
  }));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    reviewStatus: 'needs-human-review',
    flows: flowNames,
    items,
  };
}

function renderVisualBugMatrixMarkdown(matrix) {
  const lines = [
    '# EatFitAI Visual UI Audit Bug Matrix',
    '',
    `Generated: ${matrix.generatedAt}`,
    `Review status: ${matrix.reviewStatus}`,
    '',
    '| ID | Flow | Screen | Severity | Status | Expected | Actual | Evidence |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];

  for (const item of matrix.items) {
    const evidence = [
      item.evidence?.video ? `video=${item.evidence.video}` : '',
      item.evidence?.screenshot ? `screenshot=${item.evidence.screenshot}` : '',
    ]
      .filter(Boolean)
      .join('<br>');
    lines.push(
      `| ${item.id} | ${item.flow} | ${item.screen} | ${item.severity} | ${item.status} | ${item.expected} | ${item.actual} | ${evidence} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  VISUAL_AUDIT_FLOWS,
  buildVisualBugMatrix,
  renderVisualBugMatrixMarkdown,
  resolveVisualAuditFlowNames,
};
