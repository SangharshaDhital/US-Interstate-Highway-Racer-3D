import React from 'react';

interface ShieldProps {
  type: 'us-route' | 'interstate' | 'state-route';
  number: string;
  className?: string;
}

export const HighwayShield: React.FC<ShieldProps> = ({ type, number, className = 'w-12 h-12' }) => {
  if (type === 'interstate') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        {/* Interstate Red Top / Blue Bottom Shield */}
        <path
          d="M 12 28 C 12 18, 25 10, 50 10 C 75 10, 88 18, 88 28 L 88 45 C 88 72, 50 92, 50 92 C 50 92, 12 72, 12 45 Z"
          fill="#1d4ed8"
          stroke="#ffffff"
          strokeWidth="3.5"
        />
        {/* Red Crown */}
        <path
          d="M 12 28 C 12 18, 25 10, 50 10 C 75 10, 88 18, 88 28 L 88 36 C 75 33, 62 31, 50 31 C 38 31, 25 33, 12 36 Z"
          fill="#dc2626"
        />
        {/* Text */}
        <text
          x="50"
          y="23"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="9"
          fontWeight="bold"
          letterSpacing="1"
          fontFamily="sans-serif"
        >
          INTERSTATE
        </text>
        <text
          x="50"
          y="70"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="36"
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          {number}
        </text>
      </svg>
    );
  }

  if (type === 'us-route') {
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none">
        {/* US Highway Shield (Route 66 style) */}
        <path
          d="M 14 18 C 30 14, 50 14, 50 14 C 50 14, 70 14, 86 18 C 90 35, 90 55, 84 70 C 74 85, 50 94, 50 94 C 50 94, 26 85, 16 70 C 10 55, 10 35, 14 18 Z"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="4"
        />
        <text
          x="50"
          y="32"
          textAnchor="middle"
          fill="#0f172a"
          fontSize="10"
          fontWeight="800"
          letterSpacing="1.5"
          fontFamily="sans-serif"
        >
          US ROUTE
        </text>
        <text
          x="50"
          y="72"
          textAnchor="middle"
          fill="#0f172a"
          fontSize="38"
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          {number}
        </text>
      </svg>
    );
  }

  // State Route (e.g. CA-1 / PCH green highway sign or spade)
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none">
      <path
        d="M 14 20 C 14 14, 20 12, 50 12 C 80 12, 86 14, 86 20 L 86 65 C 86 82, 50 92, 50 92 C 50 92, 14 82, 14 65 Z"
        fill="#047857"
        stroke="#ffffff"
        strokeWidth="3.5"
      />
      <text
        x="50"
        y="26"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="8"
        fontWeight="800"
        letterSpacing="1"
        fontFamily="sans-serif"
      >
        CALIFORNIA
      </text>
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="40"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        {number}
      </text>
    </svg>
  );
};
