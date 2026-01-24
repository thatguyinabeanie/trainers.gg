import {
  createContext,
  useContext,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  type SharedValue,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import {
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";

const SCROLL_THRESHOLD = 10; // Minimum scroll distance to trigger hide/show
const ANIMATION_DURATION = 200;

interface ScrollVisibilityContextValue {
  /** Whether the bars are currently visible */
  isVisible: SharedValue<number>;
  /** Call this in onScroll handler */
  handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Force bars to show (e.g., on pull-to-refresh) */
  show: () => void;
  /** Get animated style for header */
  headerAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Get animated style for tab bar */
  tabBarAnimatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Header height for offset calculation */
  headerHeight: number;
  /** Tab bar height for offset calculation */
  tabBarHeight: number;
}

const ScrollVisibilityContext =
  createContext<ScrollVisibilityContextValue | null>(null);

interface ScrollVisibilityProviderProps {
  children: ReactNode;
  headerHeight?: number;
  tabBarHeight?: number;
}

export function ScrollVisibilityProvider({
  children,
  headerHeight = 100, // Default: safe area (~50) + header content (~50)
  tabBarHeight = 88, // Default tab bar height
}: ScrollVisibilityProviderProps) {
  // 1 = visible, 0 = hidden
  const isVisible = useSharedValue(1);
  const lastScrollY = useSharedValue(0);
  const scrollDirection = useSharedValue<"up" | "down" | null>(null);

  const show = useCallback(() => {
    "worklet";
    isVisible.value = withTiming(1, { duration: ANIMATION_DURATION });
  }, [isVisible]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - lastScrollY.value;

      // Don't do anything if we're at the top
      if (currentY <= 0) {
        isVisible.value = withTiming(1, { duration: ANIMATION_DURATION });
        lastScrollY.value = currentY;
        return;
      }

      // Only act if we've scrolled past the threshold
      if (Math.abs(diff) > SCROLL_THRESHOLD) {
        const newDirection = diff > 0 ? "down" : "up";

        if (newDirection !== scrollDirection.value) {
          scrollDirection.value = newDirection;

          if (newDirection === "down") {
            // Scrolling down - hide bars
            isVisible.value = withTiming(0, { duration: ANIMATION_DURATION });
          } else {
            // Scrolling up - show bars
            isVisible.value = withTiming(1, { duration: ANIMATION_DURATION });
          }
        }

        lastScrollY.value = currentY;
      }
    },
    [isVisible, lastScrollY, scrollDirection]
  );

  // Animated style for header - slides up when hidden
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            isVisible.value,
            [0, 1],
            [-headerHeight, 0],
            Extrapolation.CLAMP
          ),
        },
      ],
      opacity: isVisible.value,
    };
  }, [headerHeight]);

  // Animated style for tab bar - slides down when hidden
  const tabBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            isVisible.value,
            [0, 1],
            [tabBarHeight, 0],
            Extrapolation.CLAMP
          ),
        },
      ],
      opacity: isVisible.value,
    };
  }, [tabBarHeight]);

  const value = useMemo(
    () => ({
      isVisible,
      handleScroll,
      show,
      headerAnimatedStyle,
      tabBarAnimatedStyle,
      headerHeight,
      tabBarHeight,
    }),
    [
      isVisible,
      handleScroll,
      show,
      headerAnimatedStyle,
      tabBarAnimatedStyle,
      headerHeight,
      tabBarHeight,
    ]
  );

  return (
    <ScrollVisibilityContext.Provider value={value}>
      {children}
    </ScrollVisibilityContext.Provider>
  );
}

export function useScrollVisibility() {
  const context = useContext(ScrollVisibilityContext);
  if (!context) {
    throw new Error(
      "useScrollVisibility must be used within a ScrollVisibilityProvider"
    );
  }
  return context;
}

/**
 * Hook for screens that don't have the provider (returns no-op functions)
 */
export function useScrollVisibilitySafe() {
  const context = useContext(ScrollVisibilityContext);
  return context;
}
