import type { Illustration } from "@/lib/profiles";

// Hand-drawn SVG scenes in the app's green palette (colours come from CSS variables
// in globals.css, so they follow light/dark mode). Decorative: aria-hidden.

type Props = { className?: string };

const C = {
  sky: "var(--ill-sky)",
  sun: "var(--ill-sun)",
  cloud: "var(--ill-cloud)",
  ground: "var(--ill-ground)",
  ground2: "var(--ill-ground-2)",
  wall: "var(--ill-wall)",
  wall2: "var(--ill-wall-2)",
  roof: "var(--ill-roof)",
  window: "var(--ill-window)",
  frame: "var(--ill-frame)",
  door: "var(--ill-door)",
  tree: "var(--ill-tree)",
  tree2: "var(--ill-tree-2)",
  trunk: "var(--ill-trunk)",
  glass: "var(--ill-glass)",
};

function Backdrop() {
  return (
    <>
      <rect width="320" height="200" fill={C.sky} />
      <circle cx="262" cy="44" r="18" fill={C.sun} />
      <g fill={C.cloud}>
        <ellipse cx="70" cy="40" rx="26" ry="9" />
        <ellipse cx="88" cy="34" rx="16" ry="9" />
        <ellipse cx="200" cy="28" rx="18" ry="6" />
      </g>
      <path d="M0 168 Q80 156 160 164 T320 160 V200 H0Z" fill={C.ground2} />
      <path d="M0 178 Q90 168 180 176 T320 172 V200 H0Z" fill={C.ground} />
    </>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-2.5" y="0" width="5" height="18" rx="1" fill={C.trunk} />
      <circle cx="0" cy="-6" r="13" fill={C.tree} />
      <circle cx="-7" cy="2" r="8" fill={C.tree2} />
      <circle cx="7" cy="1" r="9" fill={C.tree2} />
    </g>
  );
}

function Win({ x, y, w = 12, h = 12 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="1.5" fill={C.window} stroke={C.frame} strokeWidth="1.5" />
      <path d={`M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}`} stroke={C.frame} strokeWidth="1" />
    </g>
  );
}

export function HouseScene({ className }: Props) {
  return (
    <svg viewBox="0 0 320 200" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <Backdrop />
      <Tree x={48} y={152} s={1.3} />
      <Tree x={278} y={156} s={1.1} />
      {/* chimney */}
      <rect x="186" y="62" width="14" height="30" fill={C.wall2} />
      {/* roof */}
      <path d="M100 104 L160 58 L220 104 Z" fill={C.roof} />
      {/* body */}
      <rect x="112" y="102" width="96" height="70" fill={C.wall} />
      <rect x="112" y="102" width="96" height="6" fill={C.wall2} />
      {/* garage wing */}
      <path d="M208 122 L236 108 L264 122 Z" fill={C.roof} />
      <rect x="214" y="121" width="44" height="51" fill={C.wall2} />
      <rect x="221" y="134" width="30" height="38" rx="2" fill={C.frame} opacity="0.35" />
      {/* door */}
      <rect x="150" y="132" width="20" height="40" rx="2" fill={C.door} />
      <circle cx="165" cy="153" r="1.6" fill={C.sun} />
      <Win x={122} y={120} w={18} h={16} />
      <Win x={180} y={120} w={18} h={16} />
      <Win x={152} y={80} w={16} h={14} />
      {/* path & bushes */}
      <path d="M150 172 L170 172 L182 196 L138 196 Z" fill={C.ground2} />
      <ellipse cx="124" cy="172" rx="14" ry="7" fill={C.tree2} />
      <ellipse cx="198" cy="172" rx="12" ry="6" fill={C.tree2} />
    </svg>
  );
}

