/**
 * 적 유닛 클래스
 * 경로를 따라 이동하며 기지를 공격
 */

class Enemy {
    constructor(type, path, cellSize) {
        this.type = type;
        this.path = path;
        this.pathIndex = 0;
        this.cellSize = cellSize;
        
        // 적 타입별 속성
        const types = {
            // 기본 적들
            normal: {
                health: 100,
                maxHealth: 100,
                speed: 2,
                reward: 10,
                color: '#e74c3c',
                size: 12,
                name: '일반'
            },
            fast: {
                health: 60,
                maxHealth: 60,
                speed: 4,
                reward: 15,
                color: '#f39c12',
                size: 10,
                name: '고속'
            },
            tank: {
                health: 400,
                maxHealth: 400,
                speed: 1,
                reward: 35,
                color: '#8e44ad',
                size: 18,
                name: '탱커'
            },
            boss: {
                health: 2000,
                maxHealth: 2000,
                speed: 0.7,
                reward: 150,
                color: '#c0392b',
                size: 25,
                name: '보스'
            },
            // 새로운 적들
            healer: {
                health: 150,
                maxHealth: 150,
                speed: 1.5,
                reward: 25,
                color: '#2ecc71',
                size: 14,
                name: '힐러',
                healRadius: 80,
                healAmount: 5,
                healCooldown: 60
            },
            splitter: {
                health: 200,
                maxHealth: 200,
                speed: 1.8,
                reward: 20,
                color: '#3498db',
                size: 16,
                name: '분열체',
                splitCount: 2
            },
            stealth: {
                health: 80,
                maxHealth: 80,
                speed: 2.5,
                reward: 30,
                color: '#9b59b6',
                size: 11,
                name: '스텔스',
                isStealthed: true,
                stealthDuration: 120,
                visibleDuration: 60
            },
            armored: {
                health: 300,
                maxHealth: 300,
                speed: 1.2,
                reward: 40,
                color: '#7f8c8d',
                size: 15,
                name: '장갑',
                armor: 0.5 // 50% 데미지 감소
            }
        };
        
        const stats = types[type] || types.normal;
        Object.assign(this, stats);
        
        // 위치 초기화
        this.x = path[0].x * cellSize + cellSize / 2;
        this.y = path[0].y * cellSize + cellSize / 2;
        
        this.baseSpeed = this.speed;
        this.slowTimer = 0;
        this.poisonTimer = 0;
        this.poisonDamage = 0;
        this.poisonStacks = 0;
        this.poisonSource = null; // 독 데미지를 준 타워 추적
        this.isDead = false;
        this.reachedEnd = false;
        this.healTimer = this.healCooldown || 0;
        this.stealthTimer = this.stealthDuration || 0;
        this.isCurrentlyStealthed = this.isStealthed || false;
        
        // 시각 효과용
        this.hitFlash = 0;
        this.scale = 1;
        this.poisonDamageTaken = 0; // 총 독 데미지 추적
    }

