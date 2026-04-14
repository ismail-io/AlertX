import { useEffect, useRef } from 'react';

interface Props {
  opacity?: number;
  color?: string;
}

export default function MatrixRain({ opacity = 0.18, color = '#ef4444' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const fontSize = 12;
    const chars = 'ALERTX01アイウエカキクサシスタチツABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*∑∆∇≈≠';
    let cols = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(cols).fill(1).map(() => Math.random() * -50);

    const draw = () => {
      ctx.fillStyle = 'rgba(5,5,5,0.055)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      cols = Math.floor(canvas.width / fontSize);
      while (drops.length < cols) drops.push(Math.random() * -50);

      for (let i = 0; i < Math.min(drops.length, cols); i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const r = Math.random();
        // Mostly accent red, occasional bright white flash
        if (r > 0.97) {
          ctx.fillStyle = '#ffffff';
        } else if (r > 0.88) {
          ctx.fillStyle = '#ff6666';
        } else {
          ctx.fillStyle = color;
        }

        ctx.font = `${fontSize}px "JetBrains Mono", monospace`;
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      ro.disconnect();
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity, pointerEvents: 'none' }}
    />
  );
}
