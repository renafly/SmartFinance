import { StyleSheet, Text, View } from "react-native";
import GoogleSignInButton from "./google-sign-in-button";

export function GoogleLoginScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>SmartFinance</Text>
        <Text style={styles.title}>Sign in with Google</Text>
        <Text style={styles.subtitle}>
          When you are not logged in, this is the only entry point.
        </Text>
      </View>

      <View style={styles.card}>
        <GoogleSignInButton />
        <Text style={styles.caption}>Google signs you in through Supabase so the app can load your session.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#07111F",
    gap: 20,
  },
  hero: {
    gap: 8,
  },
  kicker: {
    color: "#7DD3FC",
    textTransform: "uppercase",
    letterSpacing: 1.6,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "800",
  },
  subtitle: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#0F172A",
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "#1E293B",
  },
  caption: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 18,
  },
});
