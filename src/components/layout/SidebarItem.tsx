import { Link, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

type Props = {
  href: string;
  title: string;
  icon: any;
};

export default function SidebarItem({
  href,
  title,
  icon: Icon,
}: Props) {
  const pathname = usePathname();

  const active =
    pathname === href ||
    (href === "/" && pathname === "/");

  return (
    <Link href={href as any} asChild>
      <Pressable
        style={StyleSheet.flatten([
          styles.item,
          active && styles.active,
        ])}
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
    </Link>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 6,
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