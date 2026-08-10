import { View } from "react-native";
import { Canvas } from "@react-three/fiber";

import { CategorySpendGraphScene } from "./category-spend-graph-scene";
import type { CategorySpendNode } from "../network-data";

type CategorySpendGraphCanvasProps = {
  nodes: CategorySpendNode[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  backgroundColor: string;
  inkColor: string;
  mutedColor: string;
  accentColor: string;
  rimColor: string;
  autoRotate?: boolean;
};

// Web entry point — see category-graph-canvas.web.tsx for why this is a
// separate file from the native variant.
export function CategorySpendGraphCanvas(props: CategorySpendGraphCanvasProps) {
  return (
    <View style={{ flex: 1 }}>
      <Canvas
        camera={{ position: [6, 5, 8], fov: 45, near: 0.1, far: 200 }}
        dpr={[1, 2]}
        onPointerMissed={() => props.onSelect(null)}
      >
        <CategorySpendGraphScene {...props} />
      </Canvas>
    </View>
  );
}
