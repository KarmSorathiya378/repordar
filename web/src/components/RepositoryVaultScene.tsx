/**
 * RepositoryVaultScene — 3D Diorama Desktop Scene for RepoRadar
 *
 * Modeled after the reference collectible desk showcase:
 * 1. Ultra-realistic wooden table with procedural wood grain, edge bevels, and cabinet base.
 * 2. 3D Retro-Futuristic Red Vault Chest resting on the table:
 *    - Curved red shell, golden corner brackets, top latch, rotary dial, status button.
 *    - Dot-matrix OLED display with real-time smooth animated repository count.
 * 3. Collectible 3D Tabletop Figurines sitting directly on the wood with realistic contact shadows:
 *    - Left: Pixel Tree, Voxel Code Pup on Geared Stand, Voxel Branch Vessel.
 *    - Right: Voxel Yellow Chick, Purple Voxel Cat, Mini Sentinel Robot with glowing heart.
 */

import { useEffect, useRef, useState } from 'react'

// ─── Smooth Count-Up Hook ───────────────────────────────────────────────────
function useSmoothCount(target: number, duration = 1200) {
  const [val, setVal] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  const prev = useRef(0)

  useEffect(() => {
    const from = prev.current
    const to = target
    prev.current = to
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      // Custom cubic out easing
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(from + (to - from) * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [target, duration])

  return val
}

// ─── Pulse Detector on Value Changes ─────────────────────────────────────────
function usePulseTrigger(val: number) {
  const [pulse, setPulse] = useState(false)
  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    setPulse(true)
    const timer = setTimeout(() => setPulse(false), 800)
    return () => clearTimeout(timer)
  }, [val])

  return pulse
}

