import React from 'react';

interface EyvanLogoProps {
  variant?: 'header' | 'full' | 'mark';
  tone?: 'gold' | 'olive' | 'ivory' | 'navy';
  className?: string;
}

const TONE_COLOR = {
  gold: '#B5945B',
  olive: '#9AA16A',
  ivory: '#2F321C',
  navy: '#6B7043',
} as const;

/**
 * Faithful geometric vector rendition of the official Eyvan Cafe & Restaurant studio logo
 * (Persian architectural arch, central botanical leaf, steaming cup on left, fork & spoon on right,
 * and geometric Persian wordmark "ایوان کافه و رستوران").
 */
export const EyvanLogo: React.FC<EyvanLogoProps> = ({
  variant = 'header',
  tone = 'gold',
  className = '',
}) => {
  const strokeColor = TONE_COLOR[tone];

  const archEmblem = (
    <svg
      viewBox="0 0 120 138"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={
        variant === 'header'
          ? 'h-10 w-9 shrink-0'
          : variant === 'mark'
            ? 'h-11 w-10 shrink-0'
            : 'h-20 w-[72px] shrink-0'
      }
    >
      {/* Architectural Eyvan Semi-Circular Arch */}
      <path
        d="M14 96V54C14 28.595 34.595 8 60 8C85.405 8 106 28.595 106 54V96"
        stroke={strokeColor}
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left Steaming Coffee Cup */}
      <path
        d="M14 103H42C42 113.5 34.5 119 25.5 119C17.5 119 14 113 14 103Z"
        stroke={strokeColor}
        strokeWidth="3.6"
        strokeLinejoin="round"
      />
      <path
        d="M42 106H46.5C49.5 106 51.5 108 51.5 110.5C51.5 113 49.5 115 46.5 115H41"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Three Steam Wisps */}
      <path
        d="M21 96C19.5 92.5 22.5 90 21 86.5M28 96C26.5 92.5 29.5 90 28 86.5M35 96C33.5 92.5 36.5 90 35 86.5"
        stroke={strokeColor}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Saucer Base Line */}
      <path
        d="M14 126H46"
        stroke={strokeColor}
        strokeWidth="3.6"
        strokeLinecap="round"
      />

      {/* Central Botanical Leaf / Coffee Plant Motif */}
      <path
        d="M60 36C49 54 44 74 48 96C51 108 56 116 60 124C64 116 69 108 72 96C76 74 71 54 60 36Z"
        stroke={strokeColor}
        strokeWidth="3.8"
        strokeLinejoin="round"
      />
      <path
        d="M60 44V124"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M60 66L52 58M60 82L50 74M60 98L52 91M60 72L68 64M60 88L70 80M60 104L68 96"
        stroke={strokeColor}
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Right Fork */}
      <path
        d="M84 82V96C84 100 87 102 90 102C93 102 96 100 96 96V82M90 82V126"
        stroke={strokeColor}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right Spoon */}
      <ellipse
        cx="105"
        cy="91"
        rx="4.6"
        ry="9"
        stroke={strokeColor}
        strokeWidth="3.2"
      />
      <path
        d="M105 100V126"
        stroke={strokeColor}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === 'mark') {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        {archEmblem}
      </span>
    );
  }

  if (variant === 'full') {
    return (
      <div
        className={`inline-flex flex-col items-center gap-2 text-center select-none ${className}`}
      >
        {archEmblem}
        <div className="flex flex-col items-center leading-tight">
          <span
            className="text-2xl font-semibold"
            style={{ color: strokeColor }}
          >
            ایوان
          </span>
          <span className="mt-0.5 text-xs font-medium text-[#78716C]">
            کافه و رستوران
          </span>
        </div>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {archEmblem}
      <span className="flex flex-col leading-none">
        <span
          className="text-lg font-semibold whitespace-nowrap"
          style={{ color: strokeColor }}
        >
          ایوان
        </span>
        <span className="mt-1 text-[11px] font-normal text-[#78716C] whitespace-nowrap">
          کافه و رستوران
        </span>
      </span>
    </span>
  );
};
