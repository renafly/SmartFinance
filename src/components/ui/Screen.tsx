import { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";

type Props = {
  children: ReactNode;
};

export default function Screen({ children }: Props) {
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    backgroundColor: "#f8fafc",
  },
});