import voiceService from '../src/services/voiceService';
import apiClient from '../src/services/apiClient';
import {
  fetchWithAuthRetry,
  getCurrentApiUrl,
} from '../src/services/apiClient';
import { assertBackendApiBaseUrl } from '../src/config/env';

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
  const mockedPost = apiClient.post as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetCurrentApiUrl.mockReturnValue('http://mock-api.local');
    mockedAssertBackendApiBaseUrl.mockImplementation((value: string) => value);
  });

  it('transcribeAudio returns the disabled-STT response without calling backend', async () => {
    const result = await voiceService.transcribeAudio('file:///recording.m4a');

    expect(mockedAssertBackendApiBaseUrl).not.toHaveBeenCalled();
    expect(mockedFetchWithAuthRetry).not.toHaveBeenCalled();
    expect(result).toEqual({
      text: '',
      language: 'vi',
      duration: 0,
      success: false,
      error: 'Chức năng chuyển giọng nói hiện đang tạm tắt. Hãy nhập lệnh bằng text.',
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

  it('parseWithOllama remains a compatibility alias for parseWithProvider', async () => {
    const parseWithProvider = jest
      .spyOn(voiceService, 'parseWithProvider')
      .mockResolvedValue({
        intent: 'UNKNOWN',
        entities: {},
        confidence: 0,
        rawText: 'xin chào',
      });

    await voiceService.parseWithOllama('xin chào');

    expect(parseWithProvider).toHaveBeenCalledWith('xin chào');
  });
});
