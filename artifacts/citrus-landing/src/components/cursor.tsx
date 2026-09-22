import { useEffect, useRef } from "react";

const SQUARE_SIZE = 80;

interface Cell {
  x: number;
  y: number;
  alpha: number;
  fading: boolean;
  lastTouched: number;
}

export function CursorGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: -9999, y: -9999 };
    let grid: Cell[] = [];

    function initGrid() {
      grid = [];
      for (let x = 0; x < width; x += SQUARE_SIZE) {
        for (let y = 0; y < height; y += SQUARE_SIZE) {
          grid.push({ x, y, alpha: 0, fading: false, lastTouched: 0 });
        }
      }
    }

    function getCellAt(x: number, y: number): Cell | undefined {
      return grid.find(
        (c) =>
          x >= c.x &&
          x < c.x + SQUARE_SIZE &&
          y >= c.y &&
          y < c.y + SQUARE_SIZE
      );
    }

    function onResize() {
      width = canvas!.width = window.innerWidth;
      height = canvas!.height = window.innerHeight;
      initGrid();
    }

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      const cell = getCellAt(mouse.x, mouse.y);
      if (cell && cell.alpha === 0) {
        cell.alpha = 1;
        cell.lastTouched = Date.now();
        cell.fading = false;
      }
    }

    let animId: number;

    function drawGrid() {
      ctx.clearRect(0, 0, width, height);
      const now = Date.now();

      for (const cell of grid) {
        if (cell.alpha > 0 && !cell.fading && now - cell.lastTouched > 500) {
          cell.fading = true;
        }

        if (cell.fading) {
          cell.alpha -= 0.02;
          if (cell.alpha <= 0) {
            cell.alpha = 0;
            cell.fading = false;
          }
        }

        if (cell.alpha > 0) {
          const cx = cell.x + SQUARE_SIZE / 2;
          const cy = cell.y + SQUARE_SIZE / 2;
          const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, SQUARE_SIZE);
          grad.addColorStop(0, `rgba(0, 255, 204, ${cell.alpha})`);
          grad.addColorStop(1, `rgba(0, 255, 204, 0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.3;
          ctx.strokeRect(
            cell.x + 0.5,
            cell.y + 0.5,
            SQUARE_SIZE - 1,
            SQUARE_SIZE - 1
          );
        }
      }

      animId = requestAnimationFrame(drawGrid);
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    initGrid();
    drawGrid();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 40,
      }}
    />
  );
}
