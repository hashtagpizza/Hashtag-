import React, { useState } from 'react';
import { Flame } from 'lucide-react';

interface ResilientImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackLabel?: string;
  fallbackSrc?: string;
  fallbackSrcs?: string[];
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  fallbackLabel,
  fallbackSrc,
  fallbackSrcs = [],
  ...rest
}) => {
  const [currentSrcIndex, setCurrentSrcIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Build list of candidate image sources to try in priority order
  const sources = React.useMemo(() => {
    const list: string[] = [];
    if (src) list.push(src);
    if (fallbackSrc) list.push(fallbackSrc);
    if (fallbackSrcs && fallbackSrcs.length > 0) {
      fallbackSrcs.forEach((s) => {
        if (s && !list.includes(s)) list.push(s);
      });
    }
    return list;
  }, [src, fallbackSrc, fallbackSrcs]);

  const activeSrc = sources[currentSrcIndex] || null;

  const handleError = () => {
    if (currentSrcIndex < sources.length - 1) {
      setCurrentSrcIndex((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  if (hasError || !activeSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-stone-900 via-stone-800 to-[#0047AB]/60 text-stone-200 p-4 text-center ${className}`}
        role="img"
        aria-label={alt || fallbackLabel || 'Hashtag Pizza dish'}
      >
        <Flame className="w-8 h-8 text-[#FFD700] mb-2 opacity-80" />
        <span className="font-display text-xs font-bold tracking-wide uppercase text-white/90 line-clamp-2">
          {fallbackLabel || alt || 'Hashtag Pizza'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt || 'Hashtag Pizza'}
      referrerPolicy="no-referrer"
      onError={handleError}
      className={className}
      {...rest}
    />
  );
};
