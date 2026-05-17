import fs from 'fs';
import path from 'path';

describe('MoChi island reminder behavior', () => {
  const hostPath = path.join(__dirname, '..', 'src', 'features', 'mochi', 'MoChiIslandHost.tsx');
  const enginePath = path.join(__dirname, '..', 'src', 'features', 'mochi', 'mochiIslandEngine.ts');
  const hostSource = fs.readFileSync(hostPath, 'utf8');
  const engineSource = fs.readFileSync(enginePath, 'utf8');

  it('uses a shared island host instead of the old floating reminder bubble', () => {
    expect(hostSource).toContain('getMoChiIslandState');
    expect(hostSource).toContain("MAIN_TAB_ROUTES = new Set(['HomeTab', 'VoiceTab', 'StatsTab', 'ProfileTab'])");
    expect(hostSource).not.toContain('GestureDetector');
    expect(hostSource).not.toContain('QuickActionsOverlay');
  });

  it('auto-hides result and confirm messages but keeps live states until handled', () => {
    expect(engineSource).toContain("if (mode === 'message') return ERROR_EVENTS.has(eventType) ? 9000 : 6500");
    expect(engineSource).toContain("if (mode === 'confirm') return 9000");
    expect(engineSource).toContain("if (mode === 'live') return null");
    expect(engineSource).toContain('${eventType}:${input.routeName ??');
    expect(hostSource).toContain('dismissIslandEvent(islandState.eventType, islandState.cooldownKey)');
  });

  it('keeps island interactions narrow instead of exposing a multi-action menu', () => {
    expect(engineSource).toContain("export type MoChiIslandMode = 'compact' | 'message' | 'live' | 'confirm'");
    expect(engineSource).toContain('confirmationAction');
    expect(hostSource).toContain('dismissIslandEvent');
    expect(hostSource).not.toContain('showQuickActions');
  });
});
