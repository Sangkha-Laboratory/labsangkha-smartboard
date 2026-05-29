import React from 'react';

export default function MedtechIllustration({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 240 240" 
      width="100%" 
      height="100%"
      className={className}
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="flaskGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#20BEFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#2B8BE8" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3CD1FF" />
          <stop offset="100%" stopColor="#1E6FD9" />
        </linearGradient>
        <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#20BEFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2B8BE8" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Background Ambient Glow */}
      <circle cx="120" cy="120" r="100" fill="url(#glowGrad)" />

      {/* Background Grid/Network lines */}
      <g opacity="0.3" stroke="#2B8BE8" strokeWidth="1.5" strokeDasharray="3 3" fill="none">
        <circle cx="120" cy="120" r="75" />
        <path d="M 120,45 L 120,195" />
        <path d="M 45,120 L 195,120" />
      </g>

      {/* Network Nodes */}
      <g fill="#2B8BE8">
        <circle cx="120" cy="45" r="4" />
        <circle cx="45" cy="120" r="4" />
        <circle cx="195" cy="120" r="4" />
        <circle cx="120" cy="195" r="4" />
      </g>

      {/* Sparkles */}
      <g fill="#3CD1FF">
        {/* Top Right Sparkle */}
        <path d="M 175,65 Q 175,70 180,70 Q 175,70 175,75 Q 175,70 170,70 Q 175,70 175,65 Z" />
        {/* Bottom Left Sparkle */}
        <path d="M 65,165 Q 65,170 70,170 Q 65,170 65,175 Q 65,170 60,170 Q 65,170 65,165 Z" />
      </g>

      {/* Floating Bubbles */}
      <g fill="#20BEFF" opacity="0.6">
        <circle cx="110" cy="95" r="5" />
        <circle cx="128" cy="80" r="3.5" />
        <circle cx="118" cy="70" r="2.5" />
        <circle cx="102" cy="85" r="3" />
        <circle cx="138" cy="98" r="4" />
      </g>

      {/* Main Erlenmeyer Flask */}
      <g>
        {/* Liquid inside */}
        <path d="M 112,125 L 128,125 L 142,153 Q 145,160 137,160 L 103,160 Q 95,160 98,153 Z" fill="url(#liquidGrad)" />
        
        {/* Bubble inside liquid */}
        <circle cx="112" cy="148" r="2" fill="#FFFFFF" opacity="0.7" />
        <circle cx="125" cy="138" r="1.5" fill="#FFFFFF" opacity="0.8" />
        <circle cx="120" cy="151" r="1.2" fill="#FFFFFF" opacity="0.6" />

        {/* Flask Glass Outline */}
        <path d="M 112,105 L 112,120 L 97,152 A 8,8 0 0 0 104,163 L 136,163 A 8,8 0 0 0 143,152 L 128,120 L 128,105 Z" fill="none" stroke="#475569" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {/* Flask Rim */}
        <rect x="110" y="102" width="20" height="3" rx="1.5" fill="#475569" />
      </g>

      {/* Crossed Test-Tube / Accompanying Lab Item */}
      <g transform="translate(25, -5)">
        {/* Base Tube */}
        <path d="M 125,120 L 125,145 A 5,5 0 0 0 135,145 L 135,120 Z" fill="url(#accentGrad)" opacity="0.8" />
        
        <path d="M 125,115 L 125,145 A 5,5 0 0 0 135,145 L 135,115 Z" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        <rect x="123" y="113" width="14" height="2" rx="1" fill="#475569" />
        
        {/* Measurement lines */}
        <line x1="129" y1="123" x2="132" y2="123" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
        <line x1="129" y1="129" x2="132" y2="129" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
        <line x1="129" y1="135" x2="132" y2="135" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.8" />
      </g>

      {/* DNA/Molecules Icon representing lab work */}
      <g transform="translate(-15, 3)">
        <line x1="65" y1="108" x2="85" y2="108" stroke="#3CD1FF" strokeWidth="2" strokeLinecap="round" />
        <line x1="65" y1="118" x2="85" y2="118" stroke="#3CD1FF" strokeWidth="2" strokeLinecap="round" />
        <circle cx="65" cy="108" r="4.5" fill="#20BEFF" />
        <circle cx="85" cy="108" r="4.5" fill="#1E6FD9" />
        <circle cx="65" cy="118" r="4.5" fill="#1E6FD9" />
        <circle cx="85" cy="118" r="4.5" fill="#20BEFF" />
        <path d="M 65,108 L 85,118" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
        <path d="M 65,118 L 85,108" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
      </g>

      {/* Crosshair/Status Check at bottom-right of central graphic */}
      <g transform="translate(142, 142)">
        <circle cx="0" cy="0" r="12" fill="#DCFCE7" stroke="#10B981" strokeWidth="2" />
        <path d="M -4,0 L -1,3 L 5,-3" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
