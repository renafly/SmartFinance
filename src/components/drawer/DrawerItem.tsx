import { usePathname, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  title: string;
  href: string;
  icon: any;
};

export default function DrawerItem({
  title,
  href,
  icon: Icon,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const active = pathname === href;

  return (
    <Pressable
      onPress={() => router.push(href as any)}
      style={[
        styles.item,
        active && styles.active,
      ]}
    >
      <Icon
        size={20}
        color={active ? "#2563eb" : "#64748b"}
      />

      <Text
        style={[
          styles.text,
          active && styles.activeText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 12,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
  },

  active: {
    backgroundColor: "#eff6ff",
  },

  text: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "500",
  },

  activeText: {
    color: "#2563eb",
    fontWeight: "700",
  },
});