    /**
     * 적 업데이트 (이동)
     */
    update(enemies) {
        if (this.isDead || this.reachedEnd) return;
        
        // 피격 플래시 감소
        if (this.hitFlash > 0) this.hitFlash--;
        
        // 슬로우 효과 처리
        if (this.slowTimer > 0) {
            this.slowTimer--;
            this.speed = this.baseSpeed * 0.4;
        } else {
            this.speed = this.baseSpeed;
        }
        
        // 독 데미지 처리 (매 15프레임마다 = 초당 4회)
        if (this.poisonTimer > 0) {
            this.poisonTimer--;
            this.poisonTickCounter = (this.poisonTickCounter || 0) + 1;
            
            if (this.poisonTickCounter >= 15) {
                this.poisonTickCounter = 0;
                const poisonDmg = this.poisonDamage * (1 + this.poisonStacks * 0.5);
                this.health -= poisonDmg;
                this.poisonDamageTaken += poisonDmg;
                this.showPoisonDamage = true; // 파티클 표시 플래그
                this.lastPoisonDamage = poisonDmg;
                
                if (this.health <= 0) {
                    this.health = 0;
                    this.isDead = true;
                    this.killedByPoison = true;
                }
            }
        } else {
            this.poisonStacks = 0;
            this.poisonTickCounter = 0;
        }
        
        // 힐러: 주변 적 치료
        if (this.type === 'healer' && enemies) {
            this.healTimer--;
            if (this.healTimer <= 0) {
                this.healNearbyEnemies(enemies);
                this.healTimer = this.healCooldown;
            }
        }
        
        // 스텔스: 투명화 토글
        if (this.type === 'stealth') {
            this.stealthTimer--;
            if (this.stealthTimer <= 0) {
                this.isCurrentlyStealthed = !this.isCurrentlyStealthed;
                this.stealthTimer = this.isCurrentlyStealthed ? this.stealthDuration : this.visibleDuration;
            }
        }
        
        // 다음 목표 지점
        if (this.pathIndex >= this.path.length - 1) {
            this.reachedEnd = true;
            return;
        }
        
        const target = this.path[this.pathIndex + 1];
        const targetX = target.x * this.cellSize + this.cellSize / 2;
        const targetY = target.y * this.cellSize + this.cellSize / 2;
        
        // 목표 방향으로 이동
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.speed) {
            this.x = targetX;
            this.y = targetY;
            this.pathIndex++;
        } else {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    /**
     * 주변 적 치료 (힐러)
     */
    healNearbyEnemies(enemies) {
        for (const enemy of enemies) {
            if (enemy === this || enemy.isDead) continue;
            
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.healRadius) {
                enemy.health = Math.min(enemy.maxHealth, enemy.health + this.healAmount);
            }
        }
    }

    /**
     * 적 그리기
     */
    draw(ctx) {
        if (this.isDead) return;
        
        // 스텔스 상태면 반투명
        if (this.isCurrentlyStealthed) {
            ctx.globalAlpha = 0.3;
        }
        
        // 슬로우 상태 이펙트
        if (this.slowTimer > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 212, 170, 0.3)';
            ctx.fill();
        }
        
        // 독 상태 이펙트
        if (this.poisonTimer > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(80, 250, 123, 0.4)';
            ctx.fill();
        }
        
        // 힐러 범위 표시
        if (this.type === 'healer') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.healRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // 피격 플래시
        const flashColor = this.hitFlash > 0 ? '#ffffff' : null;
        
        // 적 본체
        ctx.beginPath();
        const drawSize = this.size * this.scale;
        
        if (this.type === 'boss') {
            // 보스는 다각형
            this.drawPolygon(ctx, this.x, this.y, drawSize, 6);
        } else if (this.type === 'tank' || this.type === 'armored') {
            // 탱크/장갑은 사각형
            ctx.rect(this.x - drawSize, this.y - drawSize, drawSize * 2, drawSize * 2);
        } else if (this.type === 'splitter') {
            // 분열체는 다이아몬드
            this.drawPolygon(ctx, this.x, this.y, drawSize, 4);
        } else {
            // 나머지는 원형
            ctx.arc(this.x, this.y, drawSize, 0, Math.PI * 2);
        }
        
