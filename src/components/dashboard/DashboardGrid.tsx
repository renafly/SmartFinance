import { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

type Props = {
  left: ReactNode;
  right: ReactNode;
};

export default function DashboardGrid({ left, right }: Props) {
  const { width } = useWindowDimensions();

  const mobile = width < 900;

  if (mobile) {
    return (
      <>
        {left}
        {right}
      </>
    );
  }

  return (
    <View style={styles.row}>
      <View style={styles.column}>{left}</View>

      <View style={styles.column}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 20,
  },

  column: {
    flex: 1,
  },
});