// src/components/ui/AnimatedNumber.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  decimals?: number
  duration?: number
  delay?: number
  suffix?: string
  prefix?: string
  className?: string
}

export default function AnimatedNumber({
  value, decimals = 0, duration = 1.2, delay = 0, suffix = '', prefix = '', className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [value, duration, delay])

  return (
    <span className={className}>
      {prefix}{display.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}
    </span>
  )
}
