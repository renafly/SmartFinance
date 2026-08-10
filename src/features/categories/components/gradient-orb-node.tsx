import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Billboard, Text } from "@react-three/drei";

import { getIoniconsFontUri, iconGlyphFor } from "../ionicons-font";

// Builds a flat, camera-facing circle whose vertex colors blend diagonally
// from the full node color (top-left) to a darker/muted variant
// (bottom-right) — a direct three.js equivalent of the dashboard's older
// node style, which filled each circle with expo-linear-gradient using
// [`${color}FF`, `${color}88`] on the same diagonal. Done as real per-vertex
// color (GPU-interpolated automatically by meshBasicMaterial's
// vertexColors) — deliberately not scene lighting/PBR, since no amount of
// light tuning on a literal sphere reproduces a flat 2-tone gradient disc;
// this instead guarantees the exact same look regardless of camera angle or
// light setup, on native and web alike.
export function useGradientDiscGeometry(radius: number, colorHex: string, backgroundHex: string) {
  return useMemo(() => {
    const geometry = new THREE.CircleGeometry(radius, 32);
    const position = geometry.attributes.position;
    const light = new THREE.Color(colorHex);
    const dark = new THREE.Color(colorHex).lerp(new THREE.Color(backgroundHex), 0.55);
    const colors = new Float32Array(position.count * 3);

    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const t = THREE.MathUtils.clamp((x - y) / (radius * 2) + 0.5, 0, 1);
      const blended = dark.clone().lerp(light, t);
      colors[i * 3] = blended.r;
      colors[i * 3 + 1] = blended.g;
      colors[i * 3 + 2] = blended.b;
    }

    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [radius, colorHex, backgroundHex]);
}

export type GradientOrbNodeProps = {
  id: string;
  position: [number, number, number];
  radius: number;
  color: string;
  rimColor: string;
  backgroundColor: string;
  icon: string;
  label: string;
  labelColor: string;
  fontSize: number;
  isActive: boolean;
  isDimmed: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

// Shared flat, always-camera-facing "coin" node used by every 3D category
// graph in the app (the categories page explorer and the dashboard spend
// network): a solid rim disc behind for a border-ring look, a diagonal
// gradient disc in front (see useGradientDiscGeometry), the category's own
// icon centered on top in the same font @expo/vector-icons uses everywhere
// else, and a name label above. Extracted into one place so a future style
// tweak (rim thickness, gradient angle, glow) applies everywhere at once
// instead of drifting between call sites.
export function GradientOrbNode({
  id,
  position,
  radius,
  color,
  rimColor,
  backgroundColor,
  icon,
  label,
  labelColor,
  fontSize,
  isActive,
  isDimmed,
  onSelect,
  onHover,
}: GradientOrbNodeProps) {
  const iconGlyph = iconGlyphFor(icon);
  const discGeometry = useGradientDiscGeometry(radius, color, backgroundColor);

  const handleClick = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onSelect(id);
  };
  const handlePointerOver = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    onHover(id);
  };
  const handlePointerOut = () => onHover(null);

  return (
    <group position={position}>
      <Billboard>
        <group scale={isActive ? 1.15 : 1}>
          <mesh position={[0, 0, -0.01]} onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
            <circleGeometry args={[radius * 1.14, 32]} />
            <meshBasicMaterial color={rimColor} toneMapped={false} transparent opacity={isDimmed ? 0.3 : 0.9} />
          </mesh>
          <mesh onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
            <primitive object={discGeometry} attach="geometry" />
            <meshBasicMaterial vertexColors toneMapped={false} transparent opacity={isDimmed ? 0.5 : 1} />
          </mesh>
          <Text
            font={getIoniconsFontUri()}
            fontSize={radius * 1.05}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            position={[0, 0, 0.01]}
            fillOpacity={isDimmed ? 0.4 : 1}
          >
            {iconGlyph}
          </Text>
        </group>
      </Billboard>
      <Billboard position={[0, radius + 0.24, 0]}>
        <Text fontSize={fontSize} color={labelColor} anchorX="center" anchorY="bottom" fillOpacity={isDimmed ? 0.35 : 1}>
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

const CAMERA_TRANSITION_SECONDS = 0.9;

// Eases the camera + orbit target toward a newly-selected node, then stops
// touching camera.position after a short settle-in window so the user's own
// scroll/pinch zoom keeps working afterward (see category-graph-scene.tsx's
// original comment for the fuller rationale — this is the same rig,
// generalized to any node shape with a `position`).
export function CameraRig({
  positionsById,
  selectedId,
}: {
  positionsById: Map<string, { position: { x: number; y: number; z: number } }>;
  selectedId: string | null;
}) {
  const targetVec = useRef(new THREE.Vector3());
  const camDest = useRef(new THREE.Vector3());
  const prevSelectedId = useRef<string | null>(null);
  const elapsed = useRef(0);

  useFrame((state, delta) => {
    if (selectedId !== prevSelectedId.current) {
      prevSelectedId.current = selectedId;
      elapsed.current = 0;
    }
    if (!selectedId || elapsed.current >= CAMERA_TRANSITION_SECONDS) return;
    const position = positionsById.get(selectedId)?.position;
    if (!position) return;

    elapsed.current += delta;

    targetVec.current.set(position.x, position.y, position.z);
    let dir = targetVec.current.clone();
    if (dir.lengthSq() < 0.0001) dir = new THREE.Vector3(0, 0, 1);
    dir.normalize();
    camDest.current.copy(targetVec.current).add(dir.multiplyScalar(4.2)).add(new THREE.Vector3(0, 1.6, 0));

    const controls = (state.controls as unknown as { target: THREE.Vector3 } | null) ?? null;
    const ease = 1 - Math.pow(0.001, delta);
    if (controls?.target) controls.target.lerp(targetVec.current, ease);
    state.camera.position.lerp(camDest.current, ease);
  });

  return null;
}
