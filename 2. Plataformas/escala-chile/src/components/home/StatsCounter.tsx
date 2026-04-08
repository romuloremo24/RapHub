'use client'

import { useEffect, useRef, useState } from 'react'

interface StatsCounterProps {
  end: number
  label: string
  suffix?: string
}

export function StatsCounter({ end, label, suffix = '' }: StatsCounterProps) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const animated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true
          const duration = 1500
          const startTime = performance.now()

          function tick(now: number) {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * end))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [end])

  return (
    <div ref={ref} className="text-center">
      <p className="font-heading text-4xl font-bold text-naranja">
        {count.toLocaleString('es-CL')}{suffix}
      </p>
      <p className="mt-1 text-sm text-nieve-dim">{label}</p>
    </div>
  )
}
