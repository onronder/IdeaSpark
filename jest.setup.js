// Jest setup file for React Native Testing Library

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock expo-router
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  Link: ({ children }) => children,
}));

// Mock expo modules
jest.mock('expo-constants', () => ({
  manifest: {},
  executionEnvironment: 'test',
}));

jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
  canOpenURL: jest.fn(),
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
  coolDownAsync: jest.fn(),
  warmUpAsync: jest.fn(),
}));

// Mock react-native modules
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Keep these for debugging
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Keep error and warn visible
  warn: console.warn,
  error: console.error,
};

// Setup fetch mock
global.fetch = jest.fn();

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});