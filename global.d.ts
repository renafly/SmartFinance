declare module "*.css";

// No @types/react-dom in this project (react-native-web apps normally
// don't need it), but the web-only date picker portals its popover to
// <body> via react-dom's createPortal. Minimal ambient typing so that
// stays type-safe without pulling in the full react-dom type package.
declare module "react-dom" {
  import type { ReactNode, ReactPortal } from "react";

  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
    key?: string | null,
  ): ReactPortal;
}
