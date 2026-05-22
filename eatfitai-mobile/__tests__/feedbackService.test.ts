import apiClient from '../src/services/apiClient';
import { feedbackService } from '../src/services/feedbackService';

jest.mock('../src/services/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

describe('feedbackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits trimmed feedback to the support endpoint', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { message: 'Đã gửi phản hồi.', traceId: 'trace-test' },
    });

    const response = await feedbackService.submit({
      category: 'performance',
      sentiment: 'bad',
      message: '  App hơi lag khi mở màn thống kê.  ',
      appVersion: '1.0.0',
      buildNumber: '1',
      platform: 'android',
      deviceModel: 'Pixel Test',
      screen: 'About',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/support/feedback', {
      category: 'performance',
      sentiment: 'bad',
      message: 'App hơi lag khi mở màn thống kê.',
      appVersion: '1.0.0',
      buildNumber: '1',
      platform: 'android',
      deviceModel: 'Pixel Test',
      screen: 'About',
    });
    expect(response.traceId).toBe('trace-test');
  });
});
