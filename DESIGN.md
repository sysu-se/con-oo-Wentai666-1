# HW1.1 设计文档：领域对象接入 Svelte

## 一、概述

本文档说明如何将 Homework 1 中设计的领域对象（`Sudoku` / `Game`）真正接入 Svelte 游戏流程。

### 核心问题

1. **Svelte 的响应式机制如何与领域对象协作？**
2. **View 层如何消费 `Sudoku` / `Game`？**

本文档通过具体的代码设计和架构回答这两个问题。

---

## 二、领域对象的改进（相比 HW1）

### 2.1 改进点

#### 1. **职责边界更清晰**

**Sudoku 类**：
- 只负责单个棋局的状态管理
- 提供 `guess(move)` 执行单次操作
- 提供 `getGrid()` 和 `getInvalidCells()` 查询
- 支持 `clone()` 用于快照

**Game 类**：
- 管理游戏生命周期和历史
- 持有 `Sudoku` 实例
- 维护 Undo/Redo 堆栈
- 对外提供 `guess()` / `undo()` / `redo()` 接口
- 通过订阅者模式通知 View 层状态变化

**优势**：
- 单一职责原则（SRP）
- Sudoku 无需关心 Undo/Redo，只管当前局面
- Game 不直接操作 grid，只管历史管理

#### 2. **状态快照策略改进**

**过去（HW1 中可能的做法）**：
```javascript
// 问题：可能使用浅复制，导致嵌套对象被共享
const snapshot = { grid: game.grid, ...otherState };
```

**现在**：
```javascript
// 改进：深复制确保隔离
guess(move) {
  this.past.push(this.sudoku.clone());  // clone() 进行深复制
  // ... 执行操作
}
```

#### 3. **订阅者模式支持响应式更新**

**新增**：
```javascript
// Game 实例支持订阅
gameInstance.subscribe((state) => {
  // state: { grid, invalidCells, won, canUndo, canRedo }
  updateUI(state);
});
```

这使得 View 层能够被动响应状态变化，而不是主动轮询。

#### 4. **改进的错误处理**

**Sudoku 现在会**：
- 拒绝修改初始对象
- 验证位置有效性
- 检查游戏有效性

```javascript
guess(move) {
  // 不允许覆盖初始数字
  if (this.initialGrid[row][col] !== 0) {
    throw new Error(`Cannot modify initial cell`);
  }
}
```

---

## 三、架构设计：View 层如何消费领域对象

### 3.1 三层架构

```
┌─────────────────────────────────────────┐
│           Svelte Components             │
│   (Board, Cell, Keyboard, Controls)     │
└────────────┬────────────────────────────┘
             │
             ↓ stores (UI state)
┌─────────────────────────────────────────┐
│        UI Store Layer (Svelte)          │
│  userGrid, cursor, candidates, etc.     │
└────────────┬────────────────────────────┘
             │
             ↓ enhancer interceptor
┌─────────────────────────────────────────┐
│    Store Enhancer (Adapter Layer)       │
│   将 UI store.set() 转向领域对象        │
└────────────┬────────────────────────────┘
             │
             ↓ domain operations
┌─────────────────────────────────────────┐
│      Domain Layer (Business Logic)      │
│   Game / Sudoku (核心对象)             │
└─────────────────────────────────────────┘
```

### 3.2 数据流

#### 启动流程

```
App.svelte → Welcome Modal
    ↓
game.startNew(difficulty)
    ↓
grid.generate(difficulty)  // 生成题目
    ↓
storeEnhancer.initializeDomain(initialGrid)
    ↓
Game 实例创建 + subscrib配置
    ↓
UI stores (userGrid, invalidCells) 初始化
```

#### 用户输入 → 领域对象 → UI 更新

