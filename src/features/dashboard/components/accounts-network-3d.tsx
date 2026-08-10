import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line } from 'react-native-svg';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { typography } from '@/theme/typography';
import { formatCurrency } from '@/components/migrated-page';
import { displayCurrency } from '@/shared/lib/mask-currency';
import { usePrivacyStore } from '@/stores/privacyStore';

import type { AccountNetworkNode } from '../network-data';

type AccountsNetwork3DProps = {
  nodes: AccountNetworkNode[];
  totalLabel: string;
  totalValue: number;
};

// Real 3D: each account sits on a sphere around the household hub (a
// Fibonacci-sphere layout keeps them evenly spread instead of clumping at
// the poles). Every animation frame we rotate those points with an actual
// rotation matrix and run a perspective projection down to 2D screen
// coordinates, so nodes genuinely get smaller/dimmer as they swing to the
// back of the sphere. No WebGL involved — this app has no three.js/expo-gl
// dependency installed, so the "camera" is plain trigonometry driving
// View/Svg positions instead of a rendered mesh.
function fibonacciSphere(count: number) {
  const points: { x: number; y: number; z: number }[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i += 1) {
    const y = count <= 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    points.push({ x: Math.cos(theta) * radiusAtY, y, z: Math.sin(theta) * radiusAtY });
  }

  return points;
}

