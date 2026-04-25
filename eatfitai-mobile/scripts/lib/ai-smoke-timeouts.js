function isTimeoutLikeResponse(response) {
  if (!response || response.ok) {
    return false;
  }

  if (response.status === 408 || response.status === 504) {
    return true;
  }

  if (response.status == null) {
    const error = String(response.error || '').toLowerCase();
    return (
      !error ||
      error.includes('abort') ||
      error.includes('timeout') ||
      error.includes('timed out')
    );
  }

  return false;
}

function shouldStopVisionFixtureSweep(response) {
  return isTimeoutLikeResponse(response);
}

module.exports = {
  isTimeoutLikeResponse,
  shouldStopVisionFixtureSweep,
};
