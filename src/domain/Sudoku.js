/**
 * Sudoku 类 - 数独领域对象
 * 职责：
 * - 持有当前 9x9 grid / board 数据
 * - 提供 guess(...) 接口进行猜测
 * - 提供校验能力 (isValid, isComplete)
 * - 提供外表化能力 (toString, toJSON)
 * - 支持 clone 用于 Undo/Redo
 */
export class Sudoku {
  constructor(initialGrid) {
    // 防御性复制初始 grid
    this.grid = this._deepCloneGrid(initialGrid);
    // 记录初始网格（用于校验和判断答案）
    this.initialGrid = this._deepCloneGrid(initialGrid);
  }

  /**
   * 执行一个猜测操作
   * @param {Object} move - { row, col, value }
   * @throws 如果位置已有初始数字则抛出错误
   */
  guess(move) {
    const { row, col, value } = move;
    
    this._validatePosition(row, col);
    
    // 不允许修改初始给定的数字
    if (this.initialGrid[row][col] !== 0) {
      throw new Error(`Cannot modify initial cell at [${row}, ${col}]`);
    }

    this.grid[row][col] = value;
  }

  /**
   * 获取当前 9x9 grid
   * 返回防御性复制，保护内部状态
   */
  getGrid() {
    return this._deepCloneGrid(this.grid);
  }

  /**
   * 获取初始网格
   */
  getInitialGrid() {
    return this._deepCloneGrid(this.initialGrid);
  }

  /**
   * 校验当前 grid 是否有效
   * （检查行、列、3x3方块是否有重复）
   */
  isValid() {
    // 检查行
    for (let row = 0; row < 9; row++) {
      const seen = new Set();
      for (let col = 0; col < 9; col++) {
        const value = this.grid[row][col];
        if (value !== 0) {
          if (seen.has(value)) return false;
          seen.add(value);
        }
      }
    }

    // 检查列
    for (let col = 0; col < 9; col++) {
      const seen = new Set();
      for (let row = 0; row < 9; row++) {
        const value = this.grid[row][col];
        if (value !== 0) {
          if (seen.has(value)) return false;
          seen.add(value);
        }
      }
    }

    // 检查 3x3 方块
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const seen = new Set();
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const value = this.grid[boxRow * 3 + i][boxCol * 3 + j];
            if (value !== 0) {
              if (seen.has(value)) return false;
              seen.add(value);
            }
          }
        }
      }
    }

    return true;
  }

  /**
   * 检查是否已完成且有效
   */
  isComplete() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.grid[row][col] === 0) {
          return false;
        }
      }
    }
    return this.isValid();
  }

  /**
   * 克隆一个独立的 Sudoku 实例
   * 用于 Undo/Redo 保存快照
   */
  clone() {
    const cloned = new Sudoku(this.grid);
    cloned.initialGrid = this._deepCloneGrid(this.initialGrid);
    return cloned;
  }

  /**
   * 转换为可序列化的 JSON 对象
   */
  toJSON() {
    return {
      grid: this.getGrid(),
      initialGrid: this.getInitialGrid()
    };
  }

  /**
   * 从 JSON 对象恢复
   */
  static fromJSON(data) {
    const sudoku = new Sudoku(data.initialGrid);
    sudoku.grid = sudoku._deepCloneGrid(data.grid);
    return sudoku;
  }

  /**
   * 可读的字符串表示
   */
  toString() {
    let result = '';
    for (let row = 0; row < 9; row++) {
      if (row % 3 === 0 && row !== 0) {
        result += '\n------+-------+------\n';
      }
      for (let col = 0; col < 9; col++) {
        if (col % 3 === 0 && col !== 0) {
          result += '| ';
        }
        result += (this.grid[row][col] || '.') + ' ';
      }
      result += '\n';
    }
    return result;
  }

  /**
   * 获取被标记为无效的单元格（与其他单元格在行/列/方块中有冲突）
   */
  getInvalidCells() {
    const invalid = new Set();

    // 检查每个非空单元格
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const value = this.grid[row][col];
        if (value === 0) continue;

        // 检查该行是否有重复
        for (let c = 0; c < 9; c++) {
          if (c !== col && this.grid[row][c] === value) {
            invalid.add(`${row},${col}`);
            invalid.add(`${row},${c}`);
          }
        }

        // 检查该列是否有重复
        for (let r = 0; r < 9; r++) {
          if (r !== row && this.grid[r][col] === value) {
            invalid.add(`${row},${col}`);
            invalid.add(`${r},${col}`);
          }
        }

        // 检查该方块是否有重复
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
          for (let j = boxCol; j < boxCol + 3; j++) {
            if ((i !== row || j !== col) && this.grid[i][j] === value) {
              invalid.add(`${row},${col}`);
              invalid.add(`${i},${j}`);
            }
          }
        }
      }
    }

    return invalid;
  }

  // ============ 私有方法 ============

  _deepCloneGrid(grid) {
    return grid.map(row => [...row]);
  }

  _validatePosition(row, col) {
    if (row < 0 || row >= 9 || col < 0 || col >= 9) {
      throw new Error(`Invalid position: [${row}, ${col}]`);
    }
  }
}

/**
 * 工厂函数 - 创建 Sudoku 实例
 */
export function createSudoku(initialGrid) {
  return new Sudoku(initialGrid);
}

/**
 * 工厂函数 - 从 JSON 恢复 Sudoku
 */
export function createSudokuFromJSON(data) {
  return Sudoku.fromJSON(data);
}
