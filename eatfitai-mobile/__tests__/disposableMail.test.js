describe('disposable mail helpers', () => {
  const {
    extractSixDigitCode,
    getMailItems,
    selectNewestMatchingMessage,
  } = require('../scripts/lib/disposable-mail');

  it('extracts a six digit code from html and text payloads', () => {
    expect(
      extractSixDigitCode({
        text: 'Ma xac minh cua ban la 123456',
      }),
    ).toBe('123456');

    expect(
      extractSixDigitCode({
        html: '<p>Reset code: <strong>654321</strong></p>',
      }),
    ).toBe('654321');
  });

  it('returns an empty string when no six digit code is present', () => {
    expect(
      extractSixDigitCode({
        subject: 'Welcome to EatFitAI',
      }),
    ).toBe('');
  });

  it('reads both array payloads and hydra member payloads', () => {
    expect(getMailItems([{ id: 'a' }])).toEqual([{ id: 'a' }]);
    expect(
      getMailItems({
        'hydra:member': [{ id: 'b' }],
      }),
    ).toEqual([{ id: 'b' }]);
  });

  it('finds the newest matching message after the trigger time', () => {
    const newest = selectNewestMatchingMessage(
      [
        {
          id: 'old',
          subject: 'Mã xác minh EatFitAI',
          createdAt: '2026-04-18T10:00:00.000Z',
        },
        {
          id: 'fresh',
          subject: 'Mã xác minh EatFitAI',
          createdAt: '2026-04-18T10:05:00.000Z',
        },
      ],
      {
        subjectIncludes: 'Mã xác minh',
        createdAfterIso: '2026-04-18T10:01:00.000Z',
      },
    );

    expect(newest).toEqual(
      expect.objectContaining({
        id: 'fresh',
      }),
    );
  });
});
