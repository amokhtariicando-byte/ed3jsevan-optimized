import React from 'react';

/**
 * Splash / loading screen: the arch logo draws itself (stroke animation),
 * steam floats above the cup, and the "EYVAN CAFE & RESTAURANT" line fades up.
 * Uses a zero-blur radial gradient halo instead of animated blur-2xl so
 * initial load stays 60fps on low-end mobile GPUs.
 */

const EyvanSplashLogo: React.FC<{ animated: boolean }> = ({ animated }) => (
  <svg
    viewBox="0 0 200 265"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="h-full w-full"
    aria-hidden="true"
  >
    {/* Architectural Eyvan arch */}
    <path
      d="M22 152 V82 C22 39 57 8 100 8 C143 8 178 39 178 82 V128"
      stroke="currentColor"
      strokeWidth="6.5"
      strokeLinecap="round"
      className={animated ? 'eyvan-draw-arch' : ''}
    />

    {/* Warm steam above the coffee cup */}
    <g
      className="eyvan-splash-steam"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
    >
      <path d="M35 154 C32 149 38 144 35 138" />
      <path d="M45 153 C42 147 48 142 45 136" />
      <path d="M55 154 C52 149 58 144 55 138" />
    </g>

    {/* Coffee cup attached to the baseline */}
    <path
      d="M22 166 H66 C66 181 56 190 44 190 C32 190 22 181 22 166 Z"
      stroke="currentColor"
      strokeWidth="5.5"
      strokeLinejoin="round"
    />
    <path
      d="M66 169 C75 169 77 181 66 182"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    />

    {/* Central leaf with organic veins */}
    <path
      d="M98 190 C76 182 70 156 76 124 C81 98 92 73 98 58 C105 74 116 99 121 125 C127 157 120 182 103 190"
      stroke="currentColor"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M99 188 C99 162 86 142 86 121 C86 105 97 96 107 84"
      stroke="currentColor"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    <path
      d="M100 176 C111 164 114 146 107 131 C102 142 100 156 100 176"
      stroke="currentColor"
      strokeWidth="4.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M92 144 C87 134 86 121 89 108"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />

    {/* Continuous baseline from under the cup to the fork and bottom frame */}
    <path
      d="M22 204 V196 C22 191 27 190 34 190 H89 C95 190 98 187 98 182"
      stroke="currentColor"
      strokeWidth="5.2"
      strokeLinecap="round"
    />
    <path
      d="M103 182 C103 188 107 190 113 190 H135 C140 190 142 186 142 180 V157 C142 152 138 148 138 140 V126"
      stroke="currentColor"
      strokeWidth="5.2"
      strokeLinecap="round"
    />

    {/* Fork */}
    <path
      d="M145 126 V140 M152 126 V140 C152 148 148 152 148 158 V186 C148 189 146 191 143 191"
      stroke="currentColor"
      strokeWidth="4.8"
      strokeLinecap="round"
    />

    {/* Spoon */}
    <ellipse
      cx="169"
      cy="139"
      rx="9"
      ry="13.5"
      stroke="currentColor"
      strokeWidth="5.2"
    />
    <path
      d="M166 153 V186 C166 191 172 191 172 186 V153"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinecap="round"
    />

    {/* Persian wordmark «ایوان» */}
    <text
      x="100"
      y="232"
      textAnchor="middle"
      fill="currentColor"
      fontFamily="Vazirmatn, sans-serif"
      fontWeight="600"
      fontSize="42"
      letterSpacing="0"
    >
      ایوان
    </text>
    {/* Subtitle «کافه و رستوران» */}
    <text
      x="100"
      y="254"
      textAnchor="middle"
      fill="currentColor"
      fontFamily="Vazirmatn, sans-serif"
      fontWeight="600"
      fontSize="16"
      opacity="0.92"
    >
      کافه و رستوران
    </text>
  </svg>
);

interface SplashScreenProps {
  leaving?: boolean;
  compact?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  leaving = false,
  compact = false,
}) => {
  if (compact) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[#F8F7F2]"
        role="status"
        aria-label="در حال بارگذاری"
      >
        <div className="eyvan-soft-pulse h-24 w-[72px] text-[#6B7043]">
          <EyvanSplashLogo animated={false} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F8F7F2] transition-[opacity,transform] duration-400 ease-out will-change-[opacity,transform] ${
        leaving ? 'pointer-events-none scale-105 opacity-0' : ''
      }`}
      role="status"
      aria-label="در حال بارگذاری منوی کافه ایوان"
    >
      <div className="relative flex flex-col items-center">
        {/* Zero-blur soft depth halo behind the logo (replaces expensive blur-2xl) */}
        <div
          aria-hidden="true"
          className="eyvan-soft-pulse pointer-events-none absolute -inset-14 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(107, 112, 67, 0.14) 0%, rgba(107, 112, 67, 0.05) 45%, rgba(107, 112, 67, 0) 72%)',
          }}
        />
        <div className="relative h-44 w-32 text-[#6B7043]">
          <EyvanSplashLogo animated />
        </div>
        <div
          className="eyvan-fade-up mt-4 flex items-center gap-2 text-xs tracking-widest text-[#6B7043]/80 uppercase"
          style={{ animationDelay: '0.12s' }}
        >
          <span className="h-[1px] w-5 bg-current opacity-50" />
          <span>EYVAN CAFE &amp; RESTAURANT</span>
          <span className="h-[1px] w-5 bg-current opacity-50" />
        </div>
      </div>
    </div>
  );
};
