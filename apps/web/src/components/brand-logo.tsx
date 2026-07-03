import Image from 'next/image';

const logoSizes = {
  compact: { width: 88, height: 47, className: 'h-10 w-auto' },
  sm: { width: 140, height: 75, className: 'h-12 w-auto' },
  md: { width: 220, height: 118, className: 'h-16 w-auto' },
  lg: { width: 360, height: 193, className: 'h-24 w-auto sm:h-28' }
};

export type BrandLogoSize = keyof typeof logoSizes;

export function BrandLogo({
  className = '',
  priority = false,
  size = 'md'
}: {
  className?: string;
  priority?: boolean;
  size?: BrandLogoSize;
}) {
  const config = logoSizes[size];

  return (
    <Image
      alt="LVM Weightlifting"
      className={`${config.className} object-contain ${className}`}
      height={config.height}
      priority={priority}
      src="/brand/logo-lvm.png"
      width={config.width}
    />
  );
}
