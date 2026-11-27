import { useState } from "react";
import { Pressable, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import i18n from "@/config/i18n";
import { ThemeProvider } from "@/theme/ThemeProvider";

import { ModalProvider, useDialog } from "./ModalProvider";

jest.mock("@/components/bug-report-fab", () => ({ BugReportFab: () => null }));
jest.setTimeout(60000);

beforeAll(async () => {
  await i18n.changeLanguage("pt");
});

function Harness() {
  const dialog = useDialog();
  const [result, setResult] = useState("none");
  return (
    <>
      <Pressable
        // Not returning the promise: RNTL awaits a handler's promise, and this
        // one only settles once the dialog is answered.
        onPress={() => {
          void (async () => {
            const ok = await dialog.confirm({
              title: "Apagar agregado?",
              message: "Isto não pode ser desfeito.",
              confirmLabel: "Apagar",
              destructive: true,
            });
            setResult(ok ? "confirmed" : "cancelled");
          })();
        }}
      >
        <Text>ask</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void dialog
            .alert({
              title: "Cópia importada",
              message: "3 contas restauradas.",
            })
            .then(() => setResult("acknowledged"));
        }}
      >
        <Text>tell</Text>
      </Pressable>
      <Text>{`result:${result}`}</Text>
    </>
  );
}

async function renderHarness() {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <ThemeProvider>
        <ModalProvider>
          <Harness />
        </ModalProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe("useDialog", () => {
  it("resolves confirm() with true when the confirm button is pressed", async () => {
    await renderHarness();
    await fireEvent.press(screen.getByText("ask"));
    expect(screen.getByText("Apagar agregado?")).toBeTruthy();
    expect(screen.getByText("Isto não pode ser desfeito.")).toBeTruthy();
    await fireEvent.press(screen.getByText("Apagar"));
    expect(await screen.findByText("result:confirmed")).toBeTruthy();
    expect(screen.queryByText("Apagar agregado?")).toBeNull();
  });

  it("resolves confirm() with false when cancelled", async () => {
    await renderHarness();
    await fireEvent.press(screen.getByText("ask"));
    await fireEvent.press(screen.getByText("Cancelar"));
    expect(await screen.findByText("result:cancelled")).toBeTruthy();
  });

  it("shows an alert() and resolves once it is acknowledged", async () => {
    await renderHarness();
    await fireEvent.press(screen.getByText("tell"));
    expect(screen.getByText("Cópia importada")).toBeTruthy();
    await fireEvent.press(screen.getByText("OK"));
    expect(await screen.findByText("result:acknowledged")).toBeTruthy();
  });
});
