# 维护公开版源文件

公开版为60局、21类场景、7种规模。显示署名为Phoenix Chen，作者角色为Agile Coach。

## 文件职责

- `games.js`、`expansion-data.js`、`facilitation-data.js`：虚构内容、主题与规模。
- `core.js`、`expansion-core.js`、`facilitation-core.js`：计算、导入校验、推荐与组织输入。
- `app.js`、`expansion-app.js`、`facilitation-app.js`：单局与各扩展界面。
- `organizer-core.js`、`organizer-app.js`、`organizer.css`：仅会前筹备、独立记录和公开/完整材料导出。
- `build.mjs`、`build-extra.mjs`：生成单文件互动入口、完整手册、7份规模方案、目录与60份主持提示。
- `*check.mjs`：内容、边界、记录、隐私、浏览器呈现与离线检查。
- `package.mjs`：按明确文件清单生成发布压缩包，排除依赖、QA、个人记录和旧档案。

## 维护

在项目根目录执行README中的安装、构建与验证命令。依赖从普通npm目录读取，源码不依赖作者电脑上的绝对路径。浏览器检查可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 使用本机已安装的Chromium。

生成HTML不应作为唯一编辑入口。改变场景或模式后补相应回归、检查本地链接并查看截图；检查通过只证明制作质量。

四类浏览器记录采用独立公开版存储键；JSON兼容协议保留。完整旧备份中存在本版未包含的场景时会拒绝导入，不静默删除记录。

`qa/`只存隔离的虚构检查结果，默认不上传、不打包。
