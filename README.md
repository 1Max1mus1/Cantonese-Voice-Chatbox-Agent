# 粤语语音聊天机器人 (Cantonese Voice Chatbox Agent)

一个基于 React + TypeScript 的移动端粤语语音聊天应用，支持语音输入、AI 对话和粤语 TTS 播放。

## 🎯 功能特性

### 核心功能
- **语音识别 (ASR)**: 使用 Azure Speech SDK 进行粤语语音转文字
- **AI 对话**: 集成 DeepSeek API 提供智能对话
- **语音合成 (TTS)**: 支持粤语语音播放，多种音色选择
- **移动端优化**: PWA 支持，响应式设计，触摸友好

### 技术亮点
- **移动音频解锁**: 解决移动浏览器音频播放限制
- **实时语音识别**: 支持边说边显示识别结果
- **会话持久化**: 本地存储聊天记录
- **无障碍支持**: TTS 语速、音量、音色可调节

## 🛠 技术栈

### 前端框架
- **React 19** - 用户界面框架
- **TypeScript** - 类型安全
- **Vite** - 构建工具和开发服务器
- **React Router** - 客户端路由

### UI 和样式
- **Tailwind CSS** - 原子化 CSS 框架
- **React Markdown** - Markdown 渲染
- **响应式设计** - 移动端优先

### 语音和 AI 服务
- **Microsoft Cognitive Services Speech SDK** - 语音识别和合成
- **DeepSeek API** - AI 对话服务
- **Azure Speech Services** - 粤语 TTS 支持

### 开发工具
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **Vitest** - 单元测试
- **Playwright** - 端到端测试

## 📦 安装和运行

### 环境要求
- Node.js 18+ 
- npm 或 yarn

### 1. 克隆项目
```bash
git clone <repository-url>
cd test1/web
```

### 2. 安装依赖
```bash
npm install
```

### 3. 环境变量配置
在 `web` 目录下创建 `.env.local` 文件：

```env
# Azure Speech 服务配置
VITE_AZURE_SPEECH_KEY=your_azure_speech_key
VITE_AZURE_SPEECH_REGION=eastasia

# DeepSeek API 配置
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key
```

### 4. 启动开发服务器
```bash
npm run dev
```

访问 `http://localhost:5173` 开始使用。

### 5. 构建生产版本
```bash
npm run build
```

## 🚀 部署

### Vercel 部署
项目已配置 Vercel 部署支持，包含 SPA 路由配置。

1. 连接 GitHub 仓库到 Vercel
2. 设置环境变量（同 `.env.local`）
3. 自动部署

### 手动部署
```bash
npm run build
# 将 dist/ 目录部署到静态文件服务器
```

## 📱 使用说明

### 基本操作
1. **语音输入**: 点击麦克风按钮开始录音
2. **文字对话**: AI 会自动回复你的问题
3. **语音播放**: AI 回复会自动用粤语播放
4. **设置调节**: 在设置页面调整 TTS 参数

### 移动端使用
- 首次使用需要点击麦克风按钮解锁音频权限
- 支持 PWA 安装到主屏幕
- 优化触摸操作体验

### 支持的粤语音色
- `zh-HK-HiuMaanNeural` (女声，默认)
- `zh-HK-WanLungNeural` (男声)
- 更多音色可在设置中选择

## 🧪 测试

### 运行测试
```bash
# 单元测试
npm run test

# 运行一次性测试
npm run test:run
```

### 测试覆盖
- 语音服务集成测试
- 音频解锁机制测试
- TTS 播放功能测试

## 📁 项目结构

```
web/
├── src/
│   ├── components/          # React 组件
│   │   ├── ChatBubble/     # 聊天气泡
│   │   ├── MicButton/      # 麦克风按钮
│   │   ├── Layout/         # 布局组件
│   │   └── Sidebar/        # 侧边栏
│   ├── pages/              # 页面组件
│   │   ├── Chat/           # 聊天页面
│   │   └── Settings/       # 设置页面
│   ├── services/           # 业务逻辑
│   │   ├── azureSpeech.ts  # Azure 语音服务
│   │   ├── deepseekClient.ts # DeepSeek API 客户端
│   │   ├── audio.ts        # 音频处理
│   │   └── prompt.ts       # 提示词处理
│   ├── config/             # 配置管理
│   │   └── local-config.ts # 本地配置
│   ├── types/              # TypeScript 类型定义
│   └── tests/              # 测试文件
├── public/                 # 静态资源
├── dist/                   # 构建输出
└── vercel.json            # Vercel 部署配置
```

## 🔧 配置说明

### Azure Speech Services
1. 在 Azure 门户创建 Speech 服务
2. 获取 API 密钥和区域
3. 确保启用粤语支持

### DeepSeek API
1. 注册 DeepSeek 账号
2. 获取 API 密钥
3. 确认 API 配额

### TTS 设置
- **语速**: 0.8x, 1.0x, 1.2x
- **音量**: 50%, 75%, 100%
- **音色**: 支持多种粤语音色

## 🐛 常见问题

### 移动端音频不播放
- 确保已点击麦克风按钮解锁音频
- 检查浏览器音频权限设置
- 尝试刷新页面重新解锁

### 语音识别不准确
- 确保网络连接稳定
- 在安静环境下使用
- 检查麦克风权限

### API 调用失败
- 检查环境变量配置
- 确认 API 密钥有效
- 查看浏览器控制台错误信息

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

---

**Talk is cheap. Show me the code.**
