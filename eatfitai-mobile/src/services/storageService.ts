import apiClient from './apiClient';
import { captureError } from './errorTracking';

export type UploadPurpose = 'vision' | 'voice';
const SHOULD_LOG_UPLOAD_PERF = __DEV__ && process.env.NODE_ENV !== 'test';

export interface PresignedUrlResponse {
  presignedUrl: string;
  publicUrl: string;
  objectKey: string;
  uploadId: string;
  expiresInSeconds: number;
}

export interface UploadVerificationResponse {
  verified: boolean;
  objectKey: string;
  contentType?: string;
  sizeBytes?: number;
}

export const storageService = {
  /**
   * Request a presigned URL from the backend
   */
  async getPresignedUrl(
    fileName: string,
    contentType: string,
    purpose: UploadPurpose = 'vision',
  ): Promise<PresignedUrlResponse> {
    try {
      const response = await apiClient.post<PresignedUrlResponse>('/api/v1/storage/presigned-url', {
        fileName,
        contentType,
        purpose,
      });
      return response.data;
    } catch (error) {
      captureError(error, 'storageService.getPresignedUrl');
      throw new Error('Không thể lấy URL upload bảo mật. Vui lòng thử lại.');
    }
  },

  /**
   * Upload a file directly to Cloudflare R2 using the presigned URL
   */
  async uploadFileToR2(presignedUrl: string, fileUri: string, contentType: string): Promise<void> {
    try {
      // Fetch file as blob
      const readStartedAt = Date.now();
      const fileBlob = await fetch(fileUri).then(r => r.blob());
      const readMs = Date.now() - readStartedAt;

      // Upload to R2 via PUT request
      const uploadStartedAt = Date.now();
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: fileBlob,
      });
      const uploadMs = Date.now() - uploadStartedAt;

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }

      if (SHOULD_LOG_UPLOAD_PERF) {
        console.info('[storageService] uploadFileToR2 metrics', {
          contentType,
          bytes: fileBlob.size,
          readMs,
          uploadMs,
        });
      }
    } catch (error) {
      captureError(error, 'storageService.uploadFileToR2');
      throw new Error('Lỗi khi tải file lên Cloud. Vui lòng thử lại.');
    }
  },

  async verifyUploadedObject(
    objectKey: string,
    contentType: string,
    purpose: UploadPurpose = 'vision',
  ): Promise<UploadVerificationResponse> {
    try {
      const response = await apiClient.post<UploadVerificationResponse>(
        '/api/v1/storage/verify-upload',
        {
          objectKey,
          contentType,
          purpose,
        },
      );

      if (!response.data?.verified) {
        throw new Error('Upload verification returned an unverified result.');
      }

      return response.data;
    } catch (error) {
      captureError(error, 'storageService.verifyUploadedObject', { objectKey, purpose });
      throw new Error('Không thể xác minh file đã tải lên. Vui lòng thử lại.');
    }
  },

  /**
   * Orchestrator to handle both requesting presigned url and uploading
   * Returns the upload metadata
   */
  async uploadMediaObject(
    fileUri: string,
    fileName: string,
    contentType: string,
    purpose: UploadPurpose = 'vision',
  ): Promise<PresignedUrlResponse> {
    const upload = await this.getPresignedUrl(fileName, contentType, purpose);
    await this.uploadFileToR2(upload.presignedUrl, fileUri, contentType);
    await this.verifyUploadedObject(upload.objectKey, contentType, purpose);
    return upload;
  },

  /**
   * Backward-compatible helper for flows that still need the public URL.
   */
  async uploadMedia(
    fileUri: string,
    fileName: string,
    contentType: string,
    purpose: UploadPurpose = 'vision',
  ): Promise<string> {
    const upload = await this.uploadMediaObject(fileUri, fileName, contentType, purpose);
    return upload.publicUrl;
  },
};

export default storageService;
