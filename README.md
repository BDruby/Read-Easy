<div align="center">

# 📖 Read-Easy · 审稿大师

**专为小说创作者、网文编辑与文字工作者打造的全端沉浸式审稿、听读与修稿工作台**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)

[在线体验与功能演示](#-核心特性亮点) · [快速开始](#-快速开始) · [技术架构](#-技术架构) · [常见问题](#-常见问题)

</div>

---

## 🌟 为什么需要 Read-Easy？

传统阅读器与文本编辑器在处理长篇小说与网文稿件时，往往存在诸多痛点：
- **听稿体验割裂**：机械感严重、段落间加载停顿明显、跨章节切换易卡死；
- **修稿反复折腾**：阅读或听读发现问题时，点击“编辑”直接弹回文章最顶部，找回当前段落极其费时费力；
- **审校缺少标记**：随手发现的错别字或语病，难以直接在段落中可视化做行间批注；
- **排版调节繁琐**：调整字体、行距需要频繁滚回顶部菜单。

**Read-Easy (审稿大师)** 针对上述核心痛点全面重构，让文字创作者与审稿人能够**边听边看、指哪修哪、无缝续读**。

---

## ✨ 核心特性亮点

### 🎧 1. 高保真智能听稿与无缝预载
- **微软 Edge-TTS 原生驱动**：精选沉稳男声（云健）、灵动女声（晓晓）、激情演播（云希）等数十种拟真人声，告别系统合成音的机械僵硬感；
- **智能段落级并发预载**：播放当前段落时自动在后台提前拉取并缓存后续音频，段落切换零感知卡顿；
- **无缝跨章节连播**：章节播放完毕自动平滑流转下一章，彻底消除跨章节音频假死停顿；
- **设置自动持久化**：音色偏好、朗读语速（0.5x ~ 2.5x）自动保存至本地，刷新页面无缝延续。

### ✍️ 2. 边听边修 · 智能光标与视口锚定
- **彻底告别跳回顶部**：针对正在听读的段落，直接点击顶部「直接修稿」或段落尾部的 `✏️ 修此段`，编辑器自动将光标与滚动视口精准居中定位至当前段落；
- **双向平滑还原**：修稿完成保存或取消时，视口无缝平滑滑回原阅读位置，继续专注听读。

### 🎯 3. 段落精确标号与全屏快跳
- **全平台段尾标号**：电脑端与手机端均在段落末尾优雅显示 `#{序号}` 编号（如 `#56`）；
- **吸附式快捷跳转器**：顶部吸附式控制条配备「跳至段落」弹窗，支持直接输入段号、或选择快捷预设（`章首 #1`、`1/4处`、`正中间`、`3/4处`、`章末`、`当前听读`）；
- **动画高亮指引**：跳转成功后目标段落附带平滑滚动与金色微涟漪脉冲提示。

### 📝 4. 行间划词批注与错别字标记
- **划词即标**：鼠标划选正文文本，瞬间唤出快捷批注框；
- **多类型审校标签**：支持错别字、语句润色、审稿批注、剧情推敲四种标签类型；
- **行间徽章可视化**：批注直接嵌于段落下方，一目了然，支持一键快速移除或管理。

### 🎨 5. 沉浸式排版与吸附控制
- **四款经典护眼主题**：复古羊皮纸、沉浸暗夜黑、柔和护眼绿、纯净极简白；
- **微米级排版定制**：实时调节字号（14~28px）、行间距（紧凑/标准/宽松）、版心宽度（紧凑/适中/宽幅）；
- **顶部常驻吸附**：排版设置栏常驻吸附在屏幕顶端，无需上下翻找即可即时生效。

### 📚 6. 作品全生命周期管理
- **整本图书导入导出**：支持标准 `.txt` 文档智能正则分卷分章解析；
- **作品卡片快速编辑**：主页卡片支持一键修改书名、作者等信息；
- **多维度便捷操作**：单章正文一键复制至剪贴板，支持整书一键打包下载备份。

---

## 🛠️ 技术架构

```plaintext
Read-Easy (审稿大师)
├── 🎨 前端视图层 (Next.js 14 App Router)
│   ├── ReaderView: 沉浸式小说阅读画布、段落渲染、划词批注、锚点编辑
│   ├── AudioPlayer: Edge-TTS 音频流控、并发预载器、状态机与跨章守卫
│   ├── Navbar & Sidebar: 吸附式控制栏、目录抽屉、章节快速切换
│   └── EditProjectModal & ImportModal: 作品信息管理、整本文本解析器
│
├── ⚡ 服务端与 API 路由
│   ├── /api/tts: WebSocket/HTTP 微软 Edge 自然语音合成与音频流传输
│   ├── /api/projects: 作品 CRUD、批量导入与整本打包导出
│   ├── /api/chapters: 章节正文读写、历史阅读进度记录与同步
│   └── /api/chapters/[id]/annotations: 行间审稿批注持久化管理
│
└── 💾 数据持久化与存储
    ├── Prisma ORM + MySQL: 结构化存储项目、章节、阅读进度与批注记录
    └── Cloudflare R2 / S3 兼容对象存储: 音频切片与导出大文件缓存 (可选)
```

---

## 🚀 快速开始

### 1. 环境准备
确保您的运行环境满足以下要求：
- [Node.js](https://nodejs.org/) `>= 18.18.0`
- [MySQL](https://www.mysql.com/) `>= 8.0`
- 包管理器：`npm` / `pnpm` / `yarn`

### 2. 克隆仓库与安装依赖
```bash
git clone https://github.com/BDruby/Read-Easy.git
cd Read-Easy
npm install
```

### 3. 配置环境变量
在项目根目录复制环境变量示例文件：
```bash
cp .env.example .env
```
根据实际情况修改 `.env` 中的数据库连接信息：
```env
# MySQL 数据库连接串
DATABASE_URL="mysql://username:password@localhost:3306/read_easy"

# 应用名称展示
NEXT_PUBLIC_APP_NAME="Read-Easy · 审稿大师"
```

### 4. 数据库同步与 Client 生成
```bash
# 推送 Prisma 模型结构至数据库
npm run db:push

# 生成 Prisma 客户端
npm run db:generate
```

### 5. 启动开发服务器
```bash
npm run dev
```
打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可开始使用。

---

## 💻 常用脚本

| 命令 | 描述 |
| :--- | :--- |
| `npm run dev` | 启动本地 Next.js 开发环境热重载服务 |
| `npm run build` | 生成 Prisma 客户端并构建生产环境包 |
| `npm run start` | 启动生产环境部署服务 |
| `npm run db:push` | 将 `prisma/schema.prisma` 模型映射到数据库 |
| `npm run db:generate` | 重新生成本地 `@prisma/client` 类型定义 |

---

## 📱 移动端与全平台适配

Read-Easy 专为全设备自适应打造：
- **手机触控优化**：右侧大范围舒适触控区、轻量段尾微徽章、浮动底部播放器；
- **电脑键鼠加持**：双击任意段落即听、左侧悬浮播放按钮、段尾悬浮直接修此段；
- **阅读模式无缝切换**：无论何种屏幕尺寸，均可实现像素级精确对齐。

---

## 🤝 贡献与交流

欢迎提交 Issue 与 Pull Request 共同优化小说创作者的码字审稿体验！

1. Fork 本仓库；
2. 新建功能分支 (`git checkout -b feat/amazing-feature`)；
3. 提交修改代码 (`git commit -m 'feat: add some amazing feature'`)；
4. 推送分支 (`git push origin feat/amazing-feature`)；
5. 新建 Pull Request。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源协议分发与使用。
