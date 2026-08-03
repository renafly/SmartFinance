import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type AttachmentPreviewProps = {
  uri: string;
  mimeType: string;
  fileName: string;
  previewLabel: string;
  openLabel: string;
};

export function AttachmentPreview({
  uri,
  mimeType,
  fileName,
  previewLabel,
  openLabel,
}: AttachmentPreviewProps) {
  const { colors } = useTheme();
  const isImage = mimeType.startsWith("image/");

  if (isImage) {
    return (
      <View
        accessible
        accessibilityLabel={`${previewLabel}: ${fileName}`}
        style={[
          styles.frame,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Image
          source={{ uri }}
          resizeMode="contain"
          accessibilityLabel={fileName}
          style={styles.image}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.document,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Ionicons name="document-text-outline" size={32} color={colors.primary} />
      <View style={styles.documentDetails}>
        <Text
          numberOfLines={2}
          style={{
            color: colors.text,
            fontWeight: typography.fontWeight.semibold as any,
          }}
        >
          {fileName}
        </Text>
        <Text style={{ color: colors.textSecondary }}>{previewLabel}</Text>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${openLabel}: ${fileName}`}
        onPress={() => void Linking.openURL(uri)}
        style={({ pressed }) => [
          styles.openButton,
          { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Ionicons
          name={Platform.OS === "web" ? "open-outline" : "eye-outline"}
          size={18}
          color={colors.primaryForeground}
        />
        <Text
          style={{
            color: colors.primaryForeground,
            fontWeight: typography.fontWeight.semibold as any,
          }}
        >
          {openLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    height: 220,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  document: {
    width: "100%",
    minHeight: 92,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing(2),
    gap: spacing(2),
    alignItems: "center",
    flexDirection: "row",
  },
  documentDetails: {
    flex: 1,
    gap: spacing(0.5),
  },
  openButton: {
    borderRadius: radius.md,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(1),
  },
});
