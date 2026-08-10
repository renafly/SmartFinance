import { useMemo } from "react";
import { Line, OrbitControls } from "@react-three/drei";

import type { CategorySpendNode } from "../network-data";
import { CameraRig, GradientOrbNode } from "./gradient-orb-node";

type PositionedSpendNode = {
  node: CategorySpendNode;
  position: { x: number; y: number; z: number };
  radius: number;
};

const HUB_POSITION: [number, number, number] = [0, 0, 0];
const RING_RADIUS = 3.6;
const MIN_NODE_RADIUS = 0.22;
const MAX_NODE_RADIUS = 0.7;

// Bubble-chart convention: map spend to radius via sqrt rather than
// linearly, so perceived AREA — what the eye actually reads as "size" —
// scales with the amount spent. A category spending 4x another then looks
// roughly 2x the radius (4x the area), not 4x the radius (16x the area),
// which is what pure linear scaling would produce and would make anything
// short of the top category nearly invisible. Clamped to a min/max range
// on top of that so one dominant category still can't shrink everything
// else to an indistinguishable dot, and the smallest real spend still
// reads clearly larger than "nothing".
function radiusForSpend(value: number, maxValue: number) {
  const t = maxValue > 0 ? Math.sqrt(Math.max(0, value) / maxValue) : 0;
  return MIN_NODE_RADIUS + t * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);
}

// Evenly spreads points across a sphere's surface (used for the dashboard's
// account network too) — good enough distribution for a modest node count
// without the angular clustering a naive lat/long grid would produce.
function fibonacciSpherePositions(count: number, ringRadius: number) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const positions: { x: number; y: number; z: number }[] = [];

  for (let i = 0; i < count; i += 1) {
    const y = count <= 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    positions.push({
      x: Math.cos(theta) * radiusAtY * ringRadius,
      y: y * ringRadius * 0.7,
      z: Math.sin(theta) * radiusAtY * ringRadius,
    });
  }

  return positions;
}

type CategorySpendGraphSceneProps = {
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

// Dashboard's expense-category spend graph — same flat gradient-disc node
// style as the categories page explorer (see gradient-orb-node.tsx), just
// with a simpler layout: no type/main/sub hierarchy here, so nodes fan out
// evenly around a single hub instead of a radial tree, and each node's size
// reflects how much was spent instead of its depth.
export function CategorySpendGraphScene({
  nodes,
  selectedId,
  hoverId,
  onSelect,
  onHover,
  backgroundColor,
  inkColor,
  mutedColor,
  accentColor,
  rimColor,
  autoRotate,
}: CategorySpendGraphSceneProps) {
  const activeId = hoverId ?? selectedId;
  const maxValue = Math.max(1, ...nodes.map((node) => Math.abs(node.value)));

  const positioned = useMemo<PositionedSpendNode[]>(() => {
    const positions = fibonacciSpherePositions(nodes.length, RING_RADIUS);
    return nodes.map((node, index) => ({
      node,
      position: positions[index] ?? { x: 0, y: 0, z: RING_RADIUS },
      radius: radiusForSpend(Math.abs(node.value), maxValue),
    }));
  }, [nodes, maxValue]);

  const positionsById = useMemo(() => new Map(positioned.map((entry) => [entry.node.id, entry])), [positioned]);

  return (
    <>
      {/* No scene lights: every material here is an unlit meshBasicMaterial
          (see gradient-orb-node.tsx) so colors render exactly as given
          regardless of camera angle. */}
      <color attach="background" args={[backgroundColor]} />

      <CameraRig positionsById={positionsById} selectedId={selectedId} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={30}
        autoRotate={!!autoRotate}
        autoRotateSpeed={1.1}
        target={[0, 0, 0]}
      />

      {/* Hub: an unlabeled, non-interactive point that grounds the spend
          nodes, matching the earlier dashboard network's hub-and-spoke feel
          without implying a specific account/category of its own. */}
      <mesh position={HUB_POSITION}>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshBasicMaterial color={accentColor} toneMapped={false} />
      </mesh>

      {positioned.map(({ node, position }) => {
        const isConn = node.id === activeId;
        return (
          <Line
            key={`spoke-${node.id}`}
            points={[HUB_POSITION, [position.x, position.y, position.z]]}
            color={isConn ? accentColor : mutedColor}
            lineWidth={isConn ? 1.6 : 1}
            transparent
            opacity={isConn ? 0.85 : 0.35}
          />
        );
      })}

      {positioned.map(({ node, position, radius }) => (
        <GradientOrbNode
          key={node.id}
          id={node.id}
          position={[position.x, position.y, position.z]}
          radius={radius}
          color={node.id === activeId ? accentColor : node.color}
          rimColor={rimColor}
          backgroundColor={backgroundColor}
          icon={node.icon}
          label={node.label}
          labelColor={node.id === activeId ? accentColor : inkColor}
          fontSize={Math.max(0.16, radius * 0.85)}
          isActive={node.id === activeId}
          isDimmed={false}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </>
  );
}
