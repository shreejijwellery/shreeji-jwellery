/**
 * OMS Portal logo: icon + optional wordmark.
 * variant: 'default' (indigo) | 'white' (for dark backgrounds) | 'dark' (slate text)
 */
export default function OMSLogo({ variant = 'default', showWordmark = true, className = '', iconClassName = '' }) {
  const isWhite = variant === 'white';
  const iconSrc = isWhite ? '/logo-icon-white.svg' : '/logo-icon.svg';
  const wordmarkColor = isWhite ? 'text-white' : 'text-slate-900';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <img
        src={iconSrc}
        alt=""
        className={`flex-shrink-0 ${iconClassName}`}
        width={48}
        height={48}
      />
      {showWordmark && (
        <span className={`font-bold text-2xl tracking-tight ${wordmarkColor}`} style={{ letterSpacing: '-0.02em' }}>
          OMS Portal
        </span>
      )}
    </div>
  );
}
