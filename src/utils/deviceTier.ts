import { prefersReducedMotion } from './motion';

export type PerformanceTier = 'high' | 'balanced' | 'lite';

export interface DeviceProfile {
  tier: PerformanceTier;
  saveData: boolean;
  /** Max ring distance for standing 3D cutouts on mobile (1 = 3 front glasses, 2 = 5 glasses) */
  maxMobileRingDist: number;
  /** Whether idle preloading of off-screen assets/chunks should run */
  allowIdlePreload: boolean;
  /** Whether decorative infinite steam animation should mount */
  enableSteam: boolean;
  /** Whether overlapping text crossfade layers should animate */
  enableCrossfade: boolean;
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

let cachedProfile: DeviceProfile | null = null;

/**
 * Inspects device hardware & network hints (RAM, CPU cores, Save-Data, 2G/3G,
 * reduced-motion) once and classifies the client into high / balanced / lite.
 */
export function getDeviceProfile(): DeviceProfile {
  if (cachedProfile) return cachedProfile;

  if (typeof navigator === 'undefined') {
    cachedProfile = {
      tier: 'high',
      saveData: false,
      maxMobileRingDist: 2,
      allowIdlePreload: true,
      enableSteam: true,
      enableCrossfade: true,
    };
    return cachedProfile;
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: NetworkInformationLike;
    mozConnection?: NetworkInformationLike;
    webkitConnection?: NetworkInformationLike;
  };

  const memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8;
  const cores =
    typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 8;
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
  const saveData = Boolean(conn?.saveData);
  const slowNet =
    conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g';
  const mediumNet = conn?.effectiveType === '3g';
  const reduced = prefersReducedMotion();

  let tier: PerformanceTier = 'high';
  if (reduced || saveData || slowNet || memory <= 2 || cores <= 2) {
    tier = 'lite';
  } else if (mediumNet || memory <= 4 || cores <= 4) {
    tier = 'balanced';
  }

  cachedProfile = {
    tier,
    saveData: saveData || slowNet,
    maxMobileRingDist: tier === 'lite' ? 1 : 2,
    allowIdlePreload: !saveData && !slowNet,
    enableSteam: tier !== 'lite',
    enableCrossfade: tier !== 'lite',
  };

  return cachedProfile;
}
