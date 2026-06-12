import { useEffect, useRef } from 'react';
import type { SpriteData } from './pixel-types';
import { createPixelCharacterTemplates, PIXEL_CHARACTER_PRESETS } from './sprites/pixelCharacters';

const CHARACTER_TEMPLATES = createPixelCharacterTemplates();

export type PixelCharacterPose = 'idle' | 'walk' | 'typing' | 'reading';

interface PixelCharacterPreviewProps {
  palette: number;
  pose?: PixelCharacterPose;
  size?: number;
  animated?: boolean;
  className?: string;
  title?: string;
}

function drawSprite(ctx: CanvasRenderingContext2D, sprite: SpriteData): void {
  ctx.clearRect(0, 0, 32, 32);
  ctx.imageSmoothingEnabled = false;
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const color = sprite[row][col];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(col, row, 1, 1);
    }
  }
}

function getFrame(palette: number, pose: PixelCharacterPose, frame: number): SpriteData {
  const template = CHARACTER_TEMPLATES[palette % CHARACTER_TEMPLATES.length] ?? CHARACTER_TEMPLATES[0];
  if (pose === 'walk') return template.down[[0, 1, 2, 1][frame % 4]];
  if (pose === 'typing') return template.down[3 + (frame % 2)];
  if (pose === 'reading') return template.down[5 + (frame % 2)];
  return template.down[1];
}

export function pixelCharacterName(palette: number): string {
  return PIXEL_CHARACTER_PRESETS[palette % PIXEL_CHARACTER_PRESETS.length]?.label ?? 'Pixel Agent';
}

export default function PixelCharacterPreview({
  palette,
  pose = 'idle',
  size = 64,
  animated = false,
  className,
  title,
}: PixelCharacterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let raf = 0;
    let frame = 0;
    let lastTime = 0;

    const render = (time: number) => {
      if (!animated || time - lastTime > 220) {
        drawSprite(ctx, getFrame(palette, pose, frame));
        frame += 1;
        lastTime = time;
      }
      if (animated) raf = requestAnimationFrame(render);
    };

    render(0);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [animated, palette, pose]);

  return (
    <canvas
      ref={canvasRef}
      width={32}
      height={32}
      className={className}
      role="img"
      aria-label={title ?? pixelCharacterName(palette)}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        display: 'block',
      }}
    />
  );
}
