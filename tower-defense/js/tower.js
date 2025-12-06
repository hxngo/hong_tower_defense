/**
 * 타워 클래스
 * 적을 공격하는 방어 건물
 */

class Tower {
    constructor(type, gridX, gridY, cellSize) {
        this.type = type;
        this.gridX = gridX;
        this.gridY = gridY;
        this.cellSize = cellSize;
        this.x = gridX * cellSize + cellSize / 2;
        this.y = gridY * cellSize + cellSize / 2;
        this.level = 1;
        this.maxLevel = 3;
        
        // 타워 타입별 속성
        const types = {
            basic: {
                damage: 25,
                range: 120,
                fireRate: 30,
                cost: 50,
                color: '#4a90d9',
                name: '기본 타워',
                description: '균형잡힌 성능',
                projectileColor: '#4a90d9',
                projectileSpeed: 8
            },
            sniper: {
                damage: 120,
                range: 220,
                fireRate: 90,
                cost: 100,
                color: '#9b59b6',
                name: '스나이퍼 타워',
                description: '높은 데미지, 긴 사거리',
                projectileColor: '#9b59b6',
                projectileSpeed: 18,
                critChance: 0.25,
                critMultiplier: 2.5
            },
            splash: {
                damage: 35,
                range: 100,
                fireRate: 55,
                cost: 150,
                color: '#e74c3c',
                name: '스플래시 타워',
                description: '범위 공격',
                splashRadius: 60,
                projectileColor: '#e74c3c',
                projectileSpeed: 6
            },
            slow: {
                damage: 10,
                range: 130,
                fireRate: 25,
                cost: 75,
                color: '#00d4aa',
                name: '슬로우 타워',
                description: '적 이동속도 60% 감소',
                slowDuration: 90,
                projectileColor: '#00d4aa',
                projectileSpeed: 10
            },
            laser: {
                damage: 2,
                range: 140,
                fireRate: 1,
                cost: 300,
                color: '#ff006e',
                name: '레이저 타워',
                description: '연속 레이저 빔 (같은 적 집중 시 데미지 증가)',
                projectileColor: '#ff006e',
                isLaser: true,
                damageRampUp: 0.03,
                maxRampUp: 1.5
            },
            bomb: {
                damage: 150,
                range: 110,
                fireRate: 120,
                cost: 180,
                color: '#f39c12',
                name: '폭탄 타워',
                description: '강력한 범위 폭발',
                splashRadius: 80,
                projectileColor: '#f39c12',
                projectileSpeed: 4,
                stunDuration: 30
            },
            poison: {
                damage: 10,
                range: 130,
                fireRate: 40,
                cost: 120,
                color: '#50fa7b',
                name: '독 타워',
                description: '지속 독 데미지 (중첩 가능, 최대 5스택)',
                poisonDuration: 240,
                poisonDamage: 5,
                projectileColor: '#50fa7b',
                projectileSpeed: 8
            }
        };
        
        const stats = types[type] || types.basic;
        Object.assign(this, stats);
        
        this.baseDamage = this.damage;
        this.baseRange = this.range;
        this.baseFireRate = this.fireRate;
        
        this.fireCooldown = 0;
        this.target = null;
        this.angle = 0;
        this.selected = false;
        this.totalDamage = 0;
        this.kills = 0;
        
        this.laserTarget = null;
        this.laserDamageStack = 0;
        this.laserActive = false;
    }

