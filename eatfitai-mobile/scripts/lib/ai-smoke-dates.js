function toVietnamDateOnly(date = new Date()) {
  const local = new Date(date);
  local.setUTCHours(local.getUTCHours() + 7);
  return local.toISOString().slice(0, 10);
}

function buildNoonUtcIsoForDateOnly(dateOnly) {
  const normalized = String(dateOnly || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`Invalid dateOnly value: ${normalized || '<empty>'}`);
  }

  return `${normalized}T12:00:00.000Z`;
}

module.exports = {
  buildNoonUtcIsoForDateOnly,
  toVietnamDateOnly,
};
