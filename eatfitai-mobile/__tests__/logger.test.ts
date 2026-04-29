describe('logger', () => {
  const originalDev = (globalThis as any).__DEV__;

  beforeEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  it('suppresses non-error logs in production while keeping errors', () => {
    (globalThis as any).__DEV__ = false;

    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const logger = require('../src/utils/logger').default as typeof import('../src/utils/logger').default;

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('error');

    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