export function RepositoryVaultScene({ count }: { count: number | null }) {
  // Use actual repository count or fallback gracefully during network fetch
  const effectiveTarget = count ?? 107477
  const smoothNumber = useSmoothCount(effectiveTarget, 1300)
  const isPulsing = usePulseTrigger(smoothNumber)

  return (
    <div className="relative mx-auto my-8 w-full max-w-4xl select-none px-2 sm:px-4 animate-fade-up">
      {/* ── Main SVG Diorama Scene ── */}
      <div className="relative w-full overflow-visible drop-shadow-[0_25px_40px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_25px_45px_rgba(0,0,0,0.55)]">
        <svg
          viewBox="0 0 1000 480"
          className="w-full h-auto overflow-visible select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* ── Procedural Wood Grain Texture Filter ── */}
            <filter id="woodGrainFilter" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04 0.005" numOctaves="3" result="noise" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.85   0 0 0 0 0.65   0 0 0 0 0.45   0 0 0 0.18 0"
                result="coloredNoise"
              />
              <feComposite in="SourceGraphic" in2="coloredNoise" operator="over" />
            </filter>

            {/* ── Table Top Surface Gradient ── */}
            <linearGradient id="tableTopGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f8d7ad" />
              <stop offset="35%" stopColor="#f1c592" />
              <stop offset="70%" stopColor="#e5b37b" />
              <stop offset="100%" stopColor="#d59e63" />
            </linearGradient>
            <linearGradient id="tableTopGradDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3d2a1c" />
              <stop offset="40%" stopColor="#332115" />
              <stop offset="100%" stopColor="#24160c" />
            </linearGradient>

            {/* ── Table Front Edge Lip Gradient ── */}
            <linearGradient id="tableFrontLip" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fae6cd" />
              <stop offset="12%" stopColor="#dfa76d" />
              <stop offset="50%" stopColor="#c58b4f" />
              <stop offset="100%" stopColor="#9e662c" />
            </linearGradient>

            {/* ── Cabinet Base Gradient ── */}
            <linearGradient id="cabinetBaseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ecefe6" />
              <stop offset="25%" stopColor="#f5f7f2" />
              <stop offset="100%" stopColor="#e4e8dc" />
            </linearGradient>
            <linearGradient id="cabinetBaseGradDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#151e2e" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* ── Chest Red Shell Gradients ── */}
            <linearGradient id="chestRedBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5742" />
              <stop offset="30%" stopColor="#ee3824" />
              <stop offset="85%" stopColor="#cc2212" />
              <stop offset="100%" stopColor="#991508" />
            </linearGradient>
            <linearGradient id="chestLidArch" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff7866" />
              <stop offset="45%" stopColor="#ee3824" />
              <stop offset="100%" stopColor="#b31b0c" />
            </linearGradient>
            <linearGradient id="chestBasePlinth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d62b18" />
              <stop offset="50%" stopColor="#ab1909" />
              <stop offset="100%" stopColor="#750d03" />
            </linearGradient>

            {/* ── Chest Gold / Yellow Accent Gradients ── */}
            <linearGradient id="goldAccent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffec82" />
              <stop offset="35%" stopColor="#f5c228" />
              <stop offset="85%" stopColor="#d49b0e" />
              <stop offset="100%" stopColor="#9e7105" />
            </linearGradient>
            <linearGradient id="goldRib" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d49b0e" />
              <stop offset="40%" stopColor="#ffec82" />
              <stop offset="100%" stopColor="#b37f07" />
            </linearGradient>

            {/* ── Screen Bezel & Dot Matrix Gradients ── */}
            <linearGradient id="screenBezel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18181b" />
              <stop offset="100%" stopColor="#27272a" />
            </linearGradient>
            <linearGradient id="screenGlass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c0f17" />
              <stop offset="100%" stopColor="#05070b" />
            </linearGradient>

            {/* ── Rotary Metallic Dial Gradients ── */}
            <radialGradient id="dialMetalBezel" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="80%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>
            <radialGradient id="dialRedCenter" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="70%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </radialGradient>

            {/* ── Soft Gaussian Blur Filters for Contact Shadows ── */}
            <filter id="softContactBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
            <filter id="deepTableShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="12" />
            </filter>
            <filter id="miniObjectBlur" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
            <filter id="screenGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* ── Dot Matrix CRT Grid Pattern ── */}
            <pattern id="dotMatrixPattern" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.1" fill="#22d3ee" opacity="0.12" />
            </pattern>
          </defs>

          {/* ═══════════════════════════════════════════════════════════════════
              LAYER 1: THE STUDIO TABLE & CABINET DESK BASE
          ═══════════════════════════════════════════════════════════════════ */}
          <g id="studio-table-group">
            {/* Ambient shadow beneath the wooden tabletop onto cabinet */}
            <rect x="10" y="360" width="980" height="110" fill="#000000" opacity="0.22" filter="url(#deepTableShadow)" />

            {/* Cabinet White Credenza Base */}
            <rect
              x="15"
              y="348"
              width="970"
              height="125"
              rx="4"
              className="fill-[url(#cabinetBaseGrad)] dark:fill-[url(#cabinetBaseGradDark)]"
            />
            {/* Cabinet vertical panel division seams (gives authentic furniture architecture) */}
            <line x1="260" y1="352" x2="260" y2="470" stroke="#cbd5e1" strokeWidth="2.5" className="dark:stroke-slate-800" />
            <line x1="740" y1="352" x2="740" y2="470" stroke="#cbd5e1" strokeWidth="2.5" className="dark:stroke-slate-800" />
            {/* Cabinet subtle inner shadow line beneath wooden overhang */}
            <rect x="15" y="348" width="970" height="10" fill="#000000" opacity="0.18" />

            {/* ── WOODEN TABLETOP SLAB ── */}
            {/* Main Upper Wood Plane (Perspective trapezoid) */}
            <polygon
              points="0,318 1000,318 1000,344 0,344"
              className="fill-[url(#tableTopGrad)] dark:fill-[url(#tableTopGradDark)]"
              filter="url(#woodGrainFilter)"
            />

            {/* Natural horizontal grain lines across the wood plane */}
            <g stroke="#b47b41" strokeWidth="0.8" opacity="0.35" className="dark:stroke-amber-950 dark:opacity-40">
              <line x1="20" y1="323" x2="980" y2="323" strokeDasharray="90 20 180 30" />
              <line x1="50" y1="329" x2="950" y2="329" strokeDasharray="140 40 100 15" />
              <line x1="10" y1="337" x2="990" y2="337" strokeDasharray="220 50 160 35" />
            </g>

            {/* Specular ambient rim light across the top back edge of the wood */}
            <line x1="0" y1="318" x2="1000" y2="318" stroke="#ffffff" strokeWidth="2" opacity="0.75" />

            {/* ── Wooden Front Edge Bevel / Lip (Thickness of the plank) ── */}
            <rect
              x="0"
              y="342"
              width="1000"
              height="18"
              rx="4"
              fill="url(#tableFrontLip)"
            />
            {/* Highlights on the wooden bevel edge */}
            <line x1="0" y1="343" x2="1000" y2="343" stroke="#fff1dd" strokeWidth="1.8" opacity="0.9" />
            <line x1="0" y1="359" x2="1000" y2="359" stroke="#5c3814" strokeWidth="2.5" opacity="0.8" />
          </g>

          {/* ═══════════════════════════════════════════════════════════════════
              LAYER 2: CONTACT SHADOWS ON THE WOOD SURFACE
          ═══════════════════════════════════════════════════════════════════ */}
          <g id="table-contact-shadows">
            {/* Tree contact shadow */}
            <ellipse cx="60" cy="336" rx="26" ry="6" fill="#42250d" opacity="0.45" filter="url(#miniObjectBlur)" />
            {/* Geared dog stand contact shadow */}
            <ellipse cx="145" cy="337" rx="46" ry="8" fill="#42250d" opacity="0.5" filter="url(#miniObjectBlur)" />
            {/* Vessel boat contact shadow */}
            <ellipse cx="245" cy="337" rx="48" ry="9" fill="#42250d" opacity="0.5" filter="url(#miniObjectBlur)" />

            {/* CENTRAL CHEST DEEP MULTI-STAGE CONTACT SHADOW */}
            <ellipse cx="495" cy="342" rx="175" ry="18" fill="#2d1708" opacity="0.7" filter="url(#softContactBlur)" />
            <ellipse cx="495" cy="340" rx="140" ry="10" fill="#180b03" opacity="0.85" filter="url(#miniObjectBlur)" />

            {/* Yellow chick contact shadow */}
            <ellipse cx="638" cy="338" rx="36" ry="7" fill="#42250d" opacity="0.45" filter="url(#miniObjectBlur)" />
            {/* Purple cat contact shadow */}
            <ellipse cx="735" cy="338" rx="55" ry="8" fill="#42250d" opacity="0.5" filter="url(#miniObjectBlur)" />
            {/* Mini sentinel robot contact shadow */}
            <ellipse cx="830" cy="337" rx="24" ry="5.5" fill="#42250d" opacity="0.45" filter="url(#miniObjectBlur)" />
          </g>

          {/* ═══════════════════════════════════════════════════════════════════
              LAYER 3: 3D COLLECTIBLE TABLETOP FIGURINES (LEFT SIDE)
          ═══════════════════════════════════════════════════════════════════ */}

          {/* ── 1. Tiny Voxel Tree (Leftmost) ── */}
          <g id="tree-figurine" className="transition-transform duration-300 hover:-translate-y-1">
            {/* Tree Brown Trunk */}
            <rect x="52" y="278" width="10" height="58" rx="2" fill="#5c3818" />
            <rect x="52" y="278" width="4" height="58" rx="1" fill="#825124" />
            {/* Cross branch */}
            <rect x="42" y="300" width="12" height="6" rx="1" fill="#5c3818" />
            {/* Green Voxel Foliage Cubes */}
            <rect x="36" y="258" width="42" height="28" rx="3" fill="#15803d" />
            <rect x="36" y="258" width="42" height="6" rx="2" fill="#22c55e" />
            <rect x="44" y="244" width="26" height="20" rx="2" fill="#16a34a" />
            <rect x="44" y="244" width="26" height="5" rx="1" fill="#4ade80" />
            {/* Specular highlight square */}
            <rect x="48" y="252" width="6" height="6" fill="#86efac" opacity="0.75" />
          </g>

          {/* ── 2. Voxel Code Dog on White Geared Pedestal ── */}
          <g id="dog-stand-figurine" className="transition-transform duration-300 hover:-translate-y-1">
            {/* White Pedestal Frame */}
            <rect x="105" y="246" width="76" height="88" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2.5" />
            {/* Cutout / inner hollow of pedestal */}
            <rect x="119" y="260" width="48" height="60" rx="4" fill="#cbd5e1" opacity="0.5" />
            <rect x="121" y="262" width="44" height="56" rx="3" fill="#0f172a" opacity="0.25" />

            {/* Turning mechanical red axle gear inside pedestal */}
            <line x1="110" y1="290" x2="176" y2="290" stroke="#059669" strokeWidth="5" strokeLinecap="round" />
            <circle cx="143" cy="290" r="14" fill="#dc2626" />
            <circle cx="143" cy="290" r="8" fill="#f87171" />
            <circle cx="143" cy="290" r="4" fill="#450a0a" />

            {/* Yellow Voxel Dog sitting on pedestal */}
            {/* Dog body */}
            <rect x="122" y="196" width="38" height="52" rx="4" fill="#facc15" />
            <rect x="122" y="196" width="38" height="8" rx="2" fill="#fde047" />
            {/* Dog Head */}
            <rect x="102" y="172" width="36" height="30" rx="4" fill="#facc15" />
            <rect x="102" y="172" width="36" height="6" rx="2" fill="#fef08a" />
            {/* Floppy brown ear */}
            <rect x="134" y="178" width="10" height="24" rx="3" fill="#78350f" />
            {/* Eye */}
            <rect x="108" y="180" width="5" height="7" rx="1" fill="#0f172a" />
            <rect x="109" y="181" width="2" height="2" fill="#ffffff" />
            {/* Snout and open pink tongue */}
            <rect x="94" y="186" width="12" height="12" rx="2" fill="#fde047" />
            <rect x="94" y="186" width="4" height="4" fill="#0f172a" />
            <rect x="98" y="192" width="9" height="7" rx="2" fill="#f43f5e" />
            {/* Front feet */}
            <rect x="112" y="242" width="10" height="8" rx="2" fill="#ca8a04" />
            <rect x="128" y="242" width="10" height="8" rx="2" fill="#ca8a04" />
          </g>

          {/* ── 3. Voxel Branch Vessel (Boat with Pickaxe Mast) ── */}
          <g id="vessel-figurine" className="transition-transform duration-300 hover:-translate-y-1">
            {/* Wooden Layered Hull */}
            <polygon points="195,282 285,282 298,258 182,258" fill="#854d0e" />
            <polygon points="182,258 298,258 298,264 182,264" fill="#a16207" />
            {/* Lower dark wood hull */}
            <polygon points="204,332 276,332 285,282 195,282" fill="#58310c" />
            <line x1="184" y1="272" x2="296" y2="272" stroke="#3d2206" strokeWidth="1.5" />
            <line x1="190" y1="288" x2="290" y2="288" stroke="#3d2206" strokeWidth="1.5" />

            {/* Green Voxel Cabin */}
            <rect x="220" y="222" width="46" height="38" rx="3" fill="#15803d" />
            <polygon points="214,224 243,198 272,224" fill="#16a34a" />
            <rect x="236" y="232" width="14" height="18" rx="2" fill="#022c22" />
            <rect x="238" y="234" width="10" height="14" rx="1" fill="#4ade80" opacity="0.8" />

            {/* Pickaxe / Mast on rear */}
            <rect x="274" y="200" width="5" height="58" rx="1" fill="#78350f" />
            <path d="M266,206 Q280,188 296,212" stroke="#06b6d4" strokeWidth="7" fill="none" strokeLinecap="round" />
          </g>

          {/* ═══════════════════════════════════════════════════════════════════
              LAYER 4: THE CENTRAL 3D RED RETRO-FUTURISTIC VAULT CHEST
          ═══════════════════════════════════════════════════════════════════ */}
          <g id="central-vault-chest" className="transition-transform duration-300 hover:scale-[1.012]">

            {/* ── 1. Molded Stepped Base Plinth ── */}
            <polygon
              points="328,338 662,338 650,305 340,305"
              fill="url(#chestBasePlinth)"
            />
            {/* Bottom edge shadow */}
            <rect x="328" y="333" width="334" height="6" fill="#450a0a" opacity="0.6" />
            {/* Front ventilation / coin slot on base */}
            <rect x="430" y="320" width="130" height="5.5" rx="2.5" fill="#450a0a" />
            <rect x="431" y="321" width="128" height="2" rx="1" fill="#facc15" opacity="0.65" />

            {/* ── 2. Main Red Chest Shell Body ── */}
            <rect
              x="315"
              y="115"
              width="360"
              height="192"
              rx="28"
              fill="url(#chestRedBody)"
            />

            {/* ── 3. 3D Arched Top Lid ── */}
            <path
              d="M315,135 Q315,64 495,64 Q675,64 675,135 Z"
              fill="url(#chestLidArch)"
            />
            {/* Top arched specular highlight */}
            <path
              d="M330,122 Q495,78 660,122"
              stroke="#ffa294"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* ── 4. Golden Rib Straps across the Lid ── */}
            <path d="M434,65 L434,136" stroke="url(#goldRib)" strokeWidth="12" fill="none" strokeLinecap="round" />
            <path d="M556,65 L556,136" stroke="url(#goldRib)" strokeWidth="12" fill="none" strokeLinecap="round" />

            {/* ── 5. Golden Top Center Latch Handle ── */}
            <rect x="460" y="112" width="70" height="18" rx="8" fill="url(#goldAccent)" stroke="#b45309" strokeWidth="1.5" />
            <rect x="472" y="116" width="46" height="8" rx="4" fill="#fef08a" opacity="0.9" />

            {/* ── 6. Sturdy Golden Corner Brackets ── */}
            {/* Top Left Bracket */}
            <rect x="312" y="112" width="28" height="28" rx="6" fill="url(#goldAccent)" stroke="#b45309" strokeWidth="1.2" />
            <circle cx="320" cy="120" r="2.5" fill="#78350f" opacity="0.6" />
            {/* Top Right Bracket */}
            <rect x="650" y="112" width="28" height="28" rx="6" fill="url(#goldAccent)" stroke="#b45309" strokeWidth="1.2" />
            <circle cx="670" cy="120" r="2.5" fill="#78350f" opacity="0.6" />
            {/* Bottom Left Bracket */}
            <rect x="312" y="278" width="28" height="28" rx="6" fill="url(#goldAccent)" stroke="#b45309" strokeWidth="1.2" />
            <circle cx="320" cy="298" r="2.5" fill="#78350f" opacity="0.6" />
            {/* Bottom Right Bracket */}
            <rect x="650" y="278" width="28" height="28" rx="6" fill="url(#goldAccent)" stroke="#b45309" strokeWidth="1.2" />
            <circle cx="670" cy="298" r="2.5" fill="#78350f" opacity="0.6" />

            {/* ── 7. Right-Side Industrial Rotary Dial ── */}
            <g id="rotary-encoder-dial" transform="translate(685, 204)">
              {/* Outer metallic dial ring */}
              <ellipse cx="0" cy="0" rx="20" ry="28" fill="url(#dialMetalBezel)" stroke="#475569" strokeWidth="2" />
              {/* Dial bevel steps */}
              <ellipse cx="-2" cy="0" rx="14" ry="21" fill="#64748b" />
              {/* Red Cog center */}
              <ellipse cx="-4" cy="0" rx="10" ry="15" fill="url(#dialRedCenter)" />
              {/* Metallic center knob */}
              <circle cx="-5" cy="0" r="5" fill="#f8fafc" opacity="0.8" />
            </g>

            {/* ── 8. Side Status Pill Button below dial ── */}
            <g id="status-pill-button" transform="translate(670, 260)">
              <rect x="0" y="0" width="34" height="20" rx="9" fill="#14532d" stroke="#166534" strokeWidth="1.5" />
              <rect x="3" y="3" width="28" height="14" rx="7" fill="#22c55e" />
              <text x="17" y="13.5" fontFamily="monospace" fontSize="8" fontWeight="bold" fill="#052e16" textAnchor="middle">001</text>
            </g>

            {/* ── 9. Recessed Screen Outer Bezel ── */}
            <rect
              x="336"
              y="138"
              width="318"
              height="146"
              rx="18"
              fill="url(#screenBezel)"
              stroke="#3f3f46"
              strokeWidth="3.5"
            />

            {/* ── 10. OLED / CRT Dot-Matrix Digital Display Screen ── */}
            <rect
              x="343"
              y="144"
              width="304"
              height="134"
              rx="14"
              fill="url(#screenGlass)"
            />
            {/* Dot Matrix texture grid overlay */}
            <rect
              x="343"
              y="144"
              width="304"
              height="134"
              rx="14"
              fill="url(#dotMatrixPattern)"
              opacity="0.85"
            />

            {/* Screen Inner Pulse Light when count increments */}
            {isPulsing && (
              <rect
                x="343"
                y="144"
                width="304"
                height="134"
                rx="14"
                fill="#38bdf8"
                opacity="0.22"
                filter="url(#screenGlow)"
              />
            )}

            {/* ── 11. Digital Screen Graphic Frame & Header (Reference Style) ── */}
            {/* Gantry / Measurement brackets from reference */}
            <g stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.85">
              {/* Left bracket */}
              <line x1="365" y1="168" x2="415" y2="168" />
              <line x1="365" y1="164" x2="365" y2="172" />
              {/* Right bracket */}
              <line x1="575" y1="168" x2="625" y2="168" />
              <line x1="625" y1="164" x2="625" y2="172" />
            </g>

            {/* Screen Top Badge Container */}
            <rect x="424" y="156" width="142" height="24" rx="6" fill="#18181b" stroke="#64748b" strokeWidth="1.5" />
            <text
              x="495"
              y="172"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="10"
              fontWeight="900"
              letterSpacing="1.8"
              fill="#f8fafc"
            >
              REPOSITORIES
            </text>

            {/* ── 12. Giant Crisp Dot-Matrix / Pixel Digits ── */}
            <g id="screen-counter-digits" filter="url(#screenGlow)">
              <text
                x="495"
                y="235"
                textAnchor="middle"
                fontFamily="'JetBrains Mono', ui-monospace, monospace"
                fontSize="44"
                fontWeight="900"
                letterSpacing="3"
                fill="#ffffff"
                className={`transition-all duration-300 ${isPulsing ? 'scale-105 fill-sky-300' : ''}`}
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: '0 0 16px rgba(255,255,255,0.85), 0 0 32px rgba(56,189,248,0.5)',
                }}
              >
                {smoothNumber.toLocaleString()}
              </text>
            </g>

            {/* Screen Bottom Graphic Ruler / Progress Bar */}
            <g opacity="0.75">
              <line x1="365" y1="258" x2="625" y2="258" stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" />
              <rect x="365" y="254" width="2" height="8" fill="#94a3b8" />
              <rect x="625" y="254" width="2" height="8" fill="#94a3b8" />
              {/* Dynamic Status Pill on Screen */}
              <circle cx="430" cy="258" r="3" fill="#22c55e" />
              <text
                x="440"
                y="261"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="8"
                fontWeight="700"
                letterSpacing="1.2"
                fill="#a1a1aa"
              >
                LIVE TELEMETRY INDEX
              </text>
            </g>

            {/* CRT Screen Curved Glass Reflection Shine */}
            <path
              d="M350,150 Q495,146 635,155 L610,185 Q495,178 360,182 Z"
              fill="#ffffff"
              opacity="0.08"
            />
          </g>

          {/* ═══════════════════════════════════════════════════════════════════
              LAYER 5: 3D COLLECTIBLE TABLETOP FIGURINES (RIGHT SIDE)
          ═══════════════════════════════════════════════════════════════════ */}

          {/* ── 4. Cute Yellow Voxel Chick/Bot ── */}
          <g id="chick-figurine" className="transition-transform duration-300 hover:-translate-y-1">
            {/* Yellow Voxel Body Cube */}
            <rect x="615" y="242" width="48" height="52" rx="4" fill="#facc15" />
            <rect x="615" y="242" width="48" height="10" rx="2" fill="#fef08a" />
            <rect x="655" y="246" width="8" height="48" rx="2" fill="#eab308" />
            {/* Eyes */}
            <rect x="625" y="258" width="6" height="10" rx="1" fill="#0f172a" />
            <rect x="645" y="258" width="6" height="10" rx="1" fill="#0f172a" />
            <rect x="626" y="260" width="2.5" height="3" fill="#ffffff" />
            <rect x="646" y="260" width="2.5" height="3" fill="#ffffff" />
            {/* Red Snout / Beak */}
            <rect x="629" y="272" width="18" height="14" rx="3" fill="#ef4444" />
            <rect x="629" y="272" width="18" height="4" rx="1" fill="#f87171" />
            {/* Black Block Feet */}
            <rect x="620" y="292" width="16" height="14" rx="2" fill="#09090b" />
            <rect x="644" y="292" width="16" height="14" rx="2" fill="#09090b" />
          </g>

          {/* ── 5. Purple Voxel Cat / Server Hound ── */}
          <g id="cat-figurine" className="transition-transform duration-300 hover:-translate-y-1">
            {/* Cat Main Body (stepped voxel blocks) */}
            <rect x="682" y="234" width="75" height="60" rx="4" fill="#7c3aed" />
            <rect x="682" y="234" width="75" height="10" rx="2" fill="#8b5cf6" />
            <rect x="747" y="240" width="10" height="54" rx="2" fill="#6d28d9" />
            {/* Cat Head */}
            <rect x="710" y="196" width="58" height="45" rx="4" fill="#7c3aed" />
            <rect x="710" y="196" width="58" height="8" rx="2" fill="#9333ea" />
            {/* Left Ear */}
            <rect x="712" y="180" width="14" height="20" rx="2" fill="#6d28d9" />
            {/* Right Ear */}
            <rect x="750" y="180" width="14" height="20" rx="2" fill="#6d28d9" />
            {/* Square Voxel Green Eyes */}
            <rect x="718" y="212" width="12" height="12" rx="1" fill="#10b981" />
            <rect x="722" y="215" width="4" height="6" fill="#064e3b" />
            <rect x="746" y="212" width="12" height="12" rx="1" fill="#10b981" />
            <rect x="750" y="215" width="4" height="6" fill="#064e3b" />
            {/* Red Nose */}
            <rect x="736" y="222" width="6" height="8" rx="1" fill="#ef4444" />
            {/* Tail */}
            <rect x="670" y="246" width="14" height="34" rx="3" fill="#6d28d9" />
            {/* Paws */}
            <rect x="690" y="288" width="16" height="8" rx="2" fill="#5b21b6" />
            <rect x="734" y="288" width="18" height="8" rx="2" fill="#5b21b6" />
          </g>

          {/* ── 6. Mini Sentinel Robot with Heart Core ── */}
          <g id="robot-figurine" className="transition-transform duration-300 hover:-translate-y-1">
            {/* Antenna Ring on Top */}
            <ellipse cx="830" cy="235" rx="6" ry="6" fill="none" stroke="#0284c7" strokeWidth="2.5" />
            <rect x="828" y="240" width="4" height="6" fill="#0369a1" />
            {/* Cyan Robot Head */}
            <rect x="816" y="246" width="28" height="24" rx="4" fill="#38bdf8" />
            <rect x="816" y="246" width="28" height="5" rx="2" fill="#7dd3fc" />
            {/* Eyes */}
            <rect x="821" y="254" width="4" height="4" fill="#0c4a6e" />
            <rect x="834" y="254" width="4" height="4" fill="#0c4a6e" />
            <line x1="823" y1="264" x2="837" y2="264" stroke="#0c4a6e" strokeWidth="1.5" />
            {/* Orange Robot Body with Red Heart */}
            <rect x="818" y="272" width="24" height="26" rx="4" fill="#ea580c" />
            <path
              d="M830,281 A3,3 0 0,0 825,285 Q830,292 830,292 Q830,292 835,285 A3,3 0 0,0 830,281 Z"
              fill="#ef4444"
              className="animate-pulse"
            />
            {/* Orange jointed limbs & feet */}
            <rect x="810" y="276" width="6" height="18" rx="2" fill="#c2410c" />
            <rect x="844" y="276" width="6" height="18" rx="2" fill="#c2410c" />
            <rect x="821" y="298" width="6" height="14" rx="2" fill="#c2410c" />
            <rect x="833" y="298" width="6" height="14" rx="2" fill="#c2410c" />
            <rect x="819" y="310" width="10" height="4" rx="1" fill="#7c2d12" />
            <rect x="831" y="310" width="10" height="4" rx="1" fill="#7c2d12" />
          </g>
        </svg>
      </div>
    </div>
  )
}
