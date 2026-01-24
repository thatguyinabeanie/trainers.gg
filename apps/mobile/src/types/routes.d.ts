/**
 * Typed Routes for Expo Router
 *
 * This file provides type definitions for the app's routes.
 * These types are used until the auto-generated types from
 * .expo/types are available (after running the dev server).
 */

// Extend the ExpoRouter namespace to provide route types
declare global {
  namespace ExpoRouter {
    interface __routes {
      // Static routes
      StaticRoutes:
        | "/"
        | "/(tabs)"
        | "/(tabs)/home"
        | "/(tabs)/explore"
        | "/(tabs)/profile"
        | "/(tabs)/settings"
        | "/(auth)/sign-in"
        | "/(auth)/sign-up";

      // Dynamic routes
      DynamicRoutes: `/organizations/${string}`;

      // Full route type union
      DynamicRouteTemplate: "/organizations/[slug]";
    }
  }
}

export {};