```
用户点击单元格 (Cell.svelte)
    ↓
Keyboard.svelte 注册按键
    ↓
调用 userGrid.set({ x, y }, value)
    ↓
userGrid.set() 拦截并调用 storeEnhancer.interceptSet()
    ↓
gameInstance.guess({ row: y, col: x, value })
    ↓
Game 内部：
  • 判断是否可以修改（不是初始数字）
  • 调用 sudoku.guess()
  • sudoku.grid 被修改
  • 通知订阅者
    ↓
storeEnhancer 订阅者被触发
    ↓
storeEnhancer 更新 UI stores：
  • userGrid.set(新的 grid)
  • invalidCells.set(新的冲突单元格)
    ↓
Svelte 组件反应性更新
    ↓
Board 和 Cell 组件显示新状态
```

#### Undo/Redo 流程

```
用户点击 Undo 按钮
    ↓
Actions.svelte 调用 gameInstance.undo()
    ↓
Game.undo():
  • current sudoku → future stack
  • past stack[-1] → restore
  • 通知订阅者
    ↓
UI 自动更新（通过订阅机制）
```

---

## 四、关键设计决策

### 4.1 为什么选择 "拦截 set 操作" 的方式？

**选项 A：完全替换 grid store**
```javascript
// 问题：破坏向后兼容性，需要改全部组件
userGrid is now a custom object
$cursor needs different access pattern
```

**选项 B：拦截 set，保持 store 接口（✓ 采用）**
```javascript
// 优势：
// 1. 现有 UI 组件无需改动
// 2. 逐步迁移：grid store 仍然工作
// 3. 降级方案：如果 domain 初始化失败，直接 set 仍可工作
userGrid.set({ x, y }, value)  // 仍然有效
```

### 4.2 为什么在 Game 中实现订阅者模式？

**避免组件直接访问状态**：
```javascript
// ❌ 不推荐：组件直接读取内部数据
cell.value = game.sudoku.grid[row][col];

// ✓ 推荐：通过订阅被动更新
game.subscribe(state => {
  cell.value = state.grid[row][col];
});
```

**优势**：
- 所有 UI 更新通过统一通道
- 便于调试：能追踪所有状态变化
- 支持中间件/日志

### 4.3 为什么 invalidCells 由 Sudoku 计算而非 store 计算？

**对比**：

| 方案 | 优缺点 |
|------|--------|
| Store derived (旧) | ✓ 响应式实时计算 ✗ 无法感知初始grid |
| Sudoku 计算 (新) | ✓ 基于完整状态 ✓ 领域逻辑 ✓ 可单元测试 |

```javascript
// 新方案：Sudoku 持有完整信息
sudoku.getInvalidCells() {
  // 知道 initialGrid 和 currentGrid
  // 能正确判断哪些单元格有冲突
}
```

---

## 五、Svelte 响应式机制理解

### 5.1 为什么 `$userGrid` 会更新？

关键点：**Svelte 的响应式是基于赋值的，不是基于深层属性变化的**

```javascript
// ❌ 不会触发更新
$userGrid[0][0] = 5;  // 修改数组元素，Svelte 不知道
$userGrid = $userGrid;  // 这才会触发！

// ✓ 会触发更新
userGrid.set(newArray);  // store 赋值，Svelte 知道
```

**我们的方案为什么工作**：

```javascript
// storeEnhancer 中
gameInstance.subscribe((state) => {
  userGridStore.set(state.grid);  // ← 新赋值！
});
```

每次 Game 状态变化，我们都是 `set(新对象)`，而不是修改内部。

### 5.2 为什么 `$invalidCells` 会更新？

**不再依赖 derived store 的自动计算**，而是由我们主动更新：

```javascript
// 旧方式（可能有问题）
export const invalidCells = derived(userGrid, computeInvalid);

// 新方式（确保正确）
gameInstance.subscribe((state) => {
  invalidCellsStore.set(state.invalidCells);
});
```

**为什么更好**：
1. invalidCells 是由领域对象计算的，包含完整的冲突检测逻辑
2. 不依赖 store 的链式 derived，更可靠
3. 性能：一次订阅一次更新，而非多次 derived 触发

