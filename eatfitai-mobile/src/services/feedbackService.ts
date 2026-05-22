import apiClient from './apiClient';

export type FeedbackSentiment = 'good' | 'bad' | 'bug' | 'idea' | 'other';

export type FeedbackRequest = {
  category: string;
  sentiment: FeedbackSentiment;
  message: string;
  appVersion?: string;
  buildNumber?: string;
  platform?: string;
  deviceModel?: string;
  screen?: string;
};

export type FeedbackResponse = {
  message: string;
  traceId: string;
};

export const feedbackService = {
  async submit(request: FeedbackRequest): Promise<FeedbackResponse> {
    const payload: FeedbackRequest = {
      ...request,
      message: request.message.trim(),
    };

    const response = await apiClient.post<FeedbackResponse>(
      '/api/support/feedback',
      payload,
    );
    return response.data;
  },
};
