import { SpeedInsights } from "@vercel/speed-insights/react";
import { useCookieConsent } from "@/features/cookie-consent";

export function VercelSpeedInsights() {
  const { consent } = useCookieConsent();

  if (consent?.analytics !== true) return null;

  return <SpeedInsights />;
}
