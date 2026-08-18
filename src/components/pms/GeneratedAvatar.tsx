// Avatar ilustrado gerado a partir do nome (padrão "marble", tipo GitHub/
// Boring Avatars): formas abstratas coloridas, únicas por pessoa, sem ser a
// foto de ninguém de verdade e sem depender de internet. Usado como visual
// padrão até o colaborador enviar a própria foto 3x4.

function hashString(s: string): number {
  let hash = 0;
  for (const c of s) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return hash;
}

export function GeneratedAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const hash = hashString(name || "?");
  const hue1 = hash % 360;
  const hue2 = (hue1 + 40 + ((hash >> 3) % 60)) % 360;
  const hue3 = (hue1 + 160 + ((hash >> 6) % 60)) % 360;
  const cx1 = 24 + (hash % 32);
  const cy1 = 20 + ((hash >> 4) % 32);
  const cx2 = 80 - cx1;
  const cy2 = 80 - cy1;
  const r1 = 34 + ((hash >> 8) % 14);
  const r2 = 26 + ((hash >> 12) % 14);
  const rotate = hash % 360;

  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      className="block"
      role="img"
      aria-label="Avatar gerado"
    >
      <rect width="80" height="80" fill={`hsl(${hue1} 60% 52%)`} />
      <g transform={`rotate(${rotate} 40 40)`}>
        <circle cx={cx1} cy={cy1} r={r1} fill={`hsl(${hue2} 70% 60%)`} opacity="0.85" />
        <circle cx={cx2} cy={cy2} r={r2} fill={`hsl(${hue3} 75% 65%)`} opacity="0.75" />
      </g>
    </svg>
  );
}
