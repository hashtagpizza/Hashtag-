import React from 'react';
import { ASSETS } from '../constants';

interface HashtagLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'badge' | 'plain';
}

export const HashtagLogo: React.FC<HashtagLogoProps> = ({
  size = 'md',
  className = '',
  variant = 'badge',
}) => {
  // Dimension tokens ensuring perfect 1:1 square aspect ratio preserving the official brand logo intact
  const imgClasses = {
    sm: 'h-10 w-10 min-w-[40px]',
    md: 'h-12 w-12 min-w-[48px]',
    lg: 'h-16 w-16 min-w-[64px]',
    xl: 'h-24 w-24 min-w-[96px]',
  }[size];

  const badgeWrapper = {
    sm: 'rounded-xl',
    md: 'rounded-2xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center select-none shrink-0 transition-transform ${
        variant === 'badge'
          ? `overflow-hidden shadow-sm hover:scale-105 transition-transform ${badgeWrapper}`
          : 'overflow-hidden'
      } ${className}`}
      aria-label="Hashtag Pizza Birgunj Official Brand Logo"
      title="Hashtag Pizza Birgunj"
    >
      <img
        src={ASSETS.realLogo}
        alt="Hashtag Pizza Birgunj"
        className={`${imgClasses} object-contain block`}
        loading="eager"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={(e) => {
          // Resilient fallback to alternative brand asset if needed
          const target = e.currentTarget;
          if (!target.src.includes('hashtag_real_brand_logo.jpg')) {
            target.src = '/src/assets/images/hashtag_real_brand_logo.jpg';
          }
        }}
      />
    </div>
  );
};
