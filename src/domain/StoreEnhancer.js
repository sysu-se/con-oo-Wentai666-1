/**
 * Store 增强器 - 将领域对象 Game 与 UI store 连接
 * 这个模块负责：
 * 1. 拦截 userGrid.set 操作，通过 Game 对象执行
 * 2. 监听 Game 对象的变化，更新 UI store
 * 3. 同步 Undo/Redo 操作
 */

import { get } from 'svelte/store';
import { createGame, createSudoku } from '../domain/index.js';

export function enhanceGridStoreWithDomain(userGridStore, gridStore, invalidCellsStore) {
  let gameInstance = null;

  /**
   * 初始化游戏领域对象
   */
  function initializeDomain(initialGrid) {
    const sudoku = createSudoku(initialGrid);
    gameInstance = createGame({ sudoku });

    // 订阅游戏变化，更新 UI store
    gameInstance.subscribe((state) => {
      // 更新 userGrid 显示（从领域对象的 grid）
      const gridArray = state.grid;
      userGridStore.set(gridArray);

      // 更新 invalidCells（从领域对象计算）
      // 需要转换为数组字符串格式 "x,y"
      const invalid = Array.from(state.invalidCells);
      invalidCellsStore.set(invalid);
    });

    return gameInstance;
  }

  /**
   * 劫持 set 操作，通过 Game 对象执行猜测
   */
  function interceptSet(pos, value) {
    if (!gameInstance) {
      throw new Error('Domain not initialized. Call enhanceGridStoreWithDomain.initializeDomain first.');
    }

    try {
      // 清除笔记/候选数字（如果需要）
      // 这里只执行 guess，不处理笔记逻辑

      gameInstance.guess({ row: pos.y, col: pos.x, value });
    } catch (error) {
      console.error('Guess error:', error);
      // 如果猜测失败，不更新 UI（将由 catch 所有者处理）
      throw error;
    }
  }

  /**
   * 撤销最后一个操作
   */
  function undo() {
    if (!gameInstance || !gameInstance.canUndo()) {
      return;
    }
    gameInstance.undo();
  }

  /**
   * 重做最后一个被撤销的操作
   */
  function redo() {
    if (!gameInstance || !gameInstance.canRedo()) {
      return;
    }
    gameInstance.redo();
  }

  /**
   * 检查是否可以撤销
   */
  function canUndo() {
    return gameInstance && gameInstance.canUndo();
  }

  /**
   * 检查是否可以重做
   */
  function canRedo() {
    return gameInstance && gameInstance.canRedo();
  }

  /**
   * 检查游戏是否赢了
   */
  function isWon() {
    return gameInstance && gameInstance.isWon();
  }

  /**
   * 获取游戏实例
   */
  function getGameInstance() {
    return gameInstance;
  }

  return {
    initializeDomain,
    interceptSet,
    undo,
    redo,
    canUndo,
    canRedo,
    isWon,
    getGameInstance
  };
}
