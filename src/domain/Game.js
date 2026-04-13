import { Sudoku } from './Sudoku.js';

/**
 * Game 类 - 数独游戏管理对象
 * 职责：
 * - 持有当前 Sudoku 实例
 * - 管理游戏历史（Undo/Redo）
 * - 提供 undo() / redo() 方法
 * - 提供 guess 代理给 Sudoku
 * - 对外提供面向 UI 的游戏操作入口
 * - 支持序列化和反序列化
 */
export class Game {
  constructor({ sudoku, maxHistorySize = 100 } = {}) {
    if (!sudoku) {
      throw new Error('Game requires a Sudoku instance');
    }

    this.sudoku = sudoku;
    this.maxHistorySize = maxHistorySize;
    
    // Undo/Redo 历史堆栈
    // past 表示可以 undo 的状态快照
    // future 表示可以 redo 的状态快照
    this.past = [];
    this.future = [];

    // 订阅者列表（用于 Svelte store 适配）
    this.subscribers = [];
  }

  /**
   * 执行一个猜测
   * 该操作会：
   * 1. 清空 redo 历史
   * 2. 保存当前状态到 past
   * 3. 在 sudoku 上执行 guess
   * 4. 通知所有订阅者
   */
  guess(move) {
    // 在执行新操作前，先保存当前状态
    this.past.push(this.sudoku.clone());
    
    // 清空 redo 历史（因为有新操作了）
    this.future = [];

    // 限制历史大小
    if (this.past.length > this.maxHistorySize) {
      this.past.shift();
    }

    // 在当前 sudoku 上执行操作
    this.sudoku.guess(move);

    // 通知订阅者
    this._notifySubscribers();
  }

  /**
   * 撤销最后一个操作
   */
  undo() {
    if (!this.canUndo()) {
      return;
    }

    // 保存当前状态到 future
    this.future.push(this.sudoku.clone());

    // 从 past 恢复
    this.sudoku = this.past.pop();

    // 通知订阅者
    this._notifySubscribers();
  }

  /**
   * 重做最后一个被撤销的操作
   */
  redo() {
    if (!this.canRedo()) {
      return;
    }

    // 保存当前状态到 past
    this.past.push(this.sudoku.clone());

    // 从 future 恢复
    this.sudoku = this.future.pop();

    // 通知订阅者
    this._notifySubscribers();
  }

  /**
   * 检查是否可以撤销
   */
  canUndo() {
    return this.past.length > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo() {
    return this.future.length > 0;
  }

  /**
   * 获取当前 Sudoku 实例
   */
  getSudoku() {
    return this.sudoku;
  }

  /**
   * 检查游戏是否赢了
   */
  isWon() {
    return this.sudoku.isComplete();
  }

  /**
   * 重置游戏到初始状态
   */
  reset() {
    this.past = [];
    this.future = [];
    // 重新创建 sudoku 以清除所有改动
    const initialGrid = this.sudoku.getInitialGrid();
    this.sudoku = new Sudoku(initialGrid);
    this._notifySubscribers();
  }

  /**
   * 序列化为 JSON
   */
  toJSON() {
    return {
      sudoku: this.sudoku.toJSON(),
      past: this.past.map(s => s.toJSON()),
      future: this.future.map(s => s.toJSON()),
      maxHistorySize: this.maxHistorySize
    };
  }

  /**
   * 从 JSON 恢复
   */
  static fromJSON(data) {
    const game = new Game({
      sudoku: Sudoku.fromJSON(data.sudoku),
      maxHistorySize: data.maxHistorySize
    });
    game.past = data.past.map(s => Sudoku.fromJSON(s));
    game.future = data.future.map(s => Sudoku.fromJSON(s));
    return game;
  }

  /**
   * 订阅游戏状态变化
   * 返回一个取消订阅函数
   */
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // ============ 私有方法 ============

  _notifySubscribers() {
    const state = this._getGameState();
    this.subscribers.forEach(cb => cb(state));
  }

  _getGameState() {
    return {
      sudoku: this.sudoku,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      won: this.isWon(),
      grid: this.sudoku.getGrid(),
      invalidCells: this.sudoku.getInvalidCells()
    };
  }
}

/**
 * 工厂函数 - 创建 Game 实例
 */
export function createGame(options) {
  return new Game(options);
}

/**
 * 工厂函数 - 从 JSON 恢复 Game
 */
export function createGameFromJSON(data) {
  return Game.fromJSON(data);
}
