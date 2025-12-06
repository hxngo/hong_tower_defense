/**
 * 타워 디펜스 게임 메인 로직
 * 맵 시스템, 스킬, 업적, 통계 포함
 */

// 맵 데이터
const MAPS = {
    easy: {
        name: '초원',
        difficulty: 'easy',
        startGold: 150,
        lives: 30,
        color: '#2d5a27',
        pathColor: '#8B7355'
    },
    normal: {
        name: '사막',
        difficulty: 'normal', 
        startGold: 100,
        lives: 20,
        color: '#c2956e',
        pathColor: '#a67c52'
    },
    hard: {
        name: '용암지대',
        difficulty: 'hard',
        startGold: 80,
        lives: 10,
        color: '#3d1f1f',
        pathColor: '#8b2500'
    }
};

// 스킬 데이터
const SKILLS = {
    nuke: {
        name: '핵폭탄',
        description: '모든 적에게 500 데미지',
        icon: '💥',
        cooldown: 1800, // 30초
        cost: 0
    },
    freeze: {
        name: '빙결',
        description: '5초간 모든 적 정지',
        icon: '❄️',
        cooldown: 1200, // 20초
        cost: 0
    },
    goldRush: {
        name: '골드 러시',
        description: '즉시 100 골드 획득',
        icon: '💰',
        cooldown: 900, // 15초
        cost: 0
    }
};

