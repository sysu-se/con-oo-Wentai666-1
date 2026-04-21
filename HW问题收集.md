## HW 问题收集

列举在HW 1、HW1.1过程里，你所遇到的2\~3个通过自己学习已经解决的问题，和2\~3个尚未解决的问题与挑战

### 已解决

1. 订阅者模式如何在Game类中实现？
   1. **上下文**：Game类需要通知UI状态变化
   2. **解决手段**：查看Game.js，了解subscribe/notify机制

2. StoreEnhancer如何拦截userGrid.set操作？
   1. **上下文**：需要将UI的直接修改转向领域对象的guess方法
   2. **解决手段**：查看StoreEnhancer.js，理解interceptSet方法

3. Undo/Redo堆栈如何管理历史状态？
   1. **上下文**：Game类维护past和future数组
   2. **解决手段**：查看Game.js的guess/undo/redo方法

### 未解决

1. 游戏完成检测和胜利判断如何实现？
   1. **上下文**：Sudoku类有isComplete方法，但UI中如何触发胜利模态框？
   2. **尝试解决手段**：查看GameOver.svelte和相关逻辑

2. 笔记/候选数字的处理逻辑？
   1. **上下文**：Board组件有candidates store，但领域对象中未见处理
   2. **尝试解决手段**：查看相关代码，理解candidates的来源

3. 序列化/反序列化的完整流程？
   1. **上下文**：Game和Sudoku都有toJSON/fromJSON，但如何在UI中使用？
   2. **尝试解决手段**：查看相关代码和测试