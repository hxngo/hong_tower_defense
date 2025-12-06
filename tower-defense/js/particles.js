/**
 * 파티클 시스템
 * 폭발, 스파크, 텍스트 등 시각 효과
 */

class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 8;
        this.vy = options.vy || (Math.random() - 0.5) * 8;
        this.size = options.size || Math.random() * 4 + 2;
        this.color = options.color || '#ff6b6b';
        this.life = options.life || 60;
        this.maxLife = this.life;
        this.gravity = options.gravity || 0.1;
        this.friction = options.friction || 0.98;
        this.type = options.type || 'circle';
        this.text = options.text || '';
        this.fontSize = options.fontSize || 16;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.life--;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;

        if (this.type === 'circle') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        } else if (this.type === 'spark') {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size * alpha;
            ctx.stroke();
        } else if (this.type === 'text') {
            ctx.font = `bold ${this.fontSize}px Orbitron`;
            ctx.fillStyle = this.color;
            ctx.textAlign = 'center';
            ctx.fillText(this.text, this.x, this.y);
        } else if (this.type === 'ring') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * (1 - alpha) * 3, 0, Math.PI * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3 * alpha;
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    update() {
        this.particles = this.particles.filter(p => p.update());
    }

    draw(ctx) {
        for (const particle of this.particles) {
            particle.draw(ctx);
        }
    }

    // 적 처치 폭발
    createExplosion(x, y, color = '#ff6b6b', count = 15) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const speed = Math.random() * 5 + 3;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: color,
                size: Math.random() * 5 + 3,
                life: Math.random() * 30 + 20,
                gravity: 0.05,
                friction: 0.96
            }));
        }
        
        // 링 이펙트
        this.particles.push(new Particle(x, y, {
            type: 'ring',
            color: color,
            size: 20,
            life: 20,
            vx: 0,
            vy: 0,
            gravity: 0
        }));
    }

    // 골드 획득 텍스트
    createGoldText(x, y, amount) {
        this.particles.push(new Particle(x, y - 20, {
            type: 'text',
            text: `+${amount}💰`,
            color: '#ffd700',
            fontSize: 18,
            vx: 0,
            vy: -2,
            life: 45,
            gravity: 0,
            friction: 1
        }));
    }

    // 데미지 텍스트
    createDamageText(x, y, damage, isCritical = false) {
        this.particles.push(new Particle(x + (Math.random() - 0.5) * 20, y - 10, {
            type: 'text',
            text: isCritical ? `${damage}!` : `${damage}`,
            color: isCritical ? '#ff006e' : '#ffffff',
            fontSize: isCritical ? 22 : 14,
            vx: (Math.random() - 0.5) * 2,
            vy: -3,
            life: 40,
            gravity: 0.1,
            friction: 0.98
        }));
    }

    // 타워 배치 이펙트
    createPlaceEffect(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i;
            this.particles.push(new Particle(x, y, {
                type: 'spark',
                vx: Math.cos(angle) * 8,
                vy: Math.sin(angle) * 8,
                color: color,
                size: 3,
                life: 25,
                gravity: 0,
                friction: 0.92
            }));
        }
    }

    // 스킬 사용 이펙트
    createSkillEffect(x, y, type) {
        if (type === 'nuke') {
            // 핵폭발 이펙트
            for (let i = 0; i < 50; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 15 + 5;
                this.particles.push(new Particle(x, y, {
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: ['#ff6b6b', '#ffd700', '#ff006e'][Math.floor(Math.random() * 3)],
                    size: Math.random() * 8 + 4,
                    life: Math.random() * 40 + 30,
                    gravity: 0.02,
                    friction: 0.97
                }));
            }
        } else if (type === 'freeze') {
            // 빙결 이펙트
            for (let i = 0; i < 30; i++) {
                this.particles.push(new Particle(
                    x + (Math.random() - 0.5) * 400,
                    y + (Math.random() - 0.5) * 400,
                    {
                        color: '#00f5ff',
                        size: Math.random() * 6 + 2,
                        life: 60,
                        vx: 0,
                        vy: -1,
                        gravity: 0,
                        friction: 1
                    }
                ));
            }
        } else if (type === 'gold') {
            // 골드 러시 이펙트
            for (let i = 0; i < 20; i++) {
                this.particles.push(new Particle(x, y, {
                    type: 'text',
                    text: '💰',
                    fontSize: Math.random() * 20 + 15,
                    vx: (Math.random() - 0.5) * 10,
                    vy: -Math.random() * 8 - 3,
                    life: 60,
                    gravity: 0.15,
                    friction: 0.99
                }));
            }
        }
    }

    // 레이저 빔 이펙트
    createLaserTrail(x1, y1, x2, y2, color) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.floor(distance / 10);
        
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            this.particles.push(new Particle(
                x1 + dx * t + (Math.random() - 0.5) * 5,
                y1 + dy * t + (Math.random() - 0.5) * 5,
                {
                    color: color,
                    size: Math.random() * 3 + 1,
                    life: 15,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    gravity: 0,
                    friction: 0.9
                }
            ));
        }
    }

    // 독 구름 이펙트
    createPoisonCloud(x, y) {
        for (let i = 0; i < 8; i++) {
            this.particles.push(new Particle(
                x + (Math.random() - 0.5) * 40,
                y + (Math.random() - 0.5) * 40,
                {
                    color: '#50fa7b',
                    size: Math.random() * 15 + 10,
                    life: 40,
                    vx: (Math.random() - 0.5) * 1,
                    vy: -Math.random() * 0.5,
                    gravity: -0.02,
                    friction: 0.98
                }
            ));
        }
    }

    clear() {
        this.particles = [];
    }
}

