import { cn } from '@/lib/utils';

interface AppBrandLogoProps {
  className?: string;
  alt?: string;
}

/** Logo aplikasi dari `/public/logo.png`; ukuran diatur lewat `className` (responsif). */
export function AppBrandLogo({ className, alt = 'SiJagaAir' }: AppBrandLogoProps) {
  return (
    <img
      src="/logo.png"
      alt={alt}
      className={cn('object-contain', className)}
      decoding="async"
    />
  );
}
