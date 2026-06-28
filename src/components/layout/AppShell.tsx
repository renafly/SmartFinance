import { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type Props = {
  children: ReactNode;
};

export default function AppShell({ children }: Props) {
  const { width } = useWindowDimensions();

  const desktop = width >= 1024;

  return (
    <View style={styles.container}>
      {desktop && <Sidebar />}

      <View style={styles.content}>
        {!desktop && <TopBar />}

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f8fafc",
  },

  content: {
    flex: 1,
  },
});