    update(enemies, projectiles, particleSystem) {
        if (this.fireCooldown > 0) this.fireCooldown--;
        
        this.findTarget(enemies);
        
        if (this.isLaser) {
            this.updateLaser(enemies, particleSystem);
            return;
        }
        
        if (this.target && this.fireCooldown <= 0) {
            this.fire(projectiles);
            this.fireCooldown = this.fireRate;
        }
        
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.angle = Math.atan2(dy, dx);
        }
    }

    updateLaser(enemies, particleSystem) {
        if (this.target && this.target.canBeTargeted()) {
            this.laserActive = true;
            
            // 타겟이 바뀌면 스택 리셋
            if (this.laserTarget !== this.target) {
                this.laserDamageStack = 0;
            }
            this.laserTarget = this.target;
            
            // 스택 증가 (최대치 제한)
            const maxStack = this.maxRampUp || 1.5;
            this.laserDamageStack = Math.min(this.laserDamageStack + this.damageRampUp, maxStack);
            
            const actualDamage = Math.floor(this.damage * (1 + this.laserDamageStack));
            const result = this.target.takeDamage(actualDamage, true);
            this.totalDamage += result.damage;
            if (result.killed) this.kills++;
            
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.angle = Math.atan2(dy, dx);
            
            if (particleSystem && Math.random() < 0.2) {
                particleSystem.createLaserTrail(this.x, this.y, this.target.x, this.target.y, this.color);
            }
        } else {
            this.laserActive = false;
            this.laserTarget = null;
            this.laserDamageStack = 0;
        }
    }

    findTarget(enemies) {
        this.target = null;
        let bestScore = -1;
        
        for (const enemy of enemies) {
            if (!enemy.canBeTargeted()) continue;
            
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.range) {
                const score = enemy.pathIndex * 100 + (1 - enemy.health / enemy.maxHealth) * 50;
                if (score > bestScore) {
                    this.target = enemy;
                    bestScore = score;
                }
            }
        }
    }

    fire(projectiles) {
        if (!this.target) return;
        
        const projectile = new Projectile(
            this.x, this.y, this.target, this.damage,
            this.projectileSpeed, this.projectileColor, this.type, this
        );
        
        if (this.splashRadius) projectile.splashRadius = this.splashRadius;
        if (this.stunDuration) projectile.stunDuration = this.stunDuration;
        if (this.slowDuration) projectile.slowDuration = this.slowDuration;
        if (this.poisonDuration) {
            projectile.poisonDuration = this.poisonDuration;
            projectile.poisonDamage = this.poisonDamage;
        }
        if (this.critChance) {
            projectile.critChance = this.critChance;
            projectile.critMultiplier = this.critMultiplier;
        }
        
        projectiles.push(projectile);
    }

    draw(ctx) {
        if (this.selected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        if (this.isLaser && this.laserActive && this.laserTarget) {
            const gradient = ctx.createLinearGradient(this.x, this.y, this.laserTarget.x, this.laserTarget.y);
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(0.5, '#ffffff');
            gradient.addColorStop(1, this.color);
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.laserTarget.x, this.laserTarget.y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3 + this.laserDamageStack * 2;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            ctx.beginPath();
            ctx.arc(this.laserTarget.x, this.laserTarget.y, 8 + this.laserDamageStack * 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
        }
        
        ctx.beginPath();
        const baseSize = this.cellSize * 0.38;
        
        if (this.type === 'bomb') {
            this.drawPolygon(ctx, this.x, this.y, baseSize, 8);
        } else if (this.type === 'laser') {
            this.drawPolygon(ctx, this.x, this.y, baseSize, 4);
        } else {
            ctx.arc(this.x, this.y, baseSize, 0, Math.PI * 2);
        }
        
        const gradient = ctx.createRadialGradient(this.x - 5, this.y - 5, 0, this.x, this.y, baseSize);
        gradient.addColorStop(0, this.lightenColor(this.color, 50));
        gradient.addColorStop(0.7, this.color);
        gradient.addColorStop(1, this.darkenColor(this.color, 20));
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = this.lightenColor(this.color, 30);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        if (!this.isLaser) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            
            ctx.beginPath();
            ctx.roundRect(0, -5, this.cellSize * 0.45, 10, 3);
            ctx.fillStyle = this.darkenColor(this.color, 20);
            ctx.fill();
            ctx.restore();
        }
        
        if (this.level > 1) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 11px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('★'.repeat(this.level - 1), this.x, this.y + baseSize + 12);
        }
        
        if (this.selected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, baseSize + 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }

    drawPolygon(ctx, x, y, radius, sides) {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 / sides) * i - Math.PI / 2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    upgrade() {
        if (this.level >= this.maxLevel) return false;
        this.level++;
        this.damage = Math.floor(this.baseDamage * (1 + this.level * 0.5));
        this.range = Math.floor(this.baseRange * (1 + this.level * 0.12));
        this.fireRate = Math.max(5, Math.floor(this.baseFireRate * (1 - this.level * 0.12)));
        return true;
    }

    getUpgradeCost() { return Math.floor(this.cost * 0.6 * this.level); }
    getSellPrice() { return Math.floor(this.cost * 0.5 + this.cost * 0.3 * (this.level - 1)); }
    
    getInfo() {
        return {
            name: this.name,
            level: this.level,
            damage: this.isLaser ? `${this.damage}~${Math.floor(this.damage * 4)}/프레임` : this.damage,
            range: this.range,
            fireRate: this.isLaser ? '연속' : (60 / this.fireRate).toFixed(1) + '/초',
            totalDamage: this.totalDamage,
            kills: this.kills
        };
    }

    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
    
    darkenColor(color, percent) { return this.lightenColor(color, -percent); }
}

