const { toBusinessDateOnly } = require('./business-date');

function toVietnamDateOnly(date = new Date()) {
  return toBusinessDateOnly(date);
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
  toBusinessDateOnly,
  toVietnamDateOnly,
};
