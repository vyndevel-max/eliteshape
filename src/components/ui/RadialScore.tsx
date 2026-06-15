// src/components/ui/RadialScore.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import AnimatedNumber from './AnimatedNumber'

interface RadialScoreProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  label?: string
  sublabel?: string
  color?: string
  trackColor?: string
  decimals?: number
  suffix?: string
  delay?: number
  /** Use the FORGE orange→red gradient stroke (signature "Forge Score" look) */
  gradient?: boolean
}

let gradientIdCounter = 0

export default function RadialScore({
  value,
  max = 10,
  size = 140,
  strokeWidth = 8,
  label,
  sublabel,
  color = 'var(--red)',
  trackColor = 'rgba(255,255,255,0.06)',
  decimals = 0,
  suffix = '',
  delay = 0,
  gradient = false,
}: RadialScoreProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [offset, setOffset] = useState(circumference)
  const started = useRef(false)
  const gradientId = useRef(`forge-score-gradient-${gradientIdCounter++}`)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const pct = Math.min(Math.max(value / max, 0), 1)
    const target = circumference * (1 - pct)
    const controls = animate(circumference, target, {
      duration: 1.4,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setOffset(v),
    })
    return () => controls.stop()
  }, [value, max, circumference, delay])

  const strokeColor = gradient ? `url(#${gradientId.current})` : color
  const glowColor = gradient ? '#FF6A00' : color

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="radial-ring" width={size} height={size}>
        {gradient && (
          <defs>
            <linearGradient id={gradientId.current} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF6A00" />
              <stop offset="100%" stopColor="#FF3B30" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={trackColor} strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={strokeColor} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${glowColor}66)`, transition: 'stroke-dashoffset 0.3s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-black text-white leading-none" style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.28 }}>
          <AnimatedNumber value={value} decimals={decimals} duration={1.4} delay={delay} suffix={suffix} />
        </span>
        {label && <span className="text-[10px] font-black uppercase tracking-widest text-[#555] mt-1" style={{ fontFamily: 'var(--font-display)' }}>{label}</span>}
        {sublabel && <span className="text-[9px] text-[#444] mt-0.5">{sublabel}</span>}
      </div>
    </div>
  )
}
