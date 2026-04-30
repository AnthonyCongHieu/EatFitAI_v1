const fs = require('fs');
const path = require('path');

function trim(value) {
  return String(value || '').trim();
}

function guessMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.wav':
      return 'audio/wav';
    case '.mp3':
      return 'audio/mpeg';
    case '.m4a':
      return 'audio/mp4';
    case '.ogg':
      return 'audio/ogg';
    case '.flac':
      return 'audio/flac';
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg';
  }
}

function authHeaders(token, extraHeaders = {}) {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  };
}

function buildFailure(stage, response, mediaUpload = {}) {
  return {
    ok: false,
    status: response?.status ?? null,
    durationMs: response?.durationMs ?? 0,
    body: response?.body ?? null,
    rawText: response?.rawText,
    error: response?.error || `${stage} failed`,
    mediaUpload: {
      ...mediaUpload,
      stage,
      status: response?.status ?? null,
    },
  };
}

async function uploadMediaObject({
  requestJson,
  backendUrl,
  token,
  filePath,
  purpose,
  contentType,
  timeoutMs,
  retryCount,
}) {
  if (typeof requestJson !== 'function') {
    throw new Error('requestJson is required');
  }

  const resolvedContentType = trim(contentType) || guessMimeType(filePath);
  const fileName = path.basename(filePath);
  const bytes = fs.readFileSync(filePath);
  const mediaUpload = {
    purpose,
    contentType: resolvedContentType,
    fileName,
    bytes: bytes.length,
  };

  const presigned = await requestJson(`${backendUrl}/api/v1/storage/presigned-url`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      Filename: fileName,
      ContentType: resolvedContentType,
      Purpose: purpose,
    }),
    timeoutMs,
    retryCount,
  });

  const presignedUrl = trim(presigned.body?.presignedUrl ?? presigned.body?.PresignedUrl);
  const objectKey = trim(presigned.body?.objectKey ?? presigned.body?.ObjectKey);
  const uploadId = trim(presigned.body?.uploadId ?? presigned.body?.UploadId);
  if (!presigned.ok || !presignedUrl || !objectKey) {
    return buildFailure('presigned-url', presigned, mediaUpload);
  }

  const upload = await requestJson(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': resolvedContentType },
    body: bytes,
    timeoutMs,
    retryCount,
  });
  if (!upload.ok) {
    return buildFailure('media-upload', upload, {
      ...mediaUpload,
      objectKey,
      uploadId,
    });
  }

  return {
    ok: true,
    objectKey,
    uploadId,
    mediaUpload: {
      ...mediaUpload,
      objectKey,
      uploadId,
      presignedStatus: presigned.status,
      uploadStatus: upload.status,
    },
  };
}

async function requestVisionDetectFromFile({
  requestJson,
  backendUrl,
  filePath,
  token,
  imageHash,
  timeoutMs,
  retryCount,
}) {
  const upload = await uploadMediaObject({
    requestJson,
    backendUrl,
    token,
    filePath,
    purpose: 'vision',
    contentType: guessMimeType(filePath),
    timeoutMs,
    retryCount,
  });

  if (!upload.ok) {
    return upload;
  }

  const response = await requestJson(`${backendUrl}/api/ai/vision/detect`, {
    method: 'POST',
    headers: authHeaders(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      ObjectKey: upload.objectKey,
      ImageHash: trim(imageHash) || upload.uploadId || path.basename(filePath),
    }),
    timeoutMs,
    retryCount,
  });

  return {
    ...response,
    mediaUpload: upload.mediaUpload,
  };
}

module.exports = {
  guessMimeType,
  requestVisionDetectFromFile,
  uploadMediaObject,
};
