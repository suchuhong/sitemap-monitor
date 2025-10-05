# 运行中扫描警告功能

## 🎯 功能说明

当站点有扫描任务正在运行时，在页面顶部显示明显的警告提示，防止用户重复触发扫描。

## ✨ 新增功能

### 1. 运行中扫描警告组件

**文件**: `app/sites/[id]/_components/running-scan-alert.tsx`

**功能**:
- ✅ 检测是否有运行中或排队中的扫描
- ✅ 显示醒目的黄色警告框
- ✅ 带有旋转动画的图标
- ✅ 清晰的提示文字
- ✅ 自动监听扫描状态变化

**外观**:
```
┌─────────────────────────────────────────────────────────┐
│ 🔄 扫描任务进行中                                        │
│                                                          │
│ 该站点当前有扫描任务正在执行，请等待当前扫描完成后       │
│ 再触发新的扫描。扫描完成后会自动通知。                   │
└─────────────────────────────────────────────────────────┘
```

### 2. 改进的扫描按钮提示

**文件**: `app/sites/[id]/_components/ConfirmScan.tsx`

**改进**:
- ✅ 当有运行中的扫描时，显示 `toast.warning` 而不是 `toast.success`
- ✅ 提示持续时间增加到 5 秒
- ✅ 更详细的提示信息

**提示对比**:

**之前**:
```
✅ 该站点已有扫描任务在执行中
   扫描完成后将自动通知
```

**现在**:
```
⚠️  扫描任务已在运行中
   该站点已有扫描任务在执行中，请等待当前扫描完成后再试
   (持续 5 秒)
```

### 3. Alert UI 组件

**文件**: `components/ui/alert.tsx`

新增的通用 Alert 组件，用于显示各种提示信息。

## 📊 用户体验流程

### 场景 1: 正常扫描

1. 用户访问站点详情页
2. 没有运行中的扫描
3. 点击"手动扫描"按钮
4. 显示成功提示：`✅ 扫描已启动`
5. 页面顶部显示黄色警告框
6. 扫描完成后，警告框自动消失

### 场景 2: 重复触发扫描

1. 用户访问站点详情页
2. 页面顶部显示黄色警告框（有运行中的扫描）
3. 用户点击"手动扫描"按钮
4. 显示警告提示：`⚠️ 扫描任务已在运行中`
5. 提示持续 5 秒
6. 警告框继续显示

### 场景 3: 扫描卡住

1. 用户访问站点详情页
2. 页面顶部显示黄色警告框
3. 警告框一直显示（扫描卡住）
4. 用户可以：
   - 等待扫描完成
   - 运行清理脚本
   - 联系管理员

## 🎨 视觉设计

### 警告框样式

- **背景色**: 琥珀色（amber-50 / amber-950）
- **边框**: 琥珀色（amber-200 / amber-900）
- **图标**: 旋转的刷新图标
- **文字**: 琥珀色（amber-900 / amber-100）
- **位置**: 页面顶部，扫描监控组件下方

### Toast 提示样式

- **成功**: 绿色，`toast.success`
- **警告**: 黄色，`toast.warning`
- **错误**: 红色，`toast.error`

## 🔧 技术实现

### 状态检测

```typescript
const [hasRunningScans, setHasRunningScans] = useState(() => {
  return initialScans.some(scan => 
    scan.status === "running" || scan.status === "queued"
  );
});
```

### 事件监听

```typescript
useEffect(() => {
  const handleScanTriggered = () => {
    setHasRunningScans(true);
  };

  const handleScanComplete = () => {
    setTimeout(() => {
      setHasRunningScans(false);
    }, 2000);
  };

  window.addEventListener("scan-triggered", handleScanTriggered);
  window.addEventListener("scan-complete", handleScanComplete);

  return () => {
    window.removeEventListener("scan-triggered", handleScanTriggered);
    window.removeEventListener("scan-complete", handleScanComplete);
  };
}, []);
```

### API 响应处理

```typescript
if (payload.status === "already_running") {
  toast.warning("扫描任务已在运行中", {
    description: payload.message || "该站点已有扫描任务在执行中，请等待当前扫描完成后再试",
    duration: 5000,
  });
} else {
  toast.success(message, {
    description: "扫描完成后将自动通知",
  });
}
```

## 📱 响应式设计

警告框在所有设备上都能正常显示：

- **桌面**: 全宽显示
- **平板**: 全宽显示
- **手机**: 全宽显示，文字自动换行

## ♿ 可访问性

- ✅ 使用 `role="alert"` 属性
- ✅ 清晰的视觉对比度
- ✅ 支持键盘导航
- ✅ 屏幕阅读器友好

## 🧪 测试建议

### 测试场景 1: 正常流程

1. 访问站点详情页（无运行中扫描）
2. 点击"手动扫描"
3. 验证警告框出现
4. 等待扫描完成
5. 验证警告框消失

### 测试场景 2: 重复触发

1. 访问站点详情页（有运行中扫描）
2. 验证警告框已显示
3. 点击"手动扫描"
4. 验证显示警告 toast
5. 验证警告框继续显示

### 测试场景 3: 页面刷新

1. 触发扫描
2. 刷新页面
3. 验证警告框仍然显示（基于服务器数据）

## 🔄 与现有功能的集成

### ScanMonitor 组件

`RunningScanAlert` 与 `ScanMonitor` 配合工作：

- `ScanMonitor`: 后台轮询扫描状态，触发事件
- `RunningScanAlert`: 监听事件，更新 UI

### ConfirmScan 组件

改进了用户反馈：

- 成功创建扫描 → 绿色成功提示
- 已有运行中扫描 → 黄色警告提示
- 请求失败 → 红色错误提示

## 📚 相关文件

### 新增文件

- `app/sites/[id]/_components/running-scan-alert.tsx` - 警告组件
- `components/ui/alert.tsx` - Alert UI 组件
- `RUNNING_SCAN_ALERT_FEATURE.md` - 本文档

### 修改文件

- `app/sites/[id]/_components/ConfirmScan.tsx` - 改进提示
- `app/sites/[id]/page.tsx` - 添加警告组件

## 🎯 预期效果

### 用户体验改进

- ✅ 用户能立即看到扫描状态
- ✅ 避免重复触发扫描
- ✅ 清晰的视觉反馈
- ✅ 减少用户困惑

### 技术改进

- ✅ 实时状态更新
- ✅ 事件驱动架构
- ✅ 可复用的 Alert 组件
- ✅ 更好的错误处理

## 🚀 未来改进

可能的增强功能：

1. **进度条**: 显示扫描进度
2. **取消按钮**: 允许用户取消运行中的扫描
3. **详细信息**: 显示扫描开始时间和预计完成时间
4. **历史记录**: 显示最近的扫描历史
5. **批量操作**: 支持批量扫描多个站点

## 📝 使用说明

### 对于开发者

组件会自动工作，无需额外配置。只需确保：

1. `ScanMonitor` 组件正常工作
2. 扫描 API 返回正确的状态
3. 事件正确触发

### 对于用户

1. 访问站点详情页
2. 如果看到黄色警告框，说明有扫描正在运行
3. 等待扫描完成或联系管理员清理卡住的扫描
4. 扫描完成后警告框会自动消失

---

**创建时间**: 2025年10月5日
**版本**: 1.0.0
