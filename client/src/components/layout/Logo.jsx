export function LogoMark({ size = 24, className = '' }) {
  return <img src="/logo-mark.png" alt="" width={size} height={size} className={`object-contain ${className}`} style={{ width: size, height: size }} />;
}

export function LogoFull({ height = 28, className = '' }) {
  return <img src="/logo-full.png" alt="CampusFlow" className={`object-contain ${className}`} style={{ height }} />;
}

export function LogoIcon({ size = 40, className = '' }) {
  return <img src="/logo-icon.png" alt="CampusFlow" width={size} height={size} className={`object-contain ${className}`} style={{ width: size, height: size }} />;
}
