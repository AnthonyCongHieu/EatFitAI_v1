import voiceService from '../src/services/voiceService';
import {
  fetchWithAuthRetry,
  getCurrentApiUrl,
} from '../src/services/apiClient';
import { API_BASE_URL, assertBackendApiBaseUrl } from '../src/config/env';

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

describe('voiceService', () => {
  const mockedFetchWithAuthRetry = fetchWithAuthRetry as jest.Mock;
  const mockedGetCurrentApiUrl = getCurrentApiUrl as jest.Mock;
  const mockedAssertBackendApiBaseUrl = assertBackendApiBaseUrl as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentApiUrl.mockReturnValue('http://mock-api.local');
    mockedAssertBackendApiBaseUrl.mockImplementation((value: string) => value);
  });

  it('transcribeAudio sends the request through fetchWithAuthRetry', async () => {
    mockedFetchWithAuthRetry.mockResolvedValue({
      ok: true,
      json: async () => ({
        text: 'xin chao',
        language: 'vi',
        duration: 1.2,
        success: true,
      }),
    });

    const result = await voiceService.transcribeAudio('file:///recording.m4a');

    expect(mockedAssertBackendApiBaseUrl).toHaveBeenCalledWith(
      API_BASE_URL,
      'Voice API base URL',
    );
    expect(mockedFetchWithAuthRetry).toHaveBeenCalledWith(
      'http://mock-api.local/api/voice/transcribe',
      expect.any(Function),
    );
    expect(result).toEqual({
      text: 'xin chao',
      language: 'vi',
      duration: 1.2,
      success: true,
    });
  });

  it('transcribeAudio maps fetch failures into a user-facing error response', async () => {
    mockedFetchWithAuthRetry.mockRejectedValue(new Error('Network Error'));

    const result = await voiceService.transcribeAudio('file:///recording.m4a');

    expect(result.success).toBe(false);
    expect(result.text).toBe('');
    expect(result.language).toBe('vi');
    expect(result.duration).toBe(0);
    expect(result.error).toBe(
      'Không thể chuyển giọng nói thành văn bản. Kiểm tra kết nối tới backend và thử lại.',
    );
  });
});
