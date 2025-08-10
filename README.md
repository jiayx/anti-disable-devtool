# Anti Disable DevTool 🛡️

一个 Chrome 扩展，用于反制 [disable-devtool](https://github.com/theajack/disable-devtool) 等禁用开发者工具的库，让您自由使用浏览器开发者工具。

## 🎯 功能特点

- **多种拦截策略**：提供多种策略来绕过 disable-devtool 的检测
  - **isProd 拦截**：通过劫持 `isProd` 属性来禁用检测（适用于特定网站）
  - **定时器劫持**：拦截包含 disable-devtool 特征代码的定时器
  - **双重保护**：同时启用两种策略，提供最强保护

- **灵活配置**：可以针对每个网站单独配置是否启用保护和选择保护策略

- **调试工具**：在控制台提供了调试工具，可以查看和管理定时器
  - `__antiDisableDevtool.getStats()` - 查看拦截统计
  - `__antiDisableDevtool.showTimers()` - 显示所有定时器
  - `__antiDisableDevtool.cleanup()` - 清理可疑定时器

## 📦 安装方法

### 开发者模式安装

1. 下载或克隆此仓库到本地
```bash
git clone https://github.com/jiayx/anti-disable-devtool.git
```

2. 打开 Chrome 浏览器，访问 `chrome://extensions/`

3. 打开右上角的「开发者模式」

4. 点击「加载已解压的扩展程序」

5. 选择项目文件夹

## 🚀 使用方法

1. **安装扩展后**，点击浏览器工具栏中的扩展图标

2. **在弹出窗口中**：
   - 查看当前网站信息
   - 使用开关启用/禁用保护
   - 选择合适的拦截策略

3. **选择策略**：
   - **isProd 拦截**：适用于使用 isProd 属性的网站（如家乐联）
   - **定时器劫持**：适用于大多数网站，拦截检测定时器
   - **双重保护**：同时启用两种策略

4. **应用设置后**，页面会自动刷新以应用新的配置

## 🔧 工作原理

### isProd 拦截策略
通过劫持 `Object.defineProperty`，拦截对 `isProd` 属性的赋值，将其固定为 `false`。这样网站会认为当前环境不是生产环境，从而跳过初始化 disable-devtool 的逻辑。

### 定时器劫持策略
通过重写 `setInterval` 和 `setTimeout` 方法，检测并拦截包含 disable-devtool 特征代码的定时器，阻止其执行检测逻辑。

特征检测包括：
- `ondevtoolclose`
- `isSuspend`

## 📁 项目结构

```
anti-disable-devtool/
├── manifest.json      # Chrome 扩展配置文件
├── content.js         # 内容脚本，负责消息转发
├── injector.js        # 注入脚本，实现核心拦截功能
├── popup.html         # 扩展弹窗界面
├── popup.js           # 弹窗控制逻辑
├── icons/             # 扩展图标
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # 本文档
```

## 🛠️ 技术细节

### 消息通信流程
1. **popup.js** → **content.js**：通过 Chrome 扩展 API 发送消息
2. **content.js** → **injector.js**：通过 `window.postMessage` 转发消息
3. 配置保存在网站的 `localStorage` 中，键名为 `antiDisableDevtoolConfig`

### 脚本执行时机
- **content.js**：在 `document_start` 时注入到隔离环境
- **injector.js**：在 `document_start` 时注入到页面主环境（MAIN world）

## ⚠️ 注意事项

1. 本扩展仅用于开发和调试目的，请勿用于绕过网站的合法安全措施

2. 某些网站可能有其他方式检测开发者工具，本扩展主要针对 disable-devtool 库

3. 使用本扩展可能会影响某些网站的正常功能，如遇问题可以临时禁用

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

如果您发现了新的检测方式或有改进建议，请：
1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

MIT License

## 🔗 相关链接

- [disable-devtool](https://github.com/theajack/disable-devtool) - 本扩展所对抗的库
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/) - Chrome 扩展开发文档

## 📮 联系方式

如有问题或建议，请通过 GitHub Issues 联系。

---

**免责声明**：本工具仅供学习和开发使用，使用者需自行承担使用本工具的风险和责任。
