'use client'

import { useState } from 'react'
import { getGradeColor, convertGrade, BOULDER_GRADES } from '@/lib/grades'
import { cn } from '@/lib/utils'

interface GradeTagProps {
  grade: string
  className?: string
}

export function GradeTag({ grade, className }: GradeTagProps) {
  const [showYds, setShowYds] = useState(false)
  const colorClass = getGradeColor(grade)
  const isBoulder = grade.startsWith('V')
  const yds = isBoulder
    ? BOULDER_GRADES[grade]?.french ?? grade
    : convertGrade(grade, 'yds')

  return (
    <span
      className={cn(
        'relative inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold cursor-default',
        colorClass,
        className
      )}
      onMouseEnter={() => setShowYds(true)}
      onMouseLeave={() => setShowYds(false)}
    >
      {grade}
      {showYds && yds !== grade && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gris px-2 py-1 text-xs text-nieve shadow-lg z-10">
          {isBoulder ? `≈ ${yds}` : yds}
        </span>
      )}
    </span>
  )
}
