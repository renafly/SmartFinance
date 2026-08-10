import { useWindowDimensions } from "react-native";

export type PublicBreakpoints = {
  width: number;
  compact: boolean;
  phone: boolean;
};

/**
 * Shared responsive breakpoints for the public marketing pages
 * (Home, Features, How It Works, News, About).
 *
 * Computed directly from `useWindowDimensions()`, with no extra
 * `requestAnimationFrame`/"layoutReady" delay. Home has always worked
 * this way; the sub-pages used to gate `compact`/`phone` behind a
 * post-mount flag, which forced the desktop nav and desktop buttons to
 * render for one frame on mobile-width viewports before snapping into
 * the mobile layout. Using the same direct computation everywhere
 * removes that flash and keeps the header and page body from ever
 * disagreeing about which layout they're in.
 */
export function usePublicBreakpoints(): PublicBreakpoints {
  const { width } = useWindowDimensions();
  return {
    width,
    compact: width < 900,
    phone: width < 600,
  };
}
