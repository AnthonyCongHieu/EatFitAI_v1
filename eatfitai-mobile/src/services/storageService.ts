import apiClient from './apiClient';
import { captureError } from './errorTracking';

export type UploadPurpose = 'vision' | 'voice';

export interface PresignedUrlResponse {
  presignedUrl: string;
  publicUrl: string;
  objectKey: string;
  uploadId: string;
  expiresInSeconds: number;
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
      const fileBlob = await fetch(fileUri).then(r => r.blob());
      
      // Upload to R2 via PUT request
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: fileBlob,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
    } catch (error) {
      captureError(error, 'storageService.uploadFileToR2');
      throw new Error('Lỗi khi tải file lên Cloud. Vui lòng thử lại.');
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
  }
};

export default storageService;
