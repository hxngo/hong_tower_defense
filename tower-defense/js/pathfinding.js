/**
 * A* 경로탐색 알고리즘
 * 적이 시작점에서 끝점까지 최단 경로를 찾는데 사용
 */

class PathFinder {
    constructor(grid) {
        this.grid = grid;
        this.cols = grid[0].length;
        this.rows = grid.length;
    }

    /**
     * A* 알고리즘으로 최단 경로 찾기
     * @param {Object} start - 시작 위치 {x, y}
     * @param {Object} end - 도착 위치 {x, y}
     * @returns {Array} - 경로 배열 [{x, y}, ...]
     */
    findPath(start, end) {
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        
        const gScore = new Map();
        const fScore = new Map();
        
        const startKey = this.getKey(start.x, start.y);
        const endKey = this.getKey(end.x, end.y);
        
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, end));
        
        openSet.push({ ...start, f: fScore.get(startKey) });
        
        while (openSet.length > 0) {
            // f값이 가장 작은 노드 선택
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();
            const currentKey = this.getKey(current.x, current.y);
            
            // 목적지 도달
            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }
            
            closedSet.add(currentKey);
            
            // 이웃 노드 탐색
            const neighbors = this.getNeighbors(current);
            
            for (const neighbor of neighbors) {
                const neighborKey = this.getKey(neighbor.x, neighbor.y);
                
                if (closedSet.has(neighborKey)) continue;
                
                const tentativeGScore = gScore.get(currentKey) + 1;
                
                if (!gScore.has(neighborKey) || tentativeGScore < gScore.get(neighborKey)) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));
                    
                    const inOpenSet = openSet.some(n => n.x === neighbor.x && n.y === neighbor.y);
                    if (!inOpenSet) {
                        openSet.push({ ...neighbor, f: fScore.get(neighborKey) });
                    }
                }
            }
        }
        
        // 경로를 찾지 못함
        return null;
    }

    /**
     * 맨해튼 거리 휴리스틱
     */
    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * 좌표를 문자열 키로 변환
     */
    getKey(x, y) {
        return `${x},${y}`;
    }

    /**
     * 이웃 노드들 반환 (상하좌우)
     */
    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { x: 0, y: -1 },  // 위
            { x: 0, y: 1 },   // 아래
            { x: -1, y: 0 },  // 왼쪽
            { x: 1, y: 0 }    // 오른쪽
        ];
        
        for (const dir of directions) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;
            
            // 범위 체크
            if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                // 이동 가능한 타일인지 체크 (0 = 이동 가능, 1 = 벽, 2 = 타워)
                if (this.grid[ny][nx] === 0 || this.grid[ny][nx] === 3) {
                    neighbors.push({ x: nx, y: ny });
                }
            }
        }
        
        return neighbors;
    }

    /**
     * 경로 재구성
     */
    reconstructPath(cameFrom, current) {
        const path = [{ x: current.x, y: current.y }];
        let currentKey = this.getKey(current.x, current.y);
        
        while (cameFrom.has(currentKey)) {
            const prev = cameFrom.get(currentKey);
            path.unshift({ x: prev.x, y: prev.y });
            currentKey = this.getKey(prev.x, prev.y);
        }
        
        return path;
    }

    /**
     * 그리드 업데이트
     */
    updateGrid(grid) {
        this.grid = grid;
        this.cols = grid[0].length;
        this.rows = grid.length;
    }
}