### 5.3 间接依赖问题

**问题场景**：
```javascript
// 如果只有 userGrid observable，但 invalidCells 是 derived
//且 derived 依赖通过 getter 访问
valueStore = derived(userGrid, $ug => {
  // 这里计算冲突
  // 但如果计算基于"过期的 initialGrid"，会有问题
});
```

**我们的解决**：
```javascript
// invalidCells 不再是 derived，而是由 Game 直接计算并推送
// Game 持有 Sudoku，Sudoku 持有 initialGrid
// 所以计算总是基于最新、完整的状态
```

---

## 六、响应式边界说明

### View 层可见的响应式状态

| 状态 | Store 类型 | 来源 | 订阅者 |
|------|---------|------|--------|
| `$userGrid` | writable | Game.sudoku.grid | Board 组件 |
| `$invalidCells` | writable（不再 derived） | Game.sudoku.getInvalidCells() | Cell 组件 |
| `$cursor` | custom | 用户交互 | Board 组件 |
| `$candidates` | custom | 用户笔记 | Cell 组件 |
| `$gamePaused` | writable | UI 状态 | 全局 |
| `$gameWon` | derived | userGrid + invalidCells | Modal 组件 |

### 领域层内部（不可见于 View）

| 状态 | 位置 | 说明 |
|------|------|------|
| `sudoku.initialGrid` | Game.sudoku | 只读，用于校验 |
| `game.past` | Game | Undo 历史堆栈 |
| `game.future` | Game | Redo 历史堆栈 |
| `game.subscribers` | Game | 订阅者列表 |

---

## 七、如果错误地直接 mutate 会出什么问题？

### 问题示例

```javascript
// ❌ 错误：直接修改 userGrid
$userGrid[0][0] = 5;  // Svelte 不知道有变化
// → Cell 组件显示不更新
// → invalidCells 也不会重新计算（因为 derived 依赖可能没触发）

// ❌ 错误：绕过 Game 对象直接改 grid
sudoku.grid[0][0] = 5;  // Game 不知道发生了什么
// → 没有保存 undo/redo 快照
// → subscribers 没被调用
// → UI 不会更新
// → 游戏赢利逻辑无法判断
```

### 解决方案

**始终使用我们的 API**：
```javascript
// ✓ 正确：通过 userGrid store
userGrid.set({ x: 0, y: 0 }, 5);

// 或者（如果 domain 已初始化）
// ✓ 正确：通过 Game 对象
gameInstance.guess({ row: 0, col: 0, value: 5 });
```

---

## 八、将来迁移到 Svelte 5 的影响

### 最稳定的层（基本无需改动）

**Domain 层** (`Sudoku` / `Game`)
- 纯 JavaScript，无 Svelte 依赖
- 可直接移到 Svelte 5
- 单元测试完全兼容

### 可能改动的层

**Store Enhancer** 和 **Grid Store**
```javascript
// Svelte 3 风格（现在）
import { writable } from 'svelte/store';

// Svelte 5 可能使用 runes
let game = $state.raw(gameInstance);  // reactive class
```

**组件层**
```javascript
// Svelte 3 风格（现在）
import { userGrid } from '@sudoku/stores/grid';
// ... 使用 $userGrid

// Svelte 5 可能
import { userGrid } from '@sudoku/stores/grid';
let ug = $userGrid;  // rune 自动解包
```

---

## 九、集成清单

### 完成的任务

- [x] **Sudoku 类**：持有 grid，提供 guess/clone/validate
- [x] **Game 类**：管理历史，提供 undo/redo，支持订阅
- [x] **Store Enhancer**：拦截 userGrid.set，转向 Game.guess
- [x] **Grid Store 增强**：在 set 中调用 storeEnhancer
- [x] **Game.js 整合**：startNew/startCustom 初始化 Domain
- [x] **响应式更新**：Game 的订阅机制更新 UI stores

