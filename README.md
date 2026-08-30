# A LEAF 的学习笔记

一个使用 Jekyll 构建并部署到 GitHub Pages 的个人学习笔记站。主要记录色彩科学、色彩管理、ISP、计算机基础、经济学与求职经历。

**在线访问：** <https://aleaf-s.github.io/notes/>

## 站点功能

- 响应式文章布局与分级目录
- 亮色/暗色主题切换，默认使用亮色主题
- MathJax 数学公式与 Rouge 代码高亮
- 顶部阅读进度条和返回顶部按钮
- 桌面宽屏动态星空交互背景
- 图片懒加载及 PNG/WebP 无损压缩工具
- RSS 订阅、SEO 信息和 Giscus 评论
- GitHub Actions 自动检查、构建与部署

## 本地预览

需要 Ruby 3.1 和 Bundler。首次运行先安装依赖：

```powershell
bundle install
```

启动本地站点：

```powershell
bundle exec jekyll serve
```

然后访问 <http://127.0.0.1:4000/notes/>。生成的 `_site/`、缓存和本地运行时均已加入 `.gitignore`，不需要提交。

## 新建笔记

笔记放在 `_posts/<分类>/` 下，文件名使用 `YYYY-MM-DD-标题.md`，并在文件开头填写 Front Matter：

```yaml
---
layout: post
title: "文章标题"
date: 2026-08-30
category: 分类名称
---
```

推送到 `master` 分支后，GitHub Actions 会自动构建并发布站点。

## 在 VS Code 中粘贴图片

工作区已为 Paste Image 扩展配置好保存和引用规则：

1. 在 Markdown 文件中粘贴截图。
2. 输入能够描述图意的简短名称，例如 `cie-1931-色匹配函数`。
3. 图片会保存到 `assets/<文章文件名>/`。
4. 扩展会插入经过 `relative_url` 处理的 Jekyll 图片路径，避免与仓库名称耦合。

整理旧文章中的图片说明和路径：

```powershell
pwsh -NoProfile -File ./bin/normalize-image-markdown.ps1
```

## 压缩图片

压缩工具需要 Python 和 Pillow。建议先预览处理结果：

```powershell
pwsh -NoProfile -File ./bin/compress-images.ps1 -WhatIf
```

确认后执行：

```powershell
pwsh -NoProfile -File ./bin/compress-images.ps1
```

默认策略：

- PNG 截图使用无损方式优化。
- 当无损 WebP 至少节省 8% 空间时，自动转换并更新文章引用。
- JPEG 默认保持不变，避免重复有损压缩。
- 不改变图片像素尺寸，不以明显降低清晰度换取体积。

## 构建前检查

提交前建议执行与 GitHub Actions 相同的流程：

```powershell
bundle exec jekyll build --baseurl "/notes"
pwsh -NoProfile -File ./bin/check.ps1
```

检查内容包括图片路径、图片说明、数学公式写法、分页配置及生成页面中的公式异常等。检查脚本在有 ripgrep 时优先使用 `rg`，没有时会自动使用 PowerShell 自带的文本搜索。

## 主要目录

```text
_posts/          Markdown 笔记
_layouts/        页面布局
_includes/       可复用模板片段
_sass/           主题样式源码
assets/          图片、CSS 与 JavaScript
bin/             检查和图片处理工具
.github/         GitHub Actions 工作流
```

## 许可与致谢

站点界面基于 [Moonwalk](https://github.com/abhinavs/moonwalk) 主题修改，相关主题代码遵循其 MIT License。

笔记正文、截图和整理内容不因主题许可证而自动采用 MIT License。引用或转载时，请保留原始来源并遵守相应内容的授权要求。
