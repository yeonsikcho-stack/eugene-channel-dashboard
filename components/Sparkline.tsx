const WIDTH = 64;
const HEIGHT = 24;

export function Sparkline({ points }: { points: (number | null)[] }) {
  const knownCount = points.filter((v) => v !== null).length;
  if (knownCount === 0) return null;

  const values = points.filter((v): v is number => v !== null);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = points.length > 1 ? WIDTH / (points.length - 1) : 0;

  const coords = points.map((v, i) =>
    v === null ? null : { x: i * stepX, y: HEIGHT - ((v - min) / range) * HEIGHT },
  );

  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];
  coords.forEach((c) => {
    if (c === null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push(c);
  });
  if (current.length) segments.push(current);

  let lastIndex: number | undefined;
  coords.forEach((c, i) => {
    if (c !== null) lastIndex = i;
  });

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="overflow-visible flex-shrink-0">
      {segments.map((segment, i) => {
        const areaD =
          segment.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') +
          ` L${segment[segment.length - 1].x},${HEIGHT} L${segment[0].x},${HEIGHT} Z`;
        return <path key={`area-${i}`} d={areaD} fill="#2451e0" fillOpacity={0.08} stroke="none" />;
      })}
      {segments.map((segment, i) => (
        <path
          key={i}
          d={segment.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#c3c2b7"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {lastIndex !== undefined && coords[lastIndex] && (
        <circle cx={coords[lastIndex]!.x} cy={coords[lastIndex]!.y} r={2.5} fill="#2451e0" />
      )}
    </svg>
  );
}