export function ApartmentScene({ className }: Props) {
  const rows = [52, 74, 96, 118, 140];
  return (
    <svg viewBox="0 0 320 200" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <Backdrop />
      {/* back building */}
      <rect x="196" y="76" width="64" height="96" fill={C.wall2} />
      {[88, 106, 124, 142].map((y) => (
        <g key={y}>
          <Win x={206} y={y} w={10} h={10} />
          <Win x={224} y={y} w={10} h={10} />
          <Win x={242} y={y} w={10} h={10} />
        </g>
      ))}
      {/* main block */}
      <rect x="96" y="40" width="104" height="132" fill={C.wall} />
      <rect x="92" y="36" width="112" height="8" rx="1" fill={C.roof} />
      {rows.map((y) => (
        <g key={y}>
          <Win x={106} y={y} w={14} h={14} />
          <Win x={141} y={y} w={14} h={14} />
          <Win x={176} y={y} w={14} h={14} />
          {/* balconies */}
          <rect x="102" y={y + 14} width="22" height="3" fill={C.frame} />
          <rect x="172" y={y + 14} width="22" height="3" fill={C.frame} />
        </g>
      ))}
      <rect x="136" y="150" width="24" height="22" rx="2" fill={C.door} />
      <rect x="132" y="146" width="32" height="5" rx="1" fill={C.roof} />
      <Tree x={60} y={154} s={1.2} />
      <Tree x={288} y={156} s={1} />
      <ellipse cx="226" cy="173" rx="20" ry="5" fill={C.tree2} />
    </svg>
  );
}

export function OfficeScene({ className }: Props) {
  return (
    <svg viewBox="0 0 320 200" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <Backdrop />
      {/* tower */}
      <rect x="128" y="26" width="72" height="146" fill={C.glass} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={134 + i * 11} y="32" width="6" height="134" fill={C.window} opacity="0.75" />
      ))}
      {[46, 66, 86, 106, 126, 146].map((y) => (
        <rect key={y} x="128" y={y} width="72" height="2" fill={C.frame} opacity="0.5" />
      ))}
      <rect x="124" y="22" width="80" height="6" fill={C.roof} />
      <rect x="160" y="10" width="2" height="12" fill={C.frame} />
      {/* annex */}
      <rect x="60" y="104" width="72" height="68" fill={C.wall} />
      <rect x="56" y="98" width="80" height="8" fill={C.roof} />
      {[116, 140].map((y) => (
        <g key={y}>
          <rect x="68" y={y} width="56" height="14" rx="1" fill={C.window} stroke={C.frame} strokeWidth="1.5" />
        </g>
      ))}
      {/* right block */}
      <rect x="196" y="88" width="62" height="84" fill={C.wall2} />
      {[100, 120, 140].map((y) => (
        <g key={y}>
          <Win x={204} y={y} w={12} h={12} />
          <Win x={222} y={y} w={12} h={12} />
          <Win x={240} y={y} w={12} h={12} />
        </g>
      ))}
      {/* entrance */}
      <rect x="150" y="146" width="28" height="26" fill={C.door} />
      <rect x="163" y="146" width="2" height="26" fill={C.window} />
      <rect x="144" y="140" width="40" height="6" fill={C.roof} />
      <Tree x={36} y={156} s={1.1} />
      <Tree x={286} y={156} s={1.2} />
      {/* car */}
      <g transform="translate(226 176)">
        <rect x="0" y="0" width="34" height="9" rx="3" fill={C.roof} />
        <path d="M6 0 L11 -7 H24 L29 0 Z" fill={C.roof} />
        <circle cx="8" cy="10" r="3" fill={C.frame} />
        <circle cx="26" cy="10" r="3" fill={C.frame} />
      </g>
    </svg>
  );
}

