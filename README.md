# A LEAF 的学习笔记

这是一个基于 Jekyll 的个人学习笔记站点，内容主要涉及色彩科学、ISP、计算机基础、经济学与求职记录。

线上地址：<https://aleaf-s.github.io/notes/>

## 本地运行

先安装 Ruby 3.1 和 Bundler，然后在项目目录执行：

```powershell
$env:Path = "$PWD\ruby31\bin;$env:Path"
bundle install
bundle exec jekyll serve
```

访问 <http://127.0.0.1:4000/notes/>。

## 写笔记与粘贴图片

VS Code 工作区已经配置 Paste Image 扩展：

1. 在 Markdown 中粘贴截图。
2. 在弹出的输入框中输入能说明图片内容的短名称，例如 `cie-1931-色匹配函数`。
3. 图片会保存到 `assets/<文章文件名>/`，并自动插入不依赖仓库名称的 Jekyll 路径。

批量规范旧图片引用：

```powershell
powershell -ExecutionPolicy Bypass -File bin/normalize-image-markdown.ps1
```

无损压缩截图并在确实变小时转换为 WebP：

```powershell
# 只预览
powershell -ExecutionPolicy Bypass -File bin/compress-images.ps1 -WhatIf

# 实际处理
powershell -ExecutionPolicy Bypass -File bin/compress-images.ps1
```

PNG 使用无损 WebP，不改变像素；JPEG 默认不会重新编码。

## 检查与构建

```powershell
powershell -ExecutionPolicy Bypass -File bin/check.ps1
bundle exec jekyll build
```

部署由 GitHub Actions 自动完成。

## 许可与致谢

站点界面基于 [Moonwalk](https://github.com/abhinavs/moonwalk) 主题修改，主题代码遵循其 MIT License。笔记正文、截图及整理内容不因主题许可证而自动采用 MIT License；引用或转载时请保留原始来源并遵守相应内容的授权要求。
