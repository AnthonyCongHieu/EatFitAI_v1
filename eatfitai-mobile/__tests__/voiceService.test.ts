import voiceService from '../src/services/voiceService';
import apiClient from '../src/services/apiClient';
import {
  fetchWithAuthRetry,
  getCurrentApiUrl,
} from '../src/services/apiClient';
import { assertBackendApiBaseUrl } from '../src/config/env';
import storageService from '../src/services/storageService';

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
  fetchWithAuthRetry: jest.fn(),
  getCurrentApiUrl: jest.fn(() => 'http://mock-api.local'),
}));

jest.mock('../src/config/env', () => ({
  API_BASE_URL: 'http://mock-api.local',
  assertBackendApiBaseUrl: jest.fn((value: string) => value),
}));

jest.mock('../src/services/storageService', () => ({
  __esModule: true,
  default: {
    uploadMediaObject: jest.fn(),
  },
}));

describe('voiceService', () => {
  const mockedFetchWithAuthRetry = fetchWithAuthRetry as jest.Mock;
  const mockedGetCurrentApiUrl = getCurrentApiUrl as jest.Mock;
  const mockedAssertBackendApiBaseUrl = assertBackendApiBaseUrl as jest.Mock;
  const mockedPost = apiClient.post as jest.Mock;
  const mockedStorageService = storageService as unknown as {
    uploadMediaObject: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentApiUrl.mockReturnValue('http://mock-api.local');
    mockedAssertBackendApiBaseUrl.mockImplementation((value: string) => value);
    mockedStorageService.uploadMediaObject.mockResolvedValue({
      presignedUrl: 'https://r2-upload.local/put',
      publicUrl: 'https://media.local/voice/user/audio.m4a',
      objectKey: 'voice/user/audio.m4a',
      uploadId: 'voice-upload-123',
      expiresInSeconds: 300,
    });
  });

  it('transcribeAudio uploads voice media and sends scoped ObjectKey to backend', async () => {
    mockedPost.mockResolvedValue({
      data: {
        text: 'xin chào',
        language: 'vi',
        duration: 0.4,
        success: true,
      },
    });

    const result = await voiceService.transcribeAudio('file:///recording.m4a');

    expect(mockedAssertBackendApiBaseUrl).toHaveBeenCalledWith(
      'http://mock-api.local',
      'Voice API base URL',
    );
    expect(mockedFetchWithAuthRetry).not.toHaveBeenCalled();
    expect(mockedStorageService.uploadMediaObject).toHaveBeenCalledWith(
      'file:///recording.m4a',
      'recording.m4a',
      'audio/mp4',
      'voice',
    );
    expect(mockedPost).toHaveBeenCalledWith(
      '/api/voice/transcribe',
      {
        ObjectKey: 'voice/user/audio.m4a',
        UploadId: 'voice-upload-123',
      },
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000,
      }),
    );
    expect(result).toEqual({
      text: 'xin chào',
      language: 'vi',
      duration: 0.4,
      success: true,
    });
  });

  it('parseWithProvider sends text through the backend AI provider proxy', async () => {
    mockedPost.mockResolvedValue({
      data: {
        intent: 'ADD_FOOD',
        entities: { foodName: 'phở bò' },
        confidence: 0.91,
        rawText: 'thêm phở bò',
        source: 'ai-provider-proxy',
      },
    });

    const result = await voiceService.parseWithProvider('thêm phở bò');

    expect(mockedPost).toHaveBeenCalledWith('/api/voice/parse', {
      text: 'thêm phở bò',
      language: 'vi',
    });
    expect(result.source).toBe('ai-provider-proxy');
  });

  // parseWithOllama test đã xóa — method deprecated
});
