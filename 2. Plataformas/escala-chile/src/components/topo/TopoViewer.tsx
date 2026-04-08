'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Stage, Layer, Image as KonvaImage, Line, Circle, Text, Group } from 'react-konva'
import type { TopoCanvasData, Via } from '@/lib/types'

interface TopoViewerProps {
  canvasData: TopoCanvasData
  highlightedViaId?: string
  onViaHover?: (viaId: string | null) => void
  onViaClick?: (viaId: string) => void
}

export function TopoViewer({ canvasData, highlightedViaId, onViaHover, onViaClick }: TopoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [image, setImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = canvasData.imageUrl
    img.onload = () => setImage(img)
  }, [canvasData.imageUrl])

  const updateSize = useCallback(() => {
    if (!containerRef.current || !image) return
    const containerWidth = containerRef.current.offsetWidth
    const aspectRatio = image.height / image.width
    setSize({
      width: containerWidth,
      height: containerWidth * aspectRatio,
    })
  }, [image])

  useEffect(() => {
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [updateSize])

  if (!image) {
    return (
      <div ref={containerRef} className="flex h-64 w-full items-center justify-center rounded-lg bg-gris">
        <p className="text-sm text-nieve-dim">Cargando topo...</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-lg">
      <Stage width={size.width} height={size.height}>
        <Layer>
          <KonvaImage image={image} width={size.width} height={size.height} />

          {canvasData.lines.map(line => {
            const isHighlighted = line.viaId === highlightedViaId
            const pixelPoints = line.points.flatMap(p => [
              p.x * size.width,
              p.y * size.height,
            ])

            return (
              <Group key={line.viaId}>
                <Line
                  points={pixelPoints}
                  stroke={isHighlighted ? '#ffffff' : line.color}
                  strokeWidth={isHighlighted ? 4 : 2.5}
                  tension={0.4}
                  lineCap="round"
                  lineJoin="round"
                  shadowColor="black"
                  shadowBlur={isHighlighted ? 10 : 4}
                  shadowOpacity={0.8}
                  hitStrokeWidth={20}
                  onMouseEnter={() => onViaHover?.(line.viaId)}
                  onMouseLeave={() => onViaHover?.(null)}
                  onClick={() => onViaClick?.(line.viaId)}
                  onTap={() => onViaClick?.(line.viaId)}
                />
                <Group
                  x={line.labelX * size.width}
                  y={line.labelY * size.height}
                  onMouseEnter={() => onViaHover?.(line.viaId)}
                  onMouseLeave={() => onViaHover?.(null)}
                  onClick={() => onViaClick?.(line.viaId)}
                  onTap={() => onViaClick?.(line.viaId)}
                >
                  <Circle
                    radius={12}
                    fill={isHighlighted ? '#ffffff' : line.color}
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth={1}
                  />
                  <Text
                    text={line.label}
                    fontSize={11}
                    fontStyle="bold"
                    fill={isHighlighted ? '#000000' : '#ffffff'}
                    align="center"
                    verticalAlign="middle"
                    offsetX={6}
                    offsetY={6}
                    width={12}
                    height={12}
                  />
                </Group>
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}
