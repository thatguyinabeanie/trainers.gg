// Polyfills for APIs missing in React Native's Hermes engine.
//
// Import this file as early as possible in the app entry point
// (before any library that might use these APIs).

// AbortSignal.timeout() — used by @atproto/oauth-client internally.
// Hermes does not implement this static method.
if (typeof AbortSignal.timeout !== "function") {
  AbortSignal.timeout = (ms: number): AbortSignal => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException("TimeoutError")), ms);
    return controller.signal;
  };
}
