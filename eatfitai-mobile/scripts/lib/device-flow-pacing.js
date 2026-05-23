const DEVICE_FLOW_AUTH_COSTS = Object.freeze({
  'register-new-user': 6,
  'login-real': 1,
  'food-diary-readback': 2,
  'food-search-ui-readback': 2,
  'scan-save-readback': 2,
  'voice-text-readback': 2,
  'stats-profile-smoke': 2,
  'backend-frontend-live-check': 2,
  'visual-ui-audit': 1,
});

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildDeviceFlowAuthPacer(options = {}) {
  const limit = parsePositiveInteger(
    options.limit || process.env.EATFITAI_DEVICE_AUTH_PACE_LIMIT,
    6,
  );
  const windowMs = parsePositiveInteger(
    options.windowMs || process.env.EATFITAI_DEVICE_AUTH_PACE_WINDOW_MS,
    65000,
  );
  let reservations = [];

  return {
    beforeFlow(mode, now = Date.now()) {
      const cost = DEVICE_FLOW_AUTH_COSTS[mode] || 0;
      if (cost === 0) {
        return 0;
      }

      let scheduledAt = now;
      reservations = reservations.filter((reservation) => reservation.at > now - windowMs);

      while (
        reservations.reduce((total, reservation) => total + reservation.cost, 0) + cost >
          limit &&
        reservations.length > 0
      ) {
        scheduledAt = Math.max(scheduledAt, reservations[0].at + windowMs + 1);
        reservations = reservations.filter(
          (reservation) => reservation.at > scheduledAt - windowMs,
        );
      }

      reservations.push({ at: scheduledAt, cost });
      reservations.sort((left, right) => left.at - right.at);
      return Math.max(0, scheduledAt - now);
    },
  };
}

module.exports = {
  DEVICE_FLOW_AUTH_COSTS,
  buildDeviceFlowAuthPacer,
};