        // 그라데이션
        const gradient = ctx.createRadialGradient(
            this.x - drawSize/3, this.y - drawSize/3, 0,
            this.x, this.y, drawSize
        );
        gradient.addColorStop(0, flashColor || this.lightenColor(this.color, 40));
        gradient.addColorStop(1, flashColor || this.color);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 외곽선
        ctx.strokeStyle = this.darkenColor(this.color, 30);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 장갑 적 방패 아이콘
        if (this.type === 'armored') {
            ctx.fillStyle = '#bdc3c7';
            ctx.font = `${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🛡️', this.x, this.y);
        }
        
        // 힐러 아이콘
        if (this.type === 'healer') {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${this.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+', this.x, this.y);
        }
        
        ctx.globalAlpha = 1;
        
        // 체력바
        this.drawHealthBar(ctx);
    }

    /**
     * 다각형 그리기
     */
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

    /**
     * 체력바 그리기
     */
    drawHealthBar(ctx) {
        const barWidth = this.size * 2.5;
        const barHeight = 5;
        const x = this.x - barWidth / 2;
        const y = this.y - this.size - 12;
        
        // 배경
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
        
        // 체력
        const healthPercent = this.health / this.maxHealth;
        let healthColor;
        if (healthPercent > 0.6) healthColor = '#2ecc71';
        else if (healthPercent > 0.3) healthColor = '#f39c12';
        else healthColor = '#e74c3c';
        
        // 체력바 그라데이션
        const healthGradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        healthGradient.addColorStop(0, this.lightenColor(healthColor, 20));
        healthGradient.addColorStop(1, healthColor);
        ctx.fillStyle = healthGradient;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
    }

    /**
     * 데미지 받기
     */
    takeDamage(damage, ignoreArmor = false) {
        // 장갑 적은 데미지 감소
        if (this.armor && !ignoreArmor) {
            damage = Math.floor(damage * (1 - this.armor));
        }
        
        this.health -= damage;
        this.hitFlash = 8;
        this.scale = 1.2;
        setTimeout(() => this.scale = 1, 100);
        
        if (this.health <= 0) {
            this.health = 0;
            this.isDead = true;
            return { killed: true, damage: damage };
        }
        return { killed: false, damage: damage };
    }

    /**
     * 슬로우 효과 적용
     */
    applySlow(duration) {
        this.slowTimer = Math.max(this.slowTimer, duration);
    }

    /**
     * 독 효과 적용 (중첩 가능)
     */
    applyPoison(duration, damage, source = null) {
        // 기존 독이 있으면 스택 증가 (최대 5스택)
        if (this.poisonTimer > 0) {
            this.poisonStacks = Math.min((this.poisonStacks || 0) + 1, 5);
        } else {
            this.poisonStacks = 1;
        }
        
        this.poisonTimer = Math.max(this.poisonTimer, duration);
        this.poisonDamage = Math.max(this.poisonDamage, damage);
        this.poisonSource = source;
    }

    /**
     * 스텔스 해제 (감지탑 등)
     */
    revealStealth(duration) {
        if (this.type === 'stealth') {
            this.isCurrentlyStealthed = false;
            this.stealthTimer = duration;
        }
    }

    /**
     * 분열 (분열체 사망 시)
     */
    split(path, cellSize) {
        if (this.type !== 'splitter' || this.splitCount <= 0) return [];
        
        const children = [];
        for (let i = 0; i < 2; i++) {
            const child = new Enemy('fast', path, cellSize);
            child.x = this.x + (i === 0 ? -15 : 15);
            child.y = this.y;
            child.pathIndex = this.pathIndex;
            child.health = 40;
            child.maxHealth = 40;
            child.reward = 8;
            children.push(child);
        }
        return children;
    }

    /**
     * 타겟 가능 여부
     */
    canBeTargeted() {
        if (this.isDead) return false;
        if (this.isCurrentlyStealthed) return false;
        return true;
    }

    /**
     * 색상 밝게
     */
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }

    /**
     * 색상 어둡게
     */
    darkenColor(color, percent) {
        return this.lightenColor(color, -percent);
    }
}

/**
 * 웨이브 관리자
 */
class WaveManager {
    constructor(difficulty = 'normal') {
        this.currentWave = 0;
        this.enemiesRemaining = 0;
        this.waveInProgress = false;
        this.spawnTimer = 0;
        this.spawnQueue = [];
        this.difficulty = difficulty;
        
        // 웨이브 정의
        this.waves = this.generateWaves();
    }

    /**
     * 웨이브 데이터 생성
     */
    generateWaves() {
        const waves = [];
        const difficultyMultiplier = {
            easy: 0.7,
            normal: 1,
            hard: 1.5
        }[this.difficulty] || 1;
        
        for (let i = 1; i <= 25; i++) {
            const wave = {
                number: i,
                enemies: []
            };
            
            // 기본 적
            const normalCount = Math.floor((5 + i * 1.5) * difficultyMultiplier);
            for (let j = 0; j < normalCount; j++) {
                wave.enemies.push({ type: 'normal', delay: j * 25 });
            }
            
            // 웨이브 3부터 빠른 적
            if (i >= 3) {
                const fastCount = Math.floor(i * 0.5 * difficultyMultiplier);
                for (let j = 0; j < fastCount; j++) {
                    wave.enemies.push({ type: 'fast', delay: (normalCount + j) * 20 });
                }
            }
            
            // 웨이브 5부터 탱크
            if (i >= 5) {
                const tankCount = Math.floor((i - 4) * 0.3 * difficultyMultiplier) + 1;
                for (let j = 0; j < tankCount; j++) {
                    wave.enemies.push({ type: 'tank', delay: (normalCount + j) * 35 });
                }
            }
            
            // 웨이브 7부터 힐러
            if (i >= 7) {
                const healerCount = Math.floor((i - 6) * 0.2 * difficultyMultiplier) + 1;
                for (let j = 0; j < healerCount; j++) {
                    wave.enemies.push({ type: 'healer', delay: (normalCount / 2 + j) * 40 });
                }
            }
            
            // 웨이브 10부터 분열체
            if (i >= 10) {
                const splitterCount = Math.floor((i - 9) * 0.3 * difficultyMultiplier) + 1;
                for (let j = 0; j < splitterCount; j++) {
                    wave.enemies.push({ type: 'splitter', delay: (normalCount + j) * 30 });
                }
            }
            
            // 웨이브 12부터 스텔스
            if (i >= 12) {
                const stealthCount = Math.floor((i - 11) * 0.25 * difficultyMultiplier) + 1;
                for (let j = 0; j < stealthCount; j++) {
                    wave.enemies.push({ type: 'stealth', delay: j * 50 });
                }
            }
            
            // 웨이브 15부터 장갑
            if (i >= 15) {
                const armoredCount = Math.floor((i - 14) * 0.2 * difficultyMultiplier) + 1;
                for (let j = 0; j < armoredCount; j++) {
                    wave.enemies.push({ type: 'armored', delay: (normalCount + j) * 40 });
                }
            }
            
            // 웨이브 5, 10, 15, 20, 25에 보스
            if (i % 5 === 0) {
                wave.enemies.push({ type: 'boss', delay: wave.enemies.length * 30 + 60 });
            }
            
            waves.push(wave);
        }
        
        return waves;
    }

    /**
     * 웨이브 시작
     */
    startWave() {
        if (this.waveInProgress) return false;
        if (this.currentWave >= this.waves.length) return false;
        
        const wave = this.waves[this.currentWave];
        this.spawnQueue = [...wave.enemies];
        this.enemiesRemaining = wave.enemies.length;
        this.waveInProgress = true;
        this.spawnTimer = 0;
        this.currentWave++;
        
        return true;
    }

    /**
     * 스폰 업데이트
     */
    update(spawnCallback) {
        if (!this.waveInProgress || this.spawnQueue.length === 0) return;
        
        this.spawnTimer++;
        
        const toSpawn = this.spawnQueue.filter(e => e.delay <= this.spawnTimer);
        
        for (const enemy of toSpawn) {
            spawnCallback(enemy.type);
            this.spawnQueue = this.spawnQueue.filter(e => e !== enemy);
        }
    }

    /**
     * 적 처치
     */
    enemyKilled() {
        this.enemiesRemaining--;
        if (this.enemiesRemaining <= 0 && this.spawnQueue.length === 0) {
            this.waveInProgress = false;
        }
    }

    /**
     * 적이 기지 도달
     */
    enemyReachedEnd() {
        this.enemiesRemaining--;
        if (this.enemiesRemaining <= 0 && this.spawnQueue.length === 0) {
            this.waveInProgress = false;
        }
    }

    /**
     * 적 추가 (분열 등)
     */
    addEnemy(count = 1) {
        this.enemiesRemaining += count;
    }

    getWaveNumber() {
        return this.currentWave;
    }

    getTotalWaves() {
        return this.waves.length;
    }

    isAllWavesComplete() {
        return this.currentWave >= this.waves.length && !this.waveInProgress;
    }
}