export function AccountsNetwork3D({ nodes, totalLabel, totalValue }: AccountsNetwork3DProps) {
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const reduceMotion = useReducedMotion();
  const [containerSize, setContainerSize] = useState(0);
  const [rotation, setRotation] = useState({ x: -0.25, y: 0 });
  const rotationRef = useRef(rotation);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const hubPulse = useSharedValue(0);

  useEffect(() => {
    hubPulse.value = withRepeat(withSequence(withTiming(1, { duration: 1500 }), withTiming(0, { duration: 1500 })), -1, false);
  }, [hubPulse]);

  const hubStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + hubPulse.value * 0.05 }] }));

  useEffect(() => {
    if (reduceMotion) return;
    let raf: number;
    let lastTime = Date.now();

    const tick = () => {
      const now = Date.now();
      const delta = now - lastTime;
      lastTime = now;

      if (!isDraggingRef.current) {
        rotationRef.current = { x: rotationRef.current.x, y: rotationRef.current.y + delta * 0.00025 };
        setRotation(rotationRef.current);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  // PanResponder.create is a one-time, imperative construction — its handlers
  // are only ever invoked later by the gesture system in response to real
  // touch events, never synchronously during this render. The compiler's
  // ref-safety rules can't verify that for an imperative API like this one,
  // so the two lint rules below are disabled for this specific call.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const panResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          isDraggingRef.current = true;
          dragStartRef.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
        },
        onPanResponderMove: (event) => {
          if (!dragStartRef.current) return;
          const dx = event.nativeEvent.pageX - dragStartRef.current.x;
          const dy = event.nativeEvent.pageY - dragStartRef.current.y;
          dragStartRef.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
          const nextX = Math.max(-1, Math.min(0.6, rotationRef.current.x - dy * 0.01));
          const nextY = rotationRef.current.y + dx * 0.01;
          rotationRef.current = { x: nextX, y: nextY };
          setRotation(rotationRef.current);
        },
        onPanResponderRelease: () => {
          isDraggingRef.current = false;
          dragStartRef.current = null;
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          dragStartRef.current = null;
        },
      }),
    [],
  );

  const spherePoints = useMemo(() => fibonacciSphere(nodes.length), [nodes.length]);
  const maxValue = Math.max(1, ...nodes.map((node) => Math.abs(node.value)));

  const size = containerSize || 1;
  const center = size / 2;
  const sphereRadius = size * 0.34;
  const focalLength = sphereRadius * 2.4;

  const projected = useMemo(() => {
    const cosY = Math.cos(rotation.y);
    const sinY = Math.sin(rotation.y);
    const cosX = Math.cos(rotation.x);
    const sinX = Math.sin(rotation.x);

    return nodes.map((node, index) => {
      const point = spherePoints[index] ?? { x: 0, y: 0, z: 1 };
      const px = point.x * sphereRadius;
      const py = point.y * sphereRadius;
      const pz = point.z * sphereRadius;

      // Yaw (around Y axis), then pitch (around X axis).
      const x1 = px * cosY + pz * sinY;
      const z1 = -px * sinY + pz * cosY;
      const y1 = py * cosX - z1 * sinX;
      const z2 = py * sinX + z1 * cosX;

      const scale = focalLength / (focalLength + z2);
      const nodeBaseSize = spacing(8) + (Math.abs(node.value) / maxValue) * spacing(4);

      return {
        node,
        screenX: center + x1 * scale,
        screenY: center + y1 * scale,
        scale,
        depth: z2,
        nodeSize: nodeBaseSize * scale,
      };
    });
  }, [center, focalLength, maxValue, nodes, rotation.x, rotation.y, sphereRadius, spherePoints]);

  const sortedByDepth = useMemo(() => [...projected].sort((a, b) => a.depth - b.depth), [projected]);
  const minScale = focalLength / (focalLength + sphereRadius);
  const maxScale = focalLength / (focalLength - sphereRadius);

  return (
    <View style={{ gap: spacing(3) } as any}>
      <View
        onLayout={(event) => setContainerSize(Math.min(event.nativeEvent.layout.width, spacing(115)))}
        style={{ width: '100%' } as any}
      >
        {containerSize > 0 ? (
          <View
            {...panResponder.panHandlers}
            style={{ width: size, height: size, alignSelf: 'center', position: 'relative', overflow: 'hidden' } as any}
          >
            <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 } as any}>
              {sortedByDepth.map(({ node, screenX, screenY, scale }) => (
                <Line
                  key={node.id}
                  x1={center}
                  y1={center}
                  x2={screenX}
                  y2={screenY}
                  stroke={node.color}
                  strokeWidth={Math.max(0.75, scale * 1.75)}
                  strokeOpacity={Math.max(0.15, Math.min(0.6, (scale - minScale) / (maxScale - minScale)))}
                  strokeLinecap="round"
                />
              ))}
            </Svg>

            <View style={{ position: 'absolute', left: center - spacing(10), top: center - spacing(10), width: spacing(20), alignItems: 'center', zIndex: 500 } as any}>
              <Animated.View style={hubStyle}>
                <LinearGradient
                  colors={[colors.gradientFrom ?? colors.primary, colors.gradientTo ?? colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: spacing(20),
                    height: spacing(20),
                    borderRadius: radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: colors.glow ?? colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.55,
                    shadowRadius: 18,
                    elevation: 10,
                  } as any}
                >
                  <Ionicons name="home" size={18} color="#FFFFFF" />
                </LinearGradient>
              </Animated.View>
            </View>

            {sortedByDepth.map(({ node, screenX, screenY, scale, nodeSize }) => {
              const opacity = Math.max(0.4, Math.min(1, (scale - minScale) / (maxScale - minScale) * 0.7 + 0.3));
              const zIndex = Math.round(scale * 1000);

              return (
                <View
                  key={node.id}
                  style={{
                    position: 'absolute',
                    left: screenX - nodeSize / 2,
                    top: screenY - nodeSize / 2,
                    width: nodeSize,
                    alignItems: 'center',
                    opacity,
                    zIndex,
                  } as any}
                >
                  <LinearGradient
                    colors={[`${node.color}FF`, `${node.color}88`]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: nodeSize,
                      height: nodeSize,
                      borderRadius: radius.full,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: node.color,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 4,
                      borderWidth: 1.5,
                      borderColor: colors.surface,
                    } as any}
                  >
                    <Ionicons name={node.icon} size={Math.max(10, Math.round(nodeSize * 0.4))} color="#FFFFFF" />
                  </LinearGradient>
                  {scale > minScale + (maxScale - minScale) * 0.35 ? (
                    <>
                      <Text numberOfLines={1} style={{ marginTop: spacing(0.5), color: colors.text, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.bold), maxWidth: nodeSize * 2.6, textAlign: 'center' } as any}>
                        {node.label}
                      </Text>
                      <Text numberOfLines={1} style={{ color: colors.textSecondary, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.semibold), maxWidth: nodeSize * 2.6, textAlign: 'center' } as any}>
                        {node.sublabel}
                      </Text>
                      <Text numberOfLines={1} style={{ color: node.color, fontSize: typography.fontSize[12], fontWeight: String(typography.fontWeight.extraBold), maxWidth: nodeSize * 2.6, textAlign: 'center' } as any}>
                        {displayCurrency(formatCurrency(node.value), hideValues)}
                      </Text>
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1.5) } as any}>
        <Ionicons name="sync-outline" size={13} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize[12] } as any}>
          {totalLabel}: {displayCurrency(formatCurrency(totalValue), hideValues)}
        </Text>
      </View>
    </View>
  );
}
