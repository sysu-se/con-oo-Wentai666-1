# 快速开始指南

## 项目结构

```
src/
├── domain/                 # 领域对象层（核心业务逻辑）
│   ├── Sudoku.js           # 单个棋局管理
│   ├── Game.js             # 游戏历史与状态管理
│   ├── StoreEnhancer.js    # Svelte store 适配器
│   └── index.js            # 导出入口
├── stores/
│   └── gameStore.js        # 备用 Game store 实现
├── node_modules/@sudoku/
│   ├── game.js             # [已增强] 游戏入口
│   └── stores/
│       ├── grid.js         # [已增强] 网格 store，集成 domain
│       ├── game.js         # 游戏状态 store
│       └── ... 其他 stores
└── components/             # Svelte 组件（无需改动）
```

## 核心概念

### 三个 Players

| 对象 | 职责 | 示例 |
|------|------|------|
| **Sudoku** | 管理当前棋局 | `sudoku.guess({row: 0, col: 2, value: 4})` |
| **Game** | 管理历史与命令 | `game.undo()`, `game.redo()` |
| **StoreEnhancer** | 连接 Svelte store | 拦截 `userGrid.set()` 转向 `game.guess()` |

### 数据流（用户输入）

```
用户按下数字
  ↓
Keyboard.svelte 配 userGrid.set({x, y}, value)
  ↓
storeEnhancer.interceptSet() 拦截
  ↓ 
gameInstance.guess({row: y, col: x, value})
  ↓
sudoku.grid 被修改 + 通知订阅者
  ↓
storeEnhancer 订阅者触发 userGrid.set(新的grid)
  ↓
Svelte 自动更新 Board 组件显示
```

## 常见任务

### 如何添加新功能？

**例如：添加"保存进度"功能**

```javascript
// 在 Game 类中添加
toJSON() {
  return {
    sudoku: this.sudoku.toJSON(),
    // ... history
  };
}

// 在组件中使用
import { getGameInstance } from '@sudoku/game';

function saveGame() {
  const game = getGameInstance();
  const data = game.toJSON();
  localStorage.setItem('sudoku_save', JSON.stringify(data));
}
```

### 如何添加新的验证？

**例如：检查是否有重复数字**

```javascript
// 在 Sudoku 类中添加
hasDuplicates() {
  const invalid = this.getInvalidCells();
  return invalid.size > 0;
}

// 在组件中使用
const sudoku = gameInstance.getSudoku();
if (sudoku.hasDuplicates()) {
  alert('有冲突的数字！');
}
```

## 调试技巧

### 1. 检查 Game 实例

```javascript
// 在浏览器控制台
import { getGameInstance } from '@sudoku/game';
const game = getGameInstance();
console.log(game.getSudoku().getGrid());  // 当前棋局
console.log(game.canUndo(), game.canRedo());  // 历史状态
```

### 2. 监听状态变化

```javascript
const game = getGameInstance();
game.subscribe((state) => {
  console.log('Game state updated:', state);
});
```

### 3. 测试 Undo/Redo

```javascript
// 在游戏中执行一些操作
game.guess({row: 0, col: 0, value: 5});
console.log('Before undo:', game.getSudoku().getGrid()[0][0]);  // 5

game.undo();
console.log('After undo:', game.getSudoku().getGrid()[0][0]);   // 0

game.redo();
console.log('After redo:', game.getSudoku().getGrid()[0][0]);   // 5
```

## 测试

```bash
# 运行所有测试
npm run test

# 运行特定测试
npm run test:sudoku       # Sudoku 基础测试
npm run test:game         # Game Undo/Redo 测试
npm run test:clone        # Clone 测试
npm run test:serialization # 序列化测试
```

## 重要文件

| 文件 | 用途 |
|------|------|
| [DESIGN.md](DESIGN.md) | 完整设计文档（必读） |
| [COMPLETION_SUMMARY.md](COMPLETION_SUMMARY.md) | 完成总结 |
| [src/domain/Sudoku.js](src/domain/Sudoku.js) | Sudoku 实现 |
| [src/domain/Game.js](src/domain/Game.js) | Game 实现 |
| [src/domain/StoreEnhancer.js](src/domain/StoreEnhancer.js) | 适配层实现 |

## FAQ

### Q: 为什么不直接修改 grid？
A: 因为 Svelte 只响应**赋值**，不响应**深层属性修改**。我们必须通过 `store.set()` 进行赋值。

### Q: Domain 层和 Svelte store 的关系是什么？
A: 
- Domain = 业务逻辑层（纯 JS，可被任何框架使用）
- Store = UI 状态层（Svelte 特定）
- StoreEnhancer = 将 Domain 驱动的状态变化同步到 Store

### Q: 为什么需要 StoreEnhancer？
A: 为了在不改变现有 UI 代码的前提下，将新的 Domain 层集成进来。

### Q: 能否跳过 StoreEnhancer 直接用 Game？
A: 可以，但需要改 UI 组件。Current 方案是"无缝集成"。

### Q: Domain 层可以单独测试吗？
A: 完全可以，实际上所有单元测试都是这样做的。Domain 层是纯 JS，没有 Svelte 依赖。

## 相关资源

- [Svelte Store 文档](https://svelte.dev/docs/svelte-store)
- [DESIGN.md - 响应式机制详解](DESIGN.md#五svelte-响应式机制理解)
- [HW1.1 作业要求](作业要求.md)

