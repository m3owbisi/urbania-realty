import Image from 'next/image';
import { useProject } from '@/hooks/useProject';

// light: gold mark + light text (dark backgrounds, homescreen). dark: gold mark + black text (photo screens).
export default function Navbar({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { brand, name } = useProject();
  const partner = variant === 'dark' ? brand.partnerLogoDark : brand.partnerLogo;
  return (
    <header className="navbar">
      <Image src={brand.projectLogo} alt={name} width={180} height={74} priority unoptimized className="logo-project" />
      <Image src={partner} alt="Urbania Realty" width={variant === 'dark' ? 96 : 269} height={variant === 'dark' ? 119 : 269} priority className={variant === 'dark' ? 'logo-partner' : 'logo-group'} />
    </header>
  );
}