// 업적 데이터
const ACHIEVEMENTS = {
    firstBlood: { name: '첫 처치', description: '첫 적을 처치하세요', icon: '🩸', condition: (s) => s.kills >= 1 },
    killer50: { name: '학살자', description: '50마리 처치', icon: '💀', condition: (s) => s.kills >= 50 },
    killer200: { name: '대학살', description: '200마리 처치', icon: '☠️', condition: (s) => s.kills >= 200 },
    rich: { name: '부자', description: '500 골드 보유', icon: '💎', condition: (s) => s.gold >= 500 },
    builder5: { name: '건축가', description: '타워 5개 건설', icon: '🏗️', condition: (s) => s.towersBuilt >= 5 },
    builder15: { name: '요새', description: '타워 15개 건설', icon: '🏰', condition: (s) => s.towersBuilt >= 15 },
    wave10: { name: '생존자', description: '웨이브 10 도달', icon: '🌊', condition: (s) => s.wave >= 10 },
    wave20: { name: '전설', description: '웨이브 20 도달', icon: '👑', condition: (s) => s.wave >= 20 },
    perfectWave: { name: '완벽한 방어', description: '데미지 없이 웨이브 클리어', icon: '🛡️', condition: (s) => s.perfectWaves >= 1 },
    speedDemon: { name: '스피드 데몬', description: '3배속으로 플레이', icon: '⚡', condition: (s) => s.usedSpeed3x }
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 게임 상태
        this.isRunning = false;
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        this.gameSpeed = 1;
        this.currentMap = 'normal';
        
        // 게임 리소스
        this.gold = 100;
        this.lives = 20;
        this.kills = 0;
        
        // 그리드 설정
        this.cellSize = 40;
        this.cols = 0;
        this.rows = 0;
        
        // 게임 오브젝트
        this.grid = [];
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.path = [];
        
        // 타워 관련
        this.selectedTowerType = null;
        this.selectedTower = null;
        this.hoveredCell = null;
        
        // 매니저
        this.waveManager = null;
        this.pathFinder = null;
        this.particleSystem = new ParticleSystem();
        
        // 시작/끝 지점
        this.startPoint = { x: 0, y: 0 };
        this.endPoint = { x: 0, y: 0 };
        
        // 스킬
        this.skillCooldowns = { nuke: 0, freeze: 0, goldRush: 0 };
        
        // 통계
        this.stats = {
            kills: 0,
            totalDamage: 0,
            goldEarned: 0,
            goldSpent: 0,
            towersBuilt: 0,
            towersUpgraded: 0,
            towersSold: 0,
            skillsUsed: 0,
            wave: 0,
            perfectWaves: 0,
            usedSpeed3x: false,
            livesLostThisWave: 0,
            startTime: 0,
            playTime: 0
        };
        
        // 업적
        this.unlockedAchievements = new Set();
        this.achievementQueue = [];
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        this.setupEventListeners();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
        this.cols = Math.floor(this.canvas.width / this.cellSize);
        this.rows = Math.floor(this.canvas.height / this.cellSize);
        if (this.isRunning) this.draw();
    }

    setupGrid() {
        this.grid = [];
        for (let y = 0; y < this.rows; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.cols; x++) {
                this.grid[y][x] = 0;
            }
        }
        
        this.startPoint = { x: 0, y: Math.floor(this.rows / 2) };
        this.endPoint = { x: this.cols - 1, y: Math.floor(this.rows / 2) };
        this.createPath();
    }

    createPath() {
        const midY = Math.floor(this.rows / 2);
        const map = MAPS[this.currentMap];
        
        // 난이도별 경로 복잡도
        if (map.difficulty === 'easy') {
            // 단순한 S자
            this.createSimplePath(midY);
        } else if (map.difficulty === 'normal') {
            // 복잡한 S자
            this.createNormalPath(midY);
        } else {
            // 미로형
            this.createHardPath(midY);
        }
        
        this.pathFinder = new PathFinder(this.grid);
        this.path = this.pathFinder.findPath(this.startPoint, this.endPoint);
    }

    createSimplePath(midY) {
        // 왼쪽에서 오른쪽으로 단순 S자
        for (let x = 0; x < this.cols; x++) {
            for (let dy = -1; dy <= 1; dy++) {
                const y = midY + dy;
                if (y >= 0 && y < this.rows) this.grid[y][x] = 3;
            }
        }
    }

    createNormalPath(midY) {
        const topY = Math.floor(this.rows * 0.2);
        const bottomY = Math.floor(this.rows * 0.8);
        
        // 시작 → 위로 → 오른쪽 → 아래로 → 왼쪽 → 위로 → 끝
        this.drawPathLine(0, midY, Math.floor(this.cols * 0.2), midY);
        this.drawPathLine(Math.floor(this.cols * 0.2), midY, Math.floor(this.cols * 0.2), topY);
        this.drawPathLine(Math.floor(this.cols * 0.2), topY, Math.floor(this.cols * 0.6), topY);
        this.drawPathLine(Math.floor(this.cols * 0.6), topY, Math.floor(this.cols * 0.6), bottomY);
        this.drawPathLine(Math.floor(this.cols * 0.6), bottomY, Math.floor(this.cols * 0.4), bottomY);
        this.drawPathLine(Math.floor(this.cols * 0.4), bottomY, Math.floor(this.cols * 0.4), midY);
        this.drawPathLine(Math.floor(this.cols * 0.4), midY, this.cols - 1, midY);
    }

    createHardPath(midY) {
        const topY = Math.floor(this.rows * 0.15);
        const bottomY = Math.floor(this.rows * 0.85);
        const midTop = Math.floor(this.rows * 0.35);
        const midBottom = Math.floor(this.rows * 0.65);
        
        // 더 복잡한 지그재그
        this.drawPathLine(0, midY, Math.floor(this.cols * 0.15), midY);
        this.drawPathLine(Math.floor(this.cols * 0.15), midY, Math.floor(this.cols * 0.15), topY);
        this.drawPathLine(Math.floor(this.cols * 0.15), topY, Math.floor(this.cols * 0.35), topY);
        this.drawPathLine(Math.floor(this.cols * 0.35), topY, Math.floor(this.cols * 0.35), midTop);
        this.drawPathLine(Math.floor(this.cols * 0.35), midTop, Math.floor(this.cols * 0.5), midTop);
        this.drawPathLine(Math.floor(this.cols * 0.5), midTop, Math.floor(this.cols * 0.5), bottomY);
        this.drawPathLine(Math.floor(this.cols * 0.5), bottomY, Math.floor(this.cols * 0.7), bottomY);
        this.drawPathLine(Math.floor(this.cols * 0.7), bottomY, Math.floor(this.cols * 0.7), midBottom);
        this.drawPathLine(Math.floor(this.cols * 0.7), midBottom, Math.floor(this.cols * 0.85), midBottom);
        this.drawPathLine(Math.floor(this.cols * 0.85), midBottom, Math.floor(this.cols * 0.85), midY);
        this.drawPathLine(Math.floor(this.cols * 0.85), midY, this.cols - 1, midY);
    }

    drawPathLine(x1, y1, x2, y2) {
        const dx = Math.sign(x2 - x1);
        const dy = Math.sign(y2 - y1);
        let x = x1, y = y1;
        
        while (x !== x2 || y !== y2) {
            for (let offsetY = -1; offsetY <= 1; offsetY++) {
                for (let offsetX = -1; offsetX <= 1; offsetX++) {
                    const nx = x + offsetX;
                    const ny = y + offsetY;
                    if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                        this.grid[ny][nx] = 3;
                    }
                }
            }
            if (x !== x2) x += dx;
            else if (y !== y2) y += dy;
        }
    }

    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        
        document.querySelectorAll('.tower-item').forEach(item => {
            item.addEventListener('click', () => this.selectTowerType(item.dataset.tower));
        });
        
        document.getElementById('startBtn').addEventListener('click', () => this.showMapSelect());
        document.getElementById('nextWaveBtn').addEventListener('click', () => this.startNextWave());
        document.getElementById('upgradeBtn').addEventListener('click', () => this.upgradeTower());
        document.getElementById('sellBtn').addEventListener('click', () => this.sellTower());
        
        // 키보드 이벤트
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.deselectAll();
            if (e.key === 'p' || e.key === 'P') this.togglePause();
            if (e.key === '1') this.setGameSpeed(1);
            if (e.key === '2') this.setGameSpeed(2);
            if (e.key === '3') this.setGameSpeed(3);
        });
    }

    showMapSelect() {
        const overlay = document.getElementById('gameOverlay');
        const content = overlay.querySelector('.overlay-content');
        content.innerHTML = `
            <h2>🗺️ 맵 선택</h2>
            <div class="map-select">
                <div class="map-option" data-map="easy">
                    <div class="map-preview easy-map"></div>
                    <div class="map-info">
                        <span class="map-name">🌿 초원</span>
                        <span class="map-diff">쉬움</span>
                        <span class="map-desc">시작 골드: 150 | 생명력: 30</span>
                    </div>
                </div>
                <div class="map-option" data-map="normal">
                    <div class="map-preview normal-map"></div>
                    <div class="map-info">
                        <span class="map-name">🏜️ 사막</span>
                        <span class="map-diff">보통</span>
                        <span class="map-desc">시작 골드: 100 | 생명력: 20</span>
                    </div>
                </div>
                <div class="map-option" data-map="hard">
                    <div class="map-preview hard-map"></div>
                    <div class="map-info">
                        <span class="map-name">🌋 용암지대</span>
                        <span class="map-diff">어려움</span>
                        <span class="map-desc">시작 골드: 80 | 생명력: 10</span>
                    </div>
                </div>
            </div>
        `;
        
        document.querySelectorAll('.map-option').forEach(option => {
            option.addEventListener('click', () => {
                this.currentMap = option.dataset.map;
                this.startGame();
            });
        });
    }

    handleCanvasClick(e) {
        if (this.isPaused || this.isGameOver) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        
        if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) return;
        
        if (this.selectedTowerType) {
            this.placeTower(gridX, gridY);
        } else {
            this.selectTowerAt(gridX, gridY);
        }
    }

    handleCanvasMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const gridX = Math.floor(x / this.cellSize);
        const gridY = Math.floor(y / this.cellSize);
        
        if (gridX >= 0 && gridX < this.cols && gridY >= 0 && gridY < this.rows) {
            this.hoveredCell = { x: gridX, y: gridY };
        } else {
            this.hoveredCell = null;
        }
    }

    selectTowerType(type) {
        const costs = { basic: 50, sniper: 100, splash: 150, slow: 75, laser: 300, bomb: 180, poison: 120 };
        if (this.gold < costs[type]) return;
        
        document.querySelectorAll('.tower-item').forEach(item => item.classList.remove('selected'));
        
        if (this.selectedTowerType === type) {
            this.selectedTowerType = null;
        } else {
            this.selectedTowerType = type;
            document.querySelector(`[data-tower="${type}"]`)?.classList.add('selected');
        }
        
        this.selectedTower = null;
        document.getElementById('upgradePanel').style.display = 'none';
    }

    placeTower(gridX, gridY) {
        if (!this.canPlaceTower(gridX, gridY)) return;
        
        const costs = { basic: 50, sniper: 100, splash: 150, slow: 75, laser: 300, bomb: 180, poison: 120 };
        const cost = costs[this.selectedTowerType];
        if (this.gold < cost) return;
        
        const tower = new Tower(this.selectedTowerType, gridX, gridY, this.cellSize);
        this.towers.push(tower);
        this.grid[gridY][gridX] = 2;
        this.gold -= cost;
        this.stats.goldSpent += cost;
        this.stats.towersBuilt++;
        
        this.particleSystem.createPlaceEffect(tower.x, tower.y, tower.color);
        this.pathFinder.updateGrid(this.grid);
        this.updateUI();
        this.deselectAll();
        this.checkAchievements();
    }

    canPlaceTower(gridX, gridY) {
        if (gridX < 0 || gridX >= this.cols || gridY < 0 || gridY >= this.rows) return false;
        return this.grid[gridY][gridX] === 0;
    }

    selectTowerAt(gridX, gridY) {
        this.selectedTower = null;
        this.selectedTowerType = null;
        document.querySelectorAll('.tower-item').forEach(item => item.classList.remove('selected'));
        
        for (const tower of this.towers) {
            tower.selected = false;
            if (tower.gridX === gridX && tower.gridY === gridY) {
                tower.selected = true;
                this.selectedTower = tower;
            }
        }
        this.updateUpgradePanel();
    }

    deselectAll() {
        this.selectedTowerType = null;
        this.selectedTower = null;
        document.querySelectorAll('.tower-item').forEach(item => item.classList.remove('selected'));
        for (const tower of this.towers) tower.selected = false;
        document.getElementById('upgradePanel').style.display = 'none';
    }

    updateUpgradePanel() {
        const panel = document.getElementById('upgradePanel');
        if (!this.selectedTower) {
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = 'block';
        const info = this.selectedTower.getInfo();
        
        document.getElementById('selectedTowerInfo').innerHTML = `
            <strong>${info.name}</strong> Lv.${info.level}<br>
            <div class="tower-stats">
                <span>⚔️ 데미지: ${info.damage}</span>
                <span>📏 사거리: ${info.range}</span>
                <span>⏱️ 공속: ${info.fireRate}</span>
                <span>💀 처치: ${info.kills}</span>
                <span>📊 총 데미지: ${info.totalDamage}</span>
            </div>
        `;
        
        const upgradeBtn = document.getElementById('upgradeBtn');
        const upgradeCost = this.selectedTower.getUpgradeCost();
        
        if (this.selectedTower.level >= this.selectedTower.maxLevel) {
            upgradeBtn.disabled = true;
            upgradeBtn.innerHTML = 'MAX';
        } else {
            upgradeBtn.disabled = this.gold < upgradeCost;
            upgradeBtn.innerHTML = `업그레이드 💰${upgradeCost}`;
        }
        
        document.getElementById('sellBtn').innerHTML = `판매 💰${this.selectedTower.getSellPrice()}`;
    }

    upgradeTower() {
        if (!this.selectedTower) return;
        const cost = this.selectedTower.getUpgradeCost();
        if (this.gold < cost) return;
        
        if (this.selectedTower.upgrade()) {
            this.gold -= cost;
            this.stats.goldSpent += cost;
            this.stats.towersUpgraded++;
            this.particleSystem.createPlaceEffect(this.selectedTower.x, this.selectedTower.y, '#ffd700');
            this.updateUI();
            this.updateUpgradePanel();
        }
    }

    sellTower() {
        if (!this.selectedTower) return;
        const price = this.selectedTower.getSellPrice();
        this.gold += price;
        this.stats.goldEarned += price;
        this.stats.towersSold++;
        
        this.grid[this.selectedTower.gridY][this.selectedTower.gridX] = 0;
        this.towers = this.towers.filter(t => t !== this.selectedTower);
        this.pathFinder.updateGrid(this.grid);
        this.deselectAll();
        this.updateUI();
    }

    // 스킬 시스템
    useSkill(skillName) {
        if (this.skillCooldowns[skillName] > 0) return;
        
        const skill = SKILLS[skillName];
        this.skillCooldowns[skillName] = skill.cooldown;
        this.stats.skillsUsed++;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        if (skillName === 'nuke') {
            for (const enemy of this.enemies) {
                if (!enemy.isDead) {
                    const result = enemy.takeDamage(500, true);
                    if (result.killed) {
                        this.handleEnemyKilled(enemy);
                    }
                }
            }
            this.particleSystem.createSkillEffect(centerX, centerY, 'nuke');
        } else if (skillName === 'freeze') {
            for (const enemy of this.enemies) {
                enemy.applySlow(300);
            }
            this.particleSystem.createSkillEffect(centerX, centerY, 'freeze');
        } else if (skillName === 'goldRush') {
            this.gold += 100;
            this.stats.goldEarned += 100;
            this.particleSystem.createSkillEffect(centerX, centerY, 'gold');
        }
        
        this.updateUI();
        this.checkAchievements();
    }

    setGameSpeed(speed) {
        this.gameSpeed = speed;
        if (speed === 3) this.stats.usedSpeed3x = true;
        this.updateUI();
        this.checkAchievements();
    }

    togglePause() {
        if (!this.isRunning || this.isGameOver) return;
        this.isPaused = !this.isPaused;
        this.updateUI();
    }

    startGame() {
        const map = MAPS[this.currentMap];
        this.gold = map.startGold;
        this.lives = map.lives;
        this.kills = 0;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.isRunning = true;
        this.isGameOver = false;
        this.isPaused = false;
        this.skillCooldowns = { nuke: 0, freeze: 0, goldRush: 0 };
        this.stats = { ...this.stats, kills: 0, totalDamage: 0, goldEarned: 0, goldSpent: 0, 
            towersBuilt: 0, towersUpgraded: 0, towersSold: 0, skillsUsed: 0, wave: 0, 
            perfectWaves: 0, livesLostThisWave: 0, startTime: Date.now() };
        
        this.waveManager = new WaveManager(map.difficulty);
        this.setupGrid();
        
        document.getElementById('gameOverlay').classList.add('hidden');
        document.getElementById('nextWaveBtn').disabled = false;
        
        this.updateUI();
        this.gameLoop();
    }

    startNextWave() {
        if (this.waveManager.waveInProgress) return;
        
        if (this.stats.livesLostThisWave === 0 && this.stats.wave > 0) {
            this.stats.perfectWaves++;
        }
        this.stats.livesLostThisWave = 0;
        
        if (this.waveManager.startWave()) {
            this.stats.wave = this.waveManager.getWaveNumber();
            document.getElementById('nextWaveBtn').disabled = true;
            this.updateUI();
            this.checkAchievements();
        }
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        for (let i = 0; i < this.gameSpeed; i++) {
            if (!this.isPaused && !this.isGameOver) {
                this.update();
            }
        }
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // 스킬 쿨다운
        for (const skill in this.skillCooldowns) {
            if (this.skillCooldowns[skill] > 0) this.skillCooldowns[skill]--;
        }
        
        // 웨이브 매니저
        this.waveManager.update((type) => this.spawnEnemy(type));
        
        // 적 업데이트
        for (const enemy of this.enemies) {
            enemy.update(this.enemies);
            
            // 독 데미지 파티클 표시
            if (enemy.showPoisonDamage) {
                enemy.showPoisonDamage = false;
                this.particleSystem.createDamageText(
                    enemy.x + (Math.random() - 0.5) * 20, 
                    enemy.y - 10, 
                    Math.floor(enemy.lastPoisonDamage),
                    false
                );
                // 독 파티클 효과
                this.particleSystem.particles.push(new Particle(enemy.x, enemy.y, {
                    color: '#50fa7b',
                    size: 4,
                    life: 20,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -Math.random() * 2,
                    gravity: 0.05
                }));
            }
            
            if (enemy.reachedEnd && !enemy.isDead) {
                this.lives--;
                this.stats.livesLostThisWave++;
                enemy.isDead = true;
                this.waveManager.enemyReachedEnd();
                if (this.lives <= 0) this.gameOver(false);
            }
        }
        
        // 적 처치 확인 (독 데미지로 죽은 적 포함)
        for (const enemy of this.enemies) {
            if (enemy.isDead && enemy.health <= 0 && !enemy.processed) {
                enemy.processed = true;
                this.handleEnemyKilled(enemy);
            }
        }
        
        this.enemies = this.enemies.filter(e => !e.isDead);
        
        // 타워 업데이트
        for (const tower of this.towers) {
            tower.update(this.enemies, this.projectiles, this.particleSystem);
        }
        
        // 투사체 업데이트
        for (const projectile of this.projectiles) {
            projectile.update(this.enemies, this.particleSystem);
        }
        this.projectiles = this.projectiles.filter(p => !p.isDone);
        
        // 파티클 업데이트
        this.particleSystem.update();
        
        // 웨이브 완료 체크
        if (!this.waveManager.waveInProgress && this.enemies.length === 0) {
            document.getElementById('nextWaveBtn').disabled = false;
            if (this.waveManager.isAllWavesComplete()) this.gameOver(true);
        }
        
        this.updateUI();
        this.updateTowerItemStates();
    }

    handleEnemyKilled(enemy) {
        this.gold += enemy.reward;
        this.kills++;
        this.stats.kills++;
        this.stats.goldEarned += enemy.reward;
        this.waveManager.enemyKilled();
        
        this.particleSystem.createExplosion(enemy.x, enemy.y, enemy.color);
        this.particleSystem.createGoldText(enemy.x, enemy.y, enemy.reward);
        
        // 분열체 처리
        if (enemy.type === 'splitter') {
            const children = enemy.split(this.path, this.cellSize);
            for (const child of children) {
                this.enemies.push(child);
                this.waveManager.addEnemy(1);
            }
        }
        
        this.checkAchievements();
    }

    spawnEnemy(type) {
        if (!this.path || this.path.length === 0) return;
        const enemy = new Enemy(type, this.path, this.cellSize);
        this.enemies.push(enemy);
    }

    checkAchievements() {
        const s = { ...this.stats, gold: this.gold, wave: this.waveManager?.getWaveNumber() || 0 };
        
        for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
            if (!this.unlockedAchievements.has(id) && achievement.condition(s)) {
                this.unlockedAchievements.add(id);
                this.achievementQueue.push(achievement);
                this.showAchievement(achievement);
            }
        }
    }

    showAchievement(achievement) {
        const toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML = `
            <span class="achievement-icon">${achievement.icon}</span>
            <div class="achievement-info">
                <span class="achievement-title">업적 달성!</span>
                <span class="achievement-name">${achievement.name}</span>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    gameOver(victory) {
        this.isGameOver = true;
        this.isVictory = victory;
        this.stats.playTime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        
        const overlay = document.getElementById('gameOverlay');
        overlay.classList.remove('hidden');
        
        const content = overlay.querySelector('.overlay-content');
        content.innerHTML = `
            <h2>${victory ? '🎉 승리! 🎉' : '💀 게임 오버 💀'}</h2>
            <p>${victory ? '모든 웨이브를 클리어했습니다!' : `웨이브 ${this.waveManager.getWaveNumber()}에서 패배`}</p>
            <div class="game-stats">
                <h3>📊 게임 통계</h3>
                <div class="stats-grid">
                    <div class="stat-item"><span>💀 처치</span><span>${this.stats.kills}</span></div>
                    <div class="stat-item"><span>💰 획득 골드</span><span>${this.stats.goldEarned}</span></div>
                    <div class="stat-item"><span>🏗️ 건설한 타워</span><span>${this.stats.towersBuilt}</span></div>
                    <div class="stat-item"><span>⬆️ 업그레이드</span><span>${this.stats.towersUpgraded}</span></div>
                    <div class="stat-item"><span>🎯 스킬 사용</span><span>${this.stats.skillsUsed}</span></div>
                    <div class="stat-item"><span>⏱️ 플레이 시간</span><span>${Math.floor(this.stats.playTime/60)}분 ${this.stats.playTime%60}초</span></div>
                </div>
                <h3>🏆 획득한 업적 (${this.unlockedAchievements.size}개)</h3>
                <div class="achievements-list">
                    ${Array.from(this.unlockedAchievements).map(id => 
                        `<span class="achievement-badge">${ACHIEVEMENTS[id].icon} ${ACHIEVEMENTS[id].name}</span>`
                    ).join('')}
                </div>
            </div>
            <button id="restartBtn" class="btn btn-start">다시 시작</button>
        `;
        
        document.getElementById('restartBtn').addEventListener('click', () => this.showMapSelect());
    }

    draw() {
        const ctx = this.ctx;
        const map = MAPS[this.currentMap];
        
        // 배경
        ctx.fillStyle = map.color;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGrid();
        this.drawPath();
        this.drawHover();
        this.drawStartEnd();
        
        for (const tower of this.towers) tower.draw(ctx);
        for (const enemy of this.enemies) enemy.draw(ctx);
        for (const projectile of this.projectiles) projectile.draw(ctx);
        
        this.particleSystem.draw(ctx);
        
        // 일시정지 오버레이
        if (this.isPaused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 48px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText('⏸️ 일시정지', this.canvas.width / 2, this.canvas.height / 2);
            ctx.font = '24px Rajdhani';
            ctx.fillText('P키를 눌러 계속하기', this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }

    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.cols; x++) {
            ctx.beginPath();
            ctx.moveTo(x * this.cellSize, 0);
            ctx.lineTo(x * this.cellSize, this.rows * this.cellSize);
            ctx.stroke();
        }
        for (let y = 0; y <= this.rows; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * this.cellSize);
            ctx.lineTo(this.cols * this.cellSize, y * this.cellSize);
            ctx.stroke();
        }
    }

    drawPath() {
        const ctx = this.ctx;
        const map = MAPS[this.currentMap];
        
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] === 3) {
                    ctx.fillStyle = map.pathColor;
                    ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
    }

    drawHover() {
        if (!this.hoveredCell || !this.selectedTowerType) return;
        const ctx = this.ctx;
        const { x, y } = this.hoveredCell;
        const canPlace = this.canPlaceTower(x, y);
        
        ctx.fillStyle = canPlace ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 0, 110, 0.3)';
        ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
        ctx.strokeStyle = canPlace ? '#00ff88' : '#ff006e';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
        
        if (canPlace) {
            const ranges = { basic: 120, sniper: 220, splash: 100, slow: 130, laser: 140, bomb: 110, poison: 120 };
            ctx.beginPath();
            ctx.arc(x * this.cellSize + this.cellSize/2, y * this.cellSize + this.cellSize/2, ranges[this.selectedTowerType], 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    drawStartEnd() {
        const ctx = this.ctx;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = '#00ff88';
        ctx.fillText('▶', this.startPoint.x * this.cellSize + this.cellSize/2, this.startPoint.y * this.cellSize + this.cellSize/2);
        
        ctx.fillStyle = '#ff006e';
        ctx.fillText('🏠', this.endPoint.x * this.cellSize + this.cellSize/2, this.endPoint.y * this.cellSize + this.cellSize/2);
    }

    updateUI() {
        document.getElementById('gold').textContent = this.gold;
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('wave').textContent = this.waveManager?.getWaveNumber() || 0;
        document.getElementById('totalWaves').textContent = this.waveManager?.getTotalWaves() || 25;
        document.getElementById('kills').textContent = this.kills;
        
        // 게임 속도 & 스킬 버튼 업데이트
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.speed) === this.gameSpeed);
        });
        
        document.querySelectorAll('.skill-btn').forEach(btn => {
            const skillName = btn.dataset.skill;
            const cooldown = this.skillCooldowns[skillName];
            btn.disabled = cooldown > 0;
            if (cooldown > 0) {
                btn.querySelector('.skill-cooldown').textContent = Math.ceil(cooldown / 60) + 's';
            } else {
                btn.querySelector('.skill-cooldown').textContent = '';
            }
        });
    }

    updateTowerItemStates() {
        const costs = { basic: 50, sniper: 100, splash: 150, slow: 75, laser: 300, bomb: 180, poison: 120 };
        document.querySelectorAll('.tower-item').forEach(item => {
            const type = item.dataset.tower;
            item.classList.toggle('disabled', this.gold < costs[type]);
        });
    }
}

// 게임 시작
const game = new Game();

// 전역 함수 (HTML에서 호출)
function useSkill(skillName) { game.useSkill(skillName); }
function setGameSpeed(speed) { game.setGameSpeed(speed); }
