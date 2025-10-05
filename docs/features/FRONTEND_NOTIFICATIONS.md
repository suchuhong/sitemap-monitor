# 前端页面通知功能

## 功能概述

在站点详情页面，当用户触发扫描后，系统会自动监控扫描状态，并在扫描完成时弹出通知。

## 工作原理

### 1. 扫描监控组件 (ScanMonitor)

位置：`app/sites/[id]/_components/scan-monitor.tsx`

**功能**：
- 自动检测页面加载时是否有正在运行的扫描
- 轮询检查扫描状态（每 5 秒）
- 扫描完成时显示通知
- 自动刷新页面数据

**监控流程**：
```
页面加载
  ↓
检查是否有 running/queued 状态的扫描
  ↓
如果有 → 启动轮询（每 5 秒）
  ↓
检查扫描状态
  ↓
扫描完成 → 显示通知 → 刷新页面
  ↓
没有待监控的扫描 → 停止轮询
```

### 2. 扫描触发组件 (ConfirmScan)

位置：`app/sites/[id]/_components/ConfirmScan.tsx`

**改进**：
- 触发扫描后发送自定义事件 `scan-triggered`
- 监控组件监听该事件并开始监控新扫描
- 显示友好的提示信息

### 3. 通知类型

#### 成功通知
```
✅ 扫描完成
新增 5 / 删除 2 / 更新 3 · 耗时 12.5s
```

#### 无变更通知
```
✅ 扫描完成
无变更 · 耗时 8.2s
```

#### 失败通知
```
❌ 扫描失败
Network timeout
```

#### 已有扫描运行
```
✅ 该站点已有扫描任务在执行中
```

## 技术实现

### 使用的技术

1. **Sonner Toast**：轻量级的 React 通知库
2. **自定义事件**：用于组件间通信
3. **轮询机制**：定期检查扫描状态
4. **React Hooks**：useEffect、useRef

### 关键代码

#### 监听扫描触发

```typescript
// ConfirmScan.tsx
window.dispatchEvent(
  new CustomEvent("scan-triggered", {
    detail: { scanId: payload.scanId },
  })
);
```

#### 监控扫描状态

```typescript
// scan-monitor.tsx
const checkScans = async () => {
  const response = await fetch(`/api/sites/${siteId}`);
  const data = await response.json();
  const scans = data.recentScans || [];

  scans.forEach((scan: any) => {
    if (monitoredScansRef.current.has(scan.id)) {
      if (scan.status === "success" || scan.status === "failed") {
        showScanCompleteNotification(scan);
        monitoredScansRef.current.delete(scan.id);
      }
    }
  });
};
```

#### 显示通知

```typescript
// scan-monitor.tsx
if (scan.status === "success") {
  toast.success("扫描完成", {
    description: `新增 ${scan.added} / 删除 ${scan.removed} / 更新 ${scan.updated}`,
    duration: 5000,
  });
  window.location.reload();
}
```

## 用户体验

### 操作流程

1. **用户点击"手动扫描"按钮**
   - 显示 "扫描已启动" 提示
   - 按钮显示 "处理中..."

2. **扫描进行中**
   - 后台每 5 秒检查一次状态
   - 用户可以继续浏览页面

3. **扫描完成**
   - 弹出通知显示结果
   - 2 秒后自动刷新页面
   - 显示最新的扫描数据

### 通知持续时间

- 成功通知：5 秒
- 失败通知：8 秒（给用户更多时间阅读错误信息）

### 自动刷新

- 成功：立即刷新
- 失败：2 秒后刷新（让用户看到错误信息）

## 配置选项

### 轮询间隔

在 `scan-monitor.tsx` 中修改：

```typescript
intervalRef.current = setInterval(async () => {
  await checkScans();
}, 5000); // 修改这里的值（毫秒）
```

### 通知持续时间

在 `scan-monitor.tsx` 中修改：

```typescript
toast.success("扫描完成", {
  description: "...",
  duration: 5000, // 修改这里的值（毫秒）
});
```

### 禁用自动刷新

如果不想自动刷新页面，注释掉：

```typescript
// window.location.reload();
```

## 扩展功能

### 添加声音提示

```typescript
const playNotificationSound = () => {
  const audio = new Audio('/notification.mp3');
  audio.play().catch(console.error);
};

// 在显示通知时调用
showScanCompleteNotification(scan);
playNotificationSound();
```

### 添加桌面通知

```typescript
const showDesktopNotification = (title: string, body: string) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
};

// 请求权限
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}
```

### 添加进度条

```typescript
import { Progress } from "@/components/ui/progress";

// 显示扫描进度
const [progress, setProgress] = useState(0);

useEffect(() => {
  if (isScanning) {
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 1000);
    return () => clearInterval(interval);
  }
}, [isScanning]);
```

## 故障排查

### 通知不显示

1. 检查 Toaster 是否在 layout.tsx 中配置
2. 检查浏览器控制台是否有错误
3. 确认 sonner 包已安装

### 轮询不工作

1. 检查 API 端点是否正常响应
2. 查看浏览器网络面板
3. 确认扫描 ID 是否正确

### 页面不刷新

1. 检查是否有 JavaScript 错误
2. 确认 window.location.reload() 没有被注释
3. 查看浏览器控制台日志

## 性能优化

### 减少轮询频率

对于不重要的扫描，可以增加轮询间隔：

```typescript
const POLL_INTERVAL = isImportant ? 3000 : 10000;
```

### 使用 WebSocket

对于实时性要求高的场景，可以使用 WebSocket：

```typescript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'scan.complete') {
    showScanCompleteNotification(data);
  }
};
```

### 使用 Server-Sent Events (SSE)

```typescript
const eventSource = new EventSource(`/api/sites/${siteId}/events`);

eventSource.addEventListener('scan.complete', (event) => {
  const data = JSON.parse(event.data);
  showScanCompleteNotification(data);
});
```

## 最佳实践

1. **及时清理**：组件卸载时清理定时器和事件监听
2. **错误处理**：捕获并记录所有错误
3. **用户反馈**：始终给用户明确的反馈
4. **性能考虑**：避免过于频繁的轮询
5. **可访问性**：确保通知对屏幕阅读器友好

## 相关文档

- [扫描完成通知](./SCAN_NOTIFICATIONS.md) - 后端通知系统
- [队列系统优化](./QUEUE_OPTIMIZATION.md) - 队列管理
- [Sonner 文档](https://sonner.emilkowal.ski/) - Toast 库文档
