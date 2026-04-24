jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-firebase/crashlytics', () => {
  const instance = {
    setCrashlyticsCollectionEnabled: jest.fn(() => Promise.resolve()),
    setAttribute: jest.fn(),
    recordError: jest.fn(),
    setUserId: jest.fn(),
    log: jest.fn(),
  };

  return {
    __esModule: true,
    default: jest.fn(() => instance),
  };
});
