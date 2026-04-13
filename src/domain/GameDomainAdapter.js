/**
 * 游戏业务逻辑层适配器
 * 这个模块将 Game 领域对象与 UI store 相连
 */

import { createGame, createSudoku } from '../domain/index.js';

class GameDomainAdapter {
  constructor() {
    this.gameInstance = null;
  }

  /**
   * 初始化游戏实例
   */
  initGame(initialGrid) {
    const sudoku = createSudoku(initialGrid);
    this.gameInstance = createGame({ sudoku });
    return this.gameInstance;
  }

  /**
   * 执行一个猜测
   */
  guess(move) {
    if (!this.gameInstance) {
      throw new Error('Game not initialized');
    }
    this.gameInstance.guess(move);
    return this.getGameState();
  }

  /**
   * 撤销
   */
  undo() {
    if (!this.gameInstance) return null;
    this.gameInstance.undo();
    return this.getGameState();
  }

  /**
   * 重做
   */
  redo() {
    if (!this.gameInstance) return null;
    this.gameInstance.redo();
    return this.getGameState();
  }

  /**
   * 重置游戏
   */
  reset() {
    if (!this.gameInstance) return null;
    this.gameInstance.reset();
    return this.getGameState();
  }

  /**
   * 获取游戏当前状态
   */
  getGameState() {
    if (!this.gameInstance) return null;
    return {
      sudoku: this.gameInstance.getSudoku(),
      grid: this.gameInstance.getSudoku().getGrid(),
      invalidCells: this.gameInstance.getSudoku().getInvalidCells(),
      won: this.gameInstance.isWon(),
      canUndo: this.gameInstance.canUndo(),
      canRedo: this.gameInstance.canRedo()
    };
  }

  /**
   * 检查可以撤销
   */
  canUndo() {
    if (!this.gameInstance) return false;
    return this.gameInstance.canUndo();
  }

  /**
   * 检查可以重做
   */
  canRedo() {
    if (!this.gameInstance) return false;
    return this.gameInstance.canRedo();
  }

  /**
   * 检查是否赢了
   */
  isWon() {
    if (!this.gameInstance) return false;
    return this.gameInstance.isWon();
  }

  /**
   * 获取游戏实例（给高级用户）
   */
  getGameInstance() {
    return this.gameInstance;
  }
}

// 创建单例适配器
export const gameDomainAdapter = new GameDomainAdapter();
