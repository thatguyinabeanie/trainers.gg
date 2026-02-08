/**
 * Mobile test setup file
 * Runs before each test file is executed
 */

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => "/",
}));

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");

// Mock expo-constants for tests
jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: "https://test.supabase.co",
        supabaseAnonKey: "test-anon-key",
      },
    },
  },
}));
