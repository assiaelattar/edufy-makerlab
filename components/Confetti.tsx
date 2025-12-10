import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
    duration?: number;
}

export const Confetti: React.FC<ConfettiProps> = ({ duration = 3000 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Particle[] = [];
        const colors = ['#a864fd', '#29cdff', '#78ff44', '#ff718d', '#fdff6a'];

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            color: string;
            alpha: number;
            size: number;

            constructor(x: number, y: number) {
                this.x = x;
                this.y = y;
                this.vx = (Math.random() - 0.5) * 10;
                this.vy = (Math.random() - 1) * 10 - 5;
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.alpha = 1;
                this.size = Math.random() * 5 + 5;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.2; // Gravity
                this.alpha -= 0.01;
            }

            draw(ctx: CanvasRenderingContext2D) {
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        const createBurst = (x: number, y: number) => {
            for (let i = 0; i < 50; i++) {
                particles.push(new Particle(x, y));
            }
        };

        // Initial burst
        createBurst(window.innerWidth / 2, window.innerHeight / 2);

        let animationId: number;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.update();
                p.draw(ctx);

                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                }
            }

            if (particles.length > 0) {
                animationId = requestAnimationFrame(animate);
            }
        };

        animate();

        // Cleanup
        const timer = setTimeout(() => {
            // Stop logical updates eventually
        }, duration);

        return () => {
            cancelAnimationFrame(animationId);
            clearTimeout(timer);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[100]"
        />
    );
};
