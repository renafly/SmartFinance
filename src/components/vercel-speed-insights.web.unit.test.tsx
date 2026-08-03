import { render, screen } from "@testing-library/react-native";
import { useCookieConsent } from "@/features/cookie-consent/core";
import { VercelSpeedInsights } from "./vercel-speed-insights.web";

jest.mock("@/features/cookie-consent/core", () => ({
  useCookieConsent: jest.fn(),
}));

jest.mock("@vercel/speed-insights/react", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SpeedInsights: () =>
      React.createElement(View, { testID: "speed-insights" }),
  };
});

const mockUseCookieConsent = useCookieConsent as jest.Mock;

describe("VercelSpeedInsights", () => {
  it("does not mount analytics before consent", async () => {
    mockUseCookieConsent.mockReturnValue({ consent: null });

    await render(<VercelSpeedInsights />);

    expect(screen.queryByTestId("speed-insights")).toBeNull();
  });

  it("does not mount analytics after analytics is rejected", async () => {
    mockUseCookieConsent.mockReturnValue({
      consent: { analytics: false },
    });

    await render(<VercelSpeedInsights />);

    expect(screen.queryByTestId("speed-insights")).toBeNull();
  });

  it("mounts analytics only after analytics is accepted", async () => {
    mockUseCookieConsent.mockReturnValue({
      consent: { analytics: true },
    });

    await render(<VercelSpeedInsights />);

    expect(screen.getByTestId("speed-insights")).toBeTruthy();
  });
});
