/**
 * Pure 3D camera & circular turntable projection math shared between the CSS 3D
 * rotating alabaster-marble tabletop and the standing eye-level drink cutouts.
 *
 * Guarantees pixel-exact locking between each drink's base and its coaster on
 * the rotating marble table across every frame of camera descent and rotation.
 */

export interface TableProjectionInput {
  /** Perspective distance in pixels (must match CSS `perspective(${perspectivePx}px)`) */
  perspectivePx: number;
  /** Viewport X center of the circular tabletop in pixels */
  tableCenterX: number;
  /** Viewport Y center of the circular tabletop in pixels */
  tableCenterY: number;
  /** Radius of the drink ring on the unscaled tabletop in pixels */
  ringRadiusPx: number;
  /** Uniform table scale factor */
  tableScale: number;
  /** Camera pitch tilt in degrees: 0 = straight overhead, ~71 = eye-level front */
  pitchDeg: number;
  /** Current continuous turntable rotation angle in degrees */
  wheelAngleDeg: number;
  /** Static angular slot of this drink around the ring (0 = 12 o'clock, 180 = 6 o'clock) */
  slotAngleDeg: number;
}

export interface ProjectedSeat {
  /** Exact screen X coordinate of the coaster center */
  screenX: number;
  /** Exact screen Y coordinate of the coaster center */
  screenY: number;
  /** Perspective foreshortening multiplier at this seat's 3D depth */
  perspScale: number;
  /** 3D depth relative to table center (+ = front closest to camera, - = rear away from camera) */
  depthZ: number;
  /** Normalized depth in [-1, 1]: +1 is dead-front (6 o'clock), -1 is dead-back (12 o'clock) */
  frontness: number;
  /** Painter's order z-index guaranteed strictly monotonic with depthZ */
  zIndex: number;
}

/**
 * Projects a drink seat on the rotating tilted circular tabletop into exact 2D viewport
 * coordinates matching `perspective(P) rotateX(pitch) scale(s)` + child `rotateZ(wheel)`.
 */
export function projectTableSeat(input: TableProjectionInput): ProjectedSeat {
  const {
    perspectivePx,
    tableCenterX,
    tableCenterY,
    ringRadiusPx,
    tableScale,
    pitchDeg,
    wheelAngleDeg,
    slotAngleDeg,
  } = input;

  const totalRad = ((slotAngleDeg + wheelAngleDeg) * Math.PI) / 180;
  const scaledR = ringRadiusPx * tableScale;

  // CSS screen coords: +X right, +Y down; 0deg = top (0, -R), 180deg = front bottom (0, +R)
  const localX = Math.sin(totalRad) * scaledR;
  const localY = -Math.cos(totalRad) * scaledR;

  const pitchRad = (pitchDeg * Math.PI) / 180;
  const rotX = localX;
  const rotY = localY * Math.cos(pitchRad);
  const rotZ = localY * Math.sin(pitchRad);

  const denom = Math.max(240, perspectivePx - rotZ);
  const perspScale = perspectivePx / denom;

  const screenX = tableCenterX + rotX * perspScale;
  const screenY = tableCenterY + rotY * perspScale;

  // frontness = +1 when seat is at frontmost 6-o'clock rim (localY = +scaledR), -1 at 12-o'clock
  const frontness = scaledR > 0 ? Math.max(-1, Math.min(1, localY / scaledR)) : 1;

  const zIndex = Math.round(rotZ + 2000);

  return {
    screenX,
    screenY,
    perspScale,
    depthZ: rotZ,
    frontness,
    zIndex,
  };
}

/**
 * Smooth cubic ease-out helper for snappy yet weighty turntable spins.
 */
export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Cinematic S-curve ease for smooth crane-like 3D camera descent and ascent.
 */
export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/**
 * Tactile quartic ease-out for Lazy Susan turntable spins with natural deceleration.
 */
export function easeOutQuart(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 4);
}
