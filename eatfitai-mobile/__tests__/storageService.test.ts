import apiClient from '../src/services/apiClient';
import storageService from '../src/services/storageService';

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock('../src/services/errorTracking', () => ({
  captureError: jest.fn(),
}));

describe('storageService', () => {
  const mockedApiClient = apiClient as unknown as {
    post: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      blob: async () => new Blob(['image-bytes'], { type: 'image/jpeg' }),
    })) as jest.Mock;

    mockedApiClient.post
      .mockResolvedValueOnce({
        data: {
          presignedUrl: 'https://r2-upload.local/put',
          publicUrl: 'https://media.local/vision/user/photo.jpg',
          objectKey: 'vision/user/photo.jpg',
          uploadId: 'upload-123',
          expiresInSeconds: 900,
        },
      })
      .mockResolvedValueOnce({
        data: {
          verified: true,
          objectKey: 'vision/user/photo.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 123_456,
        },
      });
  });

  it('verifies the uploaded object with the backend before returning metadata', async () => {
    const upload = await storageService.uploadMediaObject(
      'file:///food.jpg',
      'food.jpg',
      'image/jpeg',
      'vision',
    );

    expect(upload.objectKey).toBe('vision/user/photo.jpg');
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      1,
      '/api/v1/storage/presigned-url',
      {
        fileName: 'food.jpg',
        contentType: 'image/jpeg',
        purpose: 'vision',
      },
    );
    expect(globalThis.fetch).toHaveBeenCalledWith('file:///food.jpg');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://r2-upload.local/put',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
      }),
    );
    expect(mockedApiClient.post).toHaveBeenNthCalledWith(
      2,
      '/api/v1/storage/verify-upload',
      {
        objectKey: 'vision/user/photo.jpg',
        contentType: 'image/jpeg',
        purpose: 'vision',
      },
    );
  });

  it('throws when backend verification does not confirm the upload', async () => {
    mockedApiClient.post.mockReset();
    mockedApiClient.post
      .mockResolvedValueOnce({
        data: {
          presignedUrl: 'https://r2-upload.local/put',
          publicUrl: 'https://media.local/vision/user/photo.jpg',
          objectKey: 'vision/user/photo.jpg',
          uploadId: 'upload-123',
          expiresInSeconds: 900,
        },
      })
      .mockResolvedValueOnce({
        data: {
          verified: false,
          objectKey: 'vision/user/photo.jpg',
        },
      });

    await expect(
      storageService.uploadMediaObject(
        'file:///food.jpg',
        'food.jpg',
        'image/jpeg',
        'vision',
      ),
    ).rejects.toThrow('Không thể xác minh file đã tải lên');
  });
});
