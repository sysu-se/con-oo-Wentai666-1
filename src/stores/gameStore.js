/**
 * 备用的 Game Store 实现
 * 这个文件提供了一个独立的 store 适配层
 * 如果需要在组件中直接使用，可以使用这个
 */

import { writable, derived, get } from 'svelte/store';
import { createGame, createSudoku } from '../domain/index.js';

/**
 * 创建游戏数据 store 适配层
 * 这个适配层将我们的 Game / Sudoku 领域对象与 Svelte 的响应式系统连接起来
 * 
 * 返回一个包含：
 * - 响应式状态（store）：grid, invalidCells, won, canUndo, canRedo
 * - 响应式命令（方法）：guess, undo, redo, reset
 */
export function createGameStore() {
  // 内部持有的领域对象
  let gameInstance = null;

  // 响应式状态 store
  const gridStore = writable(null);
  const invalidCellsStore = writable(new Set());
  const wonStore = writable(false);
  const canUndoStore = writable(false);
  const canRedoStore = writable(false);

  /**
   * 初始化游戏
   */
  function initialize(initialGrid) {
    const sudoku = createSudoku(initialGrid);
    gameInstance = createGame({ sudoku });

    // 订阅游戏变化，更新所有响应式状态
    gameInstance.subscribe(updateState);

    // 初始状态更新
    updateState(gameInstance._getGameState());
  }

  /**
   * 更新所有响应式状态
   */
  function updateState(gameState) {
    gridStore.set(gameState.grid);
    invalidCellsStore.set(gameState.invalidCells);
    wonStore.set(gameState.won);
    canUndoStore.set(gameState.canUndo);
    canRedoStore.set(gameState.canRedo);
  }

  /**
   * 执行猜测
   */
  function guess(move) {
    if (!gameInstance) return;
    gameInstance.guess(move);
  }

  /**
   * 撤销
   */
  function undo() {
    if (!gameInstance) return;
    gameInstance.undo();
  }

  /**
   * 重做
   */
  function redo() {
    if (!gameInstance) return;
    gameInstance.redo();
  }

  /**
   * 重置游戏
   */
  function reset() {
    if (!gameInstance) return;
    gameInstance.reset();
  }

  /**
   * 获取当前游戏实例（用于高级操作）
   */
  function getGameInstance() {
    return gameInstance;
  }

  return {
    // 响应式状态
    grid: { subscribe: gridStore.subscribe },
    invalidCells: { subscribe: invalidCellsStore.subscribe },
    won: { subscribe: wonStore.subscribe },
    canUndo: { subscribe: canUndoStore.subscribe },
    canRedo: { subscribe: canRedoStore.subscribe },

    // 命令方法
    initialize,
    guess,
    undo,
    redo,
    reset,
    getGameInstance
  };
}

// 创建全局游戏 store 实例（可选）
export const gameStore = createGameStore();
