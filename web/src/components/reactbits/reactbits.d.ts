// Type declarations for copy-pasted ReactBits components (JSX sources).
// Overrides loose inference from allowJs so optional props stay optional.

declare module '@/components/reactbits/Particles' {
  interface ParticlesProps {
    particleCount?: number
    particleSpread?: number
    speed?: number
    particleColors?: string[]
    moveParticlesOnHover?: boolean
    particleHoverFactor?: number
    alphaParticles?: boolean
    particleBaseSize?: number
    sizeRandomness?: number
    cameraDistance?: number
    disableRotation?: boolean
    pixelRatio?: number
    className?: string
  }
  const Particles: React.ComponentType<ParticlesProps>
  export default Particles
}

declare module '@/components/reactbits/SpotlightCard' {
  interface SpotlightCardProps {
    children?: React.ReactNode
    className?: string
    spotlightColor?: string
  }
  const SpotlightCard: React.ComponentType<SpotlightCardProps>
  export default SpotlightCard
}

declare module '@/components/reactbits/Magnet' {
  interface MagnetProps {
    children?: React.ReactNode
    padding?: number
    disabled?: boolean
    magnetStrength?: number
    activeTransition?: string
    inactiveTransition?: string
    wrapperClassName?: string
    innerClassName?: string
  }
  const Magnet: React.ComponentType<MagnetProps>
  export default Magnet
}

declare module '@/components/reactbits/SplitText' {
  interface SplitTextProps {
    text: string
    className?: string
    delay?: number
    duration?: number
    ease?: string
    splitType?: string
    from?: { opacity?: number; y?: number }
    to?: { opacity?: number; y?: number }
    threshold?: number
    rootMargin?: string
    textAlign?: string
    tag?: string
    onLetterAnimationComplete?: () => void
  }
  const SplitText: React.ComponentType<SplitTextProps>
  export default SplitText
}

declare module '@/components/reactbits/BlurText' {
  interface BlurTextProps {
    text?: string
    delay?: number
    className?: string
    animateBy?: 'words' | 'chars'
    direction?: 'top' | 'bottom' | 'left' | 'right'
    threshold?: number
    rootMargin?: string
    animationFrom?: Record<string, unknown>
    animationTo?: Record<string, unknown>
    easing?: (t: number) => number
    onAnimationComplete?: () => void
    stepDuration?: number
  }
  const BlurText: React.ComponentType<BlurTextProps>
  export default BlurText
}

declare module '@/components/reactbits/ShinyText' {
  interface ShinyTextProps {
    text?: string
    disabled?: boolean
    speed?: number
    className?: string
    color?: string
    shineColor?: string
    spread?: number
    yoyo?: boolean
    pauseOnHover?: boolean
    direction?: 'left' | 'right'
    delay?: number
  }
  const ShinyText: React.ComponentType<ShinyTextProps>
  export default ShinyText
}