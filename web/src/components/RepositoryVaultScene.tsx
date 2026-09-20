/**
 * RepositoryVaultScene — 3D Diorama Desktop Scene for RepoRadar
 *
 * Modeled with high-end tactile fidelity after the reference collectible desk showcase:
 * 1. Ultra-realistic wooden tabletop with procedural wood grain, edge bevels, and cabinet base.
 * 2. Ultra-high-quality 3D Retro-Futuristic Red Vault Chest resting flat on the table:
 *    - Curved glossy red chassis with 3D perspective right flank.
 *    - Arched lid with dual red ribs and golden central latch handle with recessed slot.
 *    - 3D golden corner brackets with bevel lighting.
 *    - Industrial metallic rotary encoder dial and illuminated green status button ("COIN / 001").
 *    - Dot-matrix OLED display with gantry bracket framing, nozzle arrow, and real-time smoothly animated counter.
 *    - Absolutely static on mouse hover (no hover scale/lift).
 * 3. 3D Collectible Tabletop Figurines solidly planted directly ON the wooden desk (no gaps/floating):
 *    - Left: Voxel Bonsai Tree, Voxel Code Pup on Geared Stand, Voxel Branch Vessel.
 *    - Right: Yellow Voxel Chick, Purple Voxel Cat, Mini Sentinel Robot with pulsating heart.
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

            {/* ── High Quality Chest Red Shell Gradients (Vibrant 3D Lighting) ── */}
            <linearGradient id="chestRedBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff5a47" />
              <stop offset="20%" stopColor="#f03824" />
              <stop offset="75%" stopColor="#d22212" />
              <stop offset="100%" stopColor="#941408" />
            </linearGradient>
            <linearGradient id="chestRightFlank" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d22212" />
              <stop offset="50%" stopColor="#ab180b" />
              <stop offset="100%" stopColor="#750d03" />
            </linearGradient>
            <linearGradient id="chestLidArch" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff7866" />
              <stop offset="35%" stopColor="#f03824" />
              <stop offset="100%" stopColor="#a81608" />
            </linearGradient>
            <linearGradient id="chestBasePlinth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d62b18" />
              <stop offset="50%" stopColor="#ab1909" />
              <stop offset="100%" stopColor="#690a01" />
            </linearGradient>

            {/* ── Chest Gold / Yellow Accent Gradients (3D Bevels) ── */}
            <linearGradient id="goldAccent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff18d" />
              <stop offset="30%" stopColor="#facc15" />
              <stop offset="80%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
            <linearGradient id="goldTopFace" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#fef08a" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
            <linearGradient id="goldRib" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="35%" stopColor="#facc15" />
              <stop offset="70%" stopColor="#ffea75" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>

            {/* ── Screen Bezel & Dot Matrix Gradients ── */}
            <linearGradient id="screenBezel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c1917" />
              <stop offset="50%" stopColor="#292524" />
              <stop offset="100%" stopColor="#0c0a09" />
            </linearGradient>
            <linearGradient id="screenGlass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#090d14" />
              <stop offset="100%" stopColor="#040609" />
            </linearGradient>

            {/* ── Rotary Metallic Dial Gradients ── */}
            <radialGradient id="dialMetalBezel" cx="42%" cy="38%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#e2e8f0" />
              <stop offset="75%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#334155" />
            </radialGradient>
            <radialGradient id="dialRedCenter" cx="42%" cy="38%" r="60%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="60%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </radialGradient>

            {/* ── Green Illuminated LED Pill Gradient ── */}
            <linearGradient id="greenLedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="40%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

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
            <pattern id="dotMatrixPattern" width="5.5" height="5.5" patternUnits="userSpaceOnUse">
              <circle cx="2.75" cy="2.75" r="0.9" fill="#38bdf8" opacity="0.14" />
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
            {/* Cabinet vertical panel division seams */}
            <line x1="260" y1="352" x2="260" y2="470" stroke="#cbd5e1" strokeWidth="2.5" className="dark:stroke-slate-800" />
            <line x1="740" y1="352" x2="740" y2="470" stroke="#cbd5e1" strokeWidth="2.5" className="dark:stroke-slate-800" />
            {/* Cabinet subtle inner shadow line beneath wooden overhang */}
            <rect x="15" y="348" width="970" height="10" fill="#000000" opacity="0.18" />

            {/* ── WOODEN TABLETOP SLAB ── */}
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

            {/* ── Wooden Front Edge Bevel / Lip ── */}
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
              LAYER 2: GROUNDED CONTACT SHADOWS DIRECTLY UNDER ALL FIGURINES & CHEST
          ═══════════════════════════════════════════════════════════════════ */}
          <g id="table-contact-shadows">
            {/* Tree contact shadow */}
            <ellipse cx="60" cy="338" rx="26" ry="6" fill="#361a05" opacity="0.55" filter="url(#miniObjectBlur)" />
            {/* Geared dog stand contact shadow */}
            <ellipse cx="145" cy="338" rx="46" ry="8" fill="#361a05" opacity="0.6" filter="url(#miniObjectBlur)" />
            {/* Vessel boat contact shadow */}
            <ellipse cx="245" cy="338" rx="48" ry="9" fill="#361a05" opacity="0.6" filter="url(#miniObjectBlur)" />

            {/* CENTRAL CHEST DEEP MULTI-STAGE GROUND CONTACT SHADOW */}
            <ellipse cx="495" cy="342" rx="180" ry="18" fill="#200d02" opacity="0.75" filter="url(#softContactBlur)" />
            <ellipse cx="495" cy="340" rx="145" ry="10" fill="#140601" opacity="0.9" filter="url(#miniObjectBlur)" />

            {/* Yellow chick contact shadow */}
            <ellipse cx="638" cy="338" rx="34" ry="7" fill="#361a05" opacity="0.6" filter="url(#miniObjectBlur)" />
            {/* Purple cat contact shadow */}
            <ellipse cx="735" cy="338" rx="55" ry="8" fill="#361a05" opacity="0.6" filter="url(#miniObjectBlur)" />
            {/* Mini sentinel robot contact shadow */}
            <ellipse cx="830" cy="338" rx="24" ry="6" fill="#361a05" opacity="0.55" filter="url(#miniObjectBlur)" />
          </g>

          {/* ═══════════════════════════════════════════════════════════════════
              LAYER 3: 3D COLLECTIBLE TABLETOP FIGURINES (LEFT SIDE - GROUNDED)
          ═══════════════════════════════════════════════════════════════════ */}

          {/* ── 1. Tiny Voxel Tree (grounded at y=338) ── */}
          <g id="tree-figurine" transform="translate(0, 2)">
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
            <rect x="48" y="252" width="6" height="6" fill="#86efac" opacity="0.75" />
          </g>

          {/* ── 2. Voxel Code Dog on White Geared Pedestal (grounded at y=338) ── */}
          <g id="dog-stand-figurine" transform="translate(0, 4)">
            {/* White Pedestal Frame */}
            <rect x="105" y="246" width="76" height="88" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2.5" />
            {/* Cutout / inner hollow */}
            <rect x="119" y="260" width="48" height="60" rx="4" fill="#cbd5e1" opacity="0.5" />
            <rect x="121" y="262" width="44" height="56" rx="3" fill="#0f172a" opacity="0.25" />

            {/* Turning mechanical axle gear inside pedestal */}
            <line x1="110" y1="290" x2="176" y2="290" stroke="#059669" strokeWidth="5" strokeLinecap="round" />
            <circle cx="143" cy="290" r="14" fill="#dc2626" />
            <circle cx="143" cy="290" r="8" fill="#f87171" />
            <circle cx="143" cy="290" r="4" fill="#450a0a" />

            {/* Yellow Voxel Dog sitting on pedestal */}
            <rect x="122" y="196" width="38" height="52" rx="4" fill="#facc15" />
            <rect x="122" y="196" width="38" height="8" rx="2" fill="#fde047" />
            {/* Dog Head */}
            <rect x="102" y="172" width="36" height="30" rx="4" fill="#facc15" />
            <rect x="102" y="172" width="36" height="6" rx="2" fill="#fef08a" />
            {/* Ear */}
            <rect x="134" y="178" width="10" height="24" rx="3" fill="#78350f" />
            {/* Eye */}
            <rect x="108" y="180" width="5" height="7" rx="1" fill="#0f172a" />
            <rect x="109" y="181" width="2" height="2" fill="#ffffff" />
            {/* Snout & Tongue */}
            <rect x="94" y="186" width="12" height="12" rx="2" fill="#fde047" />
            <rect x="94" y="186" width="4" height="4" fill="#0f172a" />
            <rect x="98" y="192" width="9" height="7" rx="2" fill="#f43f5e" />
            {/* Feet */}
            <rect x="112" y="242" width="10" height="8" rx="2" fill="#ca8a04" />
            <rect x="128" y="242" width="10" height="8" rx="2" fill="#ca8a04" />
          </g>

          {/* ── 3. Voxel Branch Vessel Boat (grounded at y=338) ── */}
          <g id="vessel-figurine" transform="translate(0, 6)">
            {/* Wooden Layered Hull */}
            <polygon points="195,282 285,282 298,258 182,258" fill="#854d0e" />
            <polygon points="182,258 298,258 298,264 182,264" fill="#a16207" />
            {/* Lower dark wood hull grounded on table */}
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
              LAYER 4: HIGH QUALITY 3D RETRO-FUTURISTIC RED CHEST (MATCHING REFERENCE)
          ═══════════════════════════════════════════════════════════════════ */}
          <g id="central-vault-chest">

            {/* ── 1. Molded Stepped Pedestal Base Plinth ── */}
            <polygon
              points="326,338 664,338 650,302 340,302"
              fill="url(#chestBasePlinth)"
            />
            {/* Deep base under-shadow */}
            <rect x="326" y="333" width="338" height="6" fill="#380602" opacity="0.8" />
            {/* Front ventilation / coin slot on base */}
            <rect x="424" y="318" width="142" height="6" rx="3" fill="#380602" />
            <rect x="426" y="319" width="138" height="2" rx="1" fill="#facc15" opacity="0.8" />

            {/* ── 2. Visible 3D Perspective Right Flank (Gives true volumetric depth) ── */}
            <path
              d="M650,115 C674,115 692,135 692,160 L692,285 C692,305 672,318 648,318 Z"
              fill="url(#chestRightFlank)"
            />

            {/* ── 3. Main Red Front Chassis Body ── */}
            <rect
              x="315"
              y="112"
              width="345"
              height="194"
              rx="28"
              fill="url(#chestRedBody)"
            />

            {/* ── 4. 3D Cylindrical Curved Lid Dome ── */}
            <path
              d="M315,134 Q315,62 488,62 Q660,62 660,134 Z"
              fill="url(#chestLidArch)"
            />
            {/* Upper dome ambient specular highlight */}
            <path
              d="M328,120 Q488,76 648,120"
              stroke="#ffa599"
              strokeWidth="5"
              fill="none"
              strokeLinecap="round"
              opacity="0.85"
            />

            {/* ── 5. Dual Vertical Red Ribs Across the Lid ── */}
            <path d="M424,63 L424,134" stroke="url(#chestRedBody)" strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M424,63 L424,134" stroke="#ff7866" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
            <path d="M552,63 L552,134" stroke="url(#chestRedBody)" strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M552,63 L552,134" stroke="#ff7866" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />

            {/* ── 6. Central Top Golden Latch Handle with Recessed Slot (Image 2 style) ── */}
            <rect x="454" y="108" width="72" height="20" rx="9" fill="url(#goldAccent)" stroke="#92400e" strokeWidth="2" />
            {/* Inner dark recessed slot */}
            <rect x="468" y="114" width="44" height="8" rx="4" fill="#5c2603" />
            <line x1="472" y1="118" x2="508" y2="118" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />

            {/* ── 7. Chunky 3D Cubic Yellow Corner Caps (All 4 Corners) ── */}
            {/* Top Left Bracket */}
            <rect x="310" y="110" width="28" height="28" rx="6" fill="url(#goldAccent)" stroke="#78350f" strokeWidth="1.5" />
            <polygon points="310,110 338,110 334,115 314,115" fill="url(#goldTopFace)" />
            <circle cx="320" cy="122" r="2.5" fill="#78350f" opacity="0.7" />

            {/* Top Right Bracket */}
            <rect x="632" y="110" width="28" height="28" rx="6" fill="url(#goldAccent)" stroke="#78350f" strokeWidth="1.5" />
            <polygon points="632,110 660,110 656,115 636,115" fill="url(#goldTopFace)" />
            <circle cx="648" cy="122" r="2.5" fill="#78350f" opacity="0.7" />

            {/* Bottom Left Bracket */}
            <rect x="310" y="278" width="28" height="28" rx="6" fill="url(#goldAccent)" stroke="#78350f" strokeWidth="1.5" />
            <polygon points="310,278 338,278 334,282 314,282" fill="url(#goldTopFace)" />
            <circle cx="320" cy="296" r="2.5" fill="#78350f" opacity="0.7" />

            {/* Bottom Right Bracket */}
            <rect x="632" y="278" width="28" height="28" rx="6" fill="url(#goldAccent)" stroke="#78350f" strokeWidth="1.5" />
            <polygon points="632,278 660,278 656,282 636,282" fill="url(#goldTopFace)" />
            <circle cx="648" cy="296" r="2.5" fill="#78350f" opacity="0.7" />

            {/* ── 8. Right-Side Industrial Metallic Rotary Encoder Dial ── */}
            <g id="rotary-encoder-dial" transform="translate(684, 198)">
              {/* Outer aluminum chamfer */}
              <ellipse cx="0" cy="0" rx="20" ry="28" fill="url(#dialMetalBezel)" stroke="#334155" strokeWidth="2" />
              {/* Stepped dark metal knurled dial */}
              <ellipse cx="-2" cy="0" rx="14" ry="21" fill="#1e293b" />
              {/* Red Cog/Flower wheel center button */}
              <ellipse cx="-4" cy="0" rx="10" ry="15" fill="url(#dialRedCenter)" />
              {/* Central specular highlight glint */}
              <circle cx="-5" cy="-2" r="4.5" fill="#ffffff" opacity="0.9" />
            </g>

            {/* ── 9. Right-Side Green Status Pill Button (COIN / 001) ── */}
            <g id="status-pill-button" transform="translate(668, 254)">
              <rect x="0" y="0" width="34" height="20" rx="9" fill="#052e16" stroke="#022c22" strokeWidth="1.8" />
              <rect x="2.5" y="2.5" width="29" height="15" rx="7" fill="url(#greenLedGrad)" />
              <text x="17" y="13.5" fontFamily="monospace" fontSize="8" fontWeight="900" fill="#052e16" textAnchor="middle">001</text>
            </g>

            {/* ── 10. Deep Recessed Screen Outer Black Bezel ── */}
            <rect
              x="334"
              y="136"
              width="306"
              height="146"
              rx="20"
              fill="url(#screenBezel)"
              stroke="#09090b"
              strokeWidth="4"
            />

            {/* ── 11. OLED / CRT Dot-Matrix Digital Display Screen ── */}
            <rect
              x="341"
              y="142"
              width="292"
              height="134"
              rx="15"
              fill="url(#screenGlass)"
            />
            {/* Perforated Dot Matrix Grid Texture */}
            <rect
              x="341"
              y="142"
              width="292"
              height="134"
              rx="15"
              fill="url(#dotMatrixPattern)"
              opacity="0.9"
            />

            {/* Screen Inner Glow on Count Increments */}
            {isPulsing && (
              <rect
                x="341"
                y="142"
                width="292"
                height="134"
                rx="15"
                fill="#38bdf8"
                opacity="0.25"
                filter="url(#screenGlow)"
              />
            )}

            {/* ── 12. Screen Top Gantry Bracket & Nozzle Arrow (Exact Reference Match) ── */}
            {/* Left horizontal gantry guide line */}
            <line x1="360" y1="166" x2="416" y2="166" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="360" y="161" width="3" height="10" fill="#cbd5e1" />
            {/* Right horizontal gantry guide line */}
            <line x1="558" y1="166" x2="614" y2="166" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="611" y="161" width="3" height="10" fill="#cbd5e1" />

            {/* Central Badge Container */}
            <rect x="418" y="154" width="138" height="24" rx="5" fill="#18181b" stroke="#64748b" strokeWidth="1.5" />
            <text
              x="487"
              y="170"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="10"
              fontWeight="900"
              letterSpacing="1.6"
              fill="#f8fafc"
            >
              REPOSITORIES
            </text>
            {/* Downward pointing triangle / nozzle arrow */}
            <polygon points="483,178 491,178 487,184" fill="#94a3b8" />

            {/* ── 13. Giant Crisp Dot-Matrix Pixel Digits ── */}
            <g id="screen-counter-digits" filter="url(#screenGlow)">
              <text
                x="487"
                y="233"
                textAnchor="middle"
                fontFamily="'JetBrains Mono', ui-monospace, monospace"
                fontSize="45"
                fontWeight="900"
                letterSpacing="3"
                fill="#ffffff"
                className={`transition-all duration-300 ${isPulsing ? 'scale-105 fill-sky-300' : ''}`}
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: '0 0 16px rgba(255,255,255,0.9), 0 0 32px rgba(56,189,248,0.6)',
                }}
              >
                {smoothNumber.toLocaleString()}
              </text>
            </g>

            {/* ── 14. Bottom Measurement Scale Bar with Pointer Arrow ── */}
            <g opacity="0.8">
              <line x1="360" y1="258" x2="614" y2="258" stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" />
              <rect x="360" y="253" width="2" height="10" fill="#94a3b8" />
              <rect x="614" y="253" width="2" height="10" fill="#94a3b8" />
              {/* Pointer indicator */}
              <polygon points="483,258 491,258 487,252" fill="#22c55e" />
              <circle cx="426" cy="258" r="2.5" fill="#22c55e" />
              <text
                x="434"
                y="261"
                fontFamily="'JetBrains Mono', monospace"
                fontSize="8"
                fontWeight="700"
                letterSpacing="1.2"
                fill="#94a3b8"
              >
                LIVE RADAR TELEMETRY
              </text>
            </g>

            {/* CRT Screen Curved Glass Reflection Shine */}
            <path
              d="M346,146 Q487,142 626,152 L604,180 Q487,174 356,178 Z"
              fill="#ffffff"
              opacity="0.07"
            />
          </g>

          {/* ═══════════════════════════════════════════════════════════════════
              LAYER 5: 3D COLLECTIBLE TABLETOP FIGURINES (RIGHT SIDE - GROUNDED)
          ═══════════════════════════════════════════════════════════════════ */}

          {/* ── 4. Cute Yellow Voxel Chick (grounded at y=338 with feet flat on wood) ── */}
          <g id="chick-figurine" transform="translate(0, 32)">
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
            {/* Black Block Feet grounded flat at y=338 */}
            <rect x="620" y="292" width="16" height="14" rx="2" fill="#09090b" />
            <rect x="644" y="292" width="16" height="14" rx="2" fill="#09090b" />
          </g>

          {/* ── 5. Purple Voxel Cat / Server Hound (grounded at y=338 with paws flat on wood) ── */}
          <g id="cat-figurine" transform="translate(0, 42)">
            {/* Cat Main Body (stepped voxel blocks) */}
            <rect x="682" y="234" width="75" height="60" rx="4" fill="#7c3aed" />
            <rect x="682" y="234" width="75" height="10" rx="2" fill="#8b5cf6" />
            <rect x="747" y="240" width="10" height="54" rx="2" fill="#6d28d9" />
            {/* Cat Head */}
            <rect x="710" y="196" width="58" height="45" rx="4" fill="#7c3aed" />
            <rect x="710" y="196" width="58" height="8" rx="2" fill="#9333ea" />
            {/* Ears */}
            <rect x="712" y="180" width="14" height="20" rx="2" fill="#6d28d9" />
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
            {/* Paws grounded flat at y=338 */}
            <rect x="690" y="288" width="16" height="8" rx="2" fill="#5b21b6" />
            <rect x="734" y="288" width="18" height="8" rx="2" fill="#5b21b6" />
          </g>

          {/* ── 6. Mini Sentinel Robot with Heart Core (grounded at y=338 with feet flat on wood) ── */}
          <g id="robot-figurine" transform="translate(0, 24)">
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
            {/* Orange jointed limbs & feet grounded flat at y=338 */}
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