### UI 组件改动

**组件代码无需改动**，因为：
- Board/Cell 仍然读取 `$userGrid`, `$invalidCells`
- Keyboard 仍然调用 `userGrid.set()`
- 但现在这些操作都被正确地通过 Domain 层处理

---

## 十、关键代码示例

### 10.1 Game 的订阅机制

```javascript
// src/domain/Game.js
class Game {
  constructor({ sudoku }) {
    this.sudoku = sudoku;
    this.subscribers = [];
  }

  guess(move) {
    // 保存历史
    this.past.push(this.sudoku.clone());
    this.future = [];
    
    // 执行操作
    this.sudoku.guess(move);
    
    // 通知 subscribers
    this._notifySubscribers();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => { this.subscribers = this.subscribers.filter(...); };
  }

  _notifySubscribers() {
    const state = this._getGameState();
    this.subscribers.forEach(cb => cb(state));
  }
}
```

### 10.2 Store Enhancer 的初始化

```javascript
// src/domain/StoreEnhancer.js
export function enhanceGridStoreWithDomain(userGridStore, gridStore, invalidCellsStore) {
  let gameInstance = null;

  function initializeDomain(initialGrid) {
    const sudoku = createSudoku(initialGrid);
    gameInstance = createGame({ sudoku });

    // 关键：订阅 Game，更新 UI stores
    gameInstance.subscribe((state) => {
      userGridStore.set(state.grid);
      invalidCellsStore.set(Array.from(state.invalidCells));
    });
  }

  function interceptSet(pos, value) {
    // 用户操作进入 Game
    gameInstance.guess({ row: pos.y, col: pos.x, value });
  }

  return { initializeDomain, interceptSet, undo, redo, ... };
}
```

### 10.3 在 game.js 中的集成

```javascript
// src/node_modules/@sudoku/game.js
const storeEnhancer = enhanceGridStoreWithDomain(userGrid, grid, invalidCells);

export function startNew(diff) {
  difficulty.set(diff);
  grid.generate(diff);
  
  // 初始化领域对象
  const initialGrid = get(grid);
  storeEnhancer.initializeDomain(initialGrid);
  
  // 其他初始化...
}
```

---

## 十一、总结

### 两个核心问题的答案

#### 1. Svelte 的响应式机制如何与领域对象协作？

**答**：通过 **Store Enhancer 适配层** 和 **Game 的订阅模式**：

1. 用户交互触发 `userGrid.set()`
2. `set()` 被拦截，调用 `Game.guess()`
3. `Game.guess()` 修改 `Sudoku.grid` 并通知订阅者
4. 订阅者更新 UI stores（通过 `store.set()`）
5. Svelte 响应式系统检测到 store 赋值，自动更新组件

**关键**：利用 Svelte 对 store 赋值的响应，而不是对对象属性变化的响应。

#### 2. View 层如何消费 `Sudoku` / `Game`？

**答**：View 层不直接消费领域对象，而是通过适配层和 stores：

1. UI 组件读取 `$userGrid`, `$invalidCells` 等 stores
2. UI 组件通过 `userGrid.set()` 写入
3. Store Enhancer 在中间拦截，转向 Game 对象
4. Game 对象维护业务逻辑和历史
5. Game 通过 subscribe 推送更新回 stores

**分层好处**：
- 业务逻辑（领域）和 UI 分离
- 易于测试：Game 可脱离 Svelte 单独测试
- 易于维护：改变 UI 不影响业务逻辑

---

## 十二、参考资源

- 领域对象：[src/domain/Sudoku.js](src/domain/Sudoku.js), [src/domain/Game.js](src/domain/Game.js)
- 适配层：[src/domain/StoreEnhancer.js](src/domain/StoreEnhancer.js)
- 集成点：[src/node_modules/@sudoku/game.js](src/node_modules/@sudoku/game.js)
- 单元测试：[tests/hw1/](tests/hw1/)