class Projectile {
    constructor(x, y, target, damage, speed, color, type, tower) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.color = color;
        this.type = type;
        this.tower = tower;
        this.size = type === 'bomb' ? 10 : 5;
        this.isDone = false;
        this.splashRadius = 0;
        this.slowDuration = 0;
        this.poisonDuration = 0;
        this.poisonDamage = 0;
        this.stunDuration = 0;
        this.critChance = 0;
        this.critMultiplier = 1;
        this.rotation = 0;
    }

    update(enemies, particleSystem) {
        if (this.isDone) return;
        this.rotation += 0.2;
        
        if (!this.target || this.target.isDead) {
            this.isDone = true;
            return;
        }
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.speed + this.target.size) {
            this.hit(enemies, particleSystem);
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    hit(enemies, particleSystem) {
        this.isDone = true;
        const isCritical = Math.random() < this.critChance;
        let actualDamage = isCritical ? Math.floor(this.damage * this.critMultiplier) : this.damage;
        
        if (this.splashRadius > 0) {
            for (const enemy of enemies) {
                if (enemy.isDead) continue;
                const dx = enemy.x - this.target.x;
                const dy = enemy.y - this.target.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= this.splashRadius) {
                    const falloff = 1 - (distance / this.splashRadius) * 0.5;
                    const result = enemy.takeDamage(Math.floor(actualDamage * falloff));
                    if (this.tower) {
                        this.tower.totalDamage += result.damage;
                        if (result.killed) this.tower.kills++;
                    }
                    if (this.stunDuration > 0) enemy.applySlow(this.stunDuration);
                    if (particleSystem) particleSystem.createDamageText(enemy.x, enemy.y, result.damage);
                }
            }
            if (particleSystem) particleSystem.createExplosion(this.target.x, this.target.y, this.color, 20);
        } else {
            const result = this.target.takeDamage(actualDamage);
            if (this.tower) {
                this.tower.totalDamage += result.damage;
                if (result.killed) this.tower.kills++;
            }
            if (particleSystem) particleSystem.createDamageText(this.target.x, this.target.y, result.damage, isCritical);
        }
        
        if (this.slowDuration > 0) this.target.applySlow(this.slowDuration);
        if (this.poisonDuration > 0) {
            this.target.applyPoison(this.poisonDuration, this.poisonDamage, this.tower);
            if (particleSystem) particleSystem.createPoisonCloud(this.target.x, this.target.y);
        }
    }

    draw(ctx) {
        if (this.isDone) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
        
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const angle = Math.atan2(dy, dx);
            
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - Math.cos(angle) * 18, this.y - Math.sin(angle) * 18);
            const gradient = ctx.createLinearGradient(this.x, this.y, this.x - Math.cos(angle) * 18, this.y - Math.sin(angle) * 18);
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(1, 'transparent');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.size * 0.8;
            ctx.stroke();
        }
    }
}

