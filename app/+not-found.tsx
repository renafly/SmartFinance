import { Stack } from "expo-router";

export default function NotFound() {
  return (
    <Stack.Screen
      options={{
        title: "Not Found",
      }}
    />
  );
}