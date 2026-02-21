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

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