export function PlaceScene({ className }: Props) {
  return (
    <svg viewBox="0 0 320 200" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <Backdrop />
      {/* barn / hall */}
      <path d="M96 110 L118 74 H186 L208 110 Z" fill={C.roof} />
      <rect x="100" y="108" width="104" height="64" fill={C.wall} />
      <path d="M136 172 V130 H168 V172" fill={C.door} />
      <path d="M136 130 L168 172 M168 130 L136 172" stroke={C.wall2} strokeWidth="2" />
      <Win x={110} y={120} w={16} h={14} />
      <Win x={178} y={120} w={16} h={14} />
      <circle cx="152" cy="94" r="7" fill={C.window} stroke={C.frame} strokeWidth="1.5" />
      {/* water tank */}
      <rect x="226" y="112" width="4" height="60" fill={C.frame} />
      <rect x="252" y="112" width="4" height="60" fill={C.frame} />
      <path d="M228 140 L254 124 M228 124 L254 140" stroke={C.frame} strokeWidth="1.5" />
      <rect x="220" y="84" width="42" height="30" rx="6" fill={C.glass} />
      <rect x="220" y="94" width="42" height="3" fill={C.frame} opacity="0.4" />
      {/* fence */}
      <g stroke={C.trunk} strokeWidth="2">
        <path d="M20 160 H90" />
        {[24, 40, 56, 72, 88].map((x) => (
          <path key={x} d={`M${x} 150 V172`} />
        ))}
      </g>
      <Tree x={58} y={136} s={1.25} />
      <Tree x={292} y={154} s={1.1} />
    </svg>
  );
}

const SCENES: Record<Illustration, (p: Props) => React.JSX.Element> = {
  house: HouseScene,
  apartment: ApartmentScene,
  office: OfficeScene,
  place: PlaceScene,
};

export function Scene({ kind, className }: { kind: Illustration; className?: string }) {
  const S = SCENES[kind];
  return <S className={className} />;
}

/** Login artwork: a small street with an apartment block, a house and an office. */
export function NeighbourhoodScene({ className }: Props) {
  return (
    <svg viewBox="0 0 480 260" className={className} aria-hidden="true" preserveAspectRatio="xMidYMax slice">
      <rect width="480" height="260" fill={C.sky} />
      <circle cx="400" cy="56" r="24" fill={C.sun} />
      <g fill={C.cloud}>
        <ellipse cx="96" cy="52" rx="34" ry="11" />
        <ellipse cx="120" cy="44" rx="20" ry="11" />
        <ellipse cx="300" cy="36" rx="22" ry="7" />
      </g>
      <path d="M0 212 Q120 198 240 208 T480 202 V260 H0Z" fill={C.ground2} />
      <path d="M0 226 Q130 214 260 222 T480 218 V260 H0Z" fill={C.ground} />

      {/* apartment */}
      <rect x="34" y="70" width="96" height="150" fill={C.wall2} />
      <rect x="30" y="64" width="104" height="8" fill={C.roof} />
      {[84, 108, 132, 156, 180].map((y) => (
        <g key={y}>
          <Win x={44} y={y} w={14} h={14} />
          <Win x={75} y={y} w={14} h={14} />
          <Win x={106} y={y} w={14} h={14} />
        </g>
      ))}
      <rect x="70" y="198" width="24" height="22" fill={C.door} />

      {/* house */}
      <path d="M166 148 L226 102 L286 148 Z" fill={C.roof} />
      <rect x="250" y="106" width="13" height="26" fill={C.wall2} />
      <rect x="178" y="146" width="96" height="74" fill={C.wall} />
      <rect x="216" y="176" width="20" height="44" rx="2" fill={C.door} />
      <Win x={188} y={162} w={18} h={16} />
      <Win x={246} y={162} w={18} h={16} />
      <Win x={218} y={122} w={16} h={14} />

      {/* office */}
      <rect x="318" y="58" width="74" height="162" fill={C.glass} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={324 + i * 11.5} y="64" width="6" height="150" fill={C.window} opacity="0.75" />
      ))}
      <rect x="314" y="54" width="82" height="6" fill={C.roof} />
      <rect x="392" y="130" width="60" height="90" fill={C.wall} />
      {[142, 164, 186].map((y) => (
        <g key={y}>
          <Win x={400} y={y} w={12} h={12} />
          <Win x={418} y={y} w={12} h={12} />
          <Win x={436} y={y} w={12} h={12} />
        </g>
      ))}

      <Tree x={152} y={202} s={1.2} />
      <Tree x={302} y={204} s={1} />
      <Tree x={466} y={204} s={1.1} />
    </svg>
  );
}
