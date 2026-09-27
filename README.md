# 学习型 GitHub Issues MCP Server

这是我学习 MCP（Model Context Protocol）时做的本地项目。它让 VS Code 中的 AI 助手调用我写的工具，读取 GitHub 公开仓库的真实 issue，再根据结果回答问题。

项目使用 TypeScript、官方 MCP SDK、Node.js、Continue 和 DeepSeek API。MCP Server 在本机运行，不需要部署到云端。

## 能做什么

| 工具 | 作用 |
| --- | --- |
| `add` | 两数相加，练习参数与返回值 |
| `subtract` | 两数相减，练习自己注册工具 |
| `greet` | 根据名字生成问候语 |
| `list_github_issues` | 读取公开仓库最近的未关闭 issue，排除 PR |

例如在 Continue 的 Agent 模式中输入：

> 请调用 list_github_issues，读取 modelcontextprotocol/typescript-sdk 最近 5 个未关闭的 issue，并用中文概括。

调用链是：用户提问 → DeepSeek 选择工具 → Continue 调用本地 MCP Server → 工具请求 GitHub API → DeepSeek 根据返回的数据回答。

## 从零开始运行（Windows + VS Code + Continue）

准备好 Node.js 20 或更新版本、VS Code、Continue 扩展，以及自己的 DeepSeek API Key。读取公开 GitHub issue 不需要 GitHub 账号或 GitHub API Key。

1. 下载或克隆本仓库，在 VS Code 中打开整个项目文件夹。
2. 打开 VS Code 终端，执行 `npm.cmd install`。等待依赖安装完成。
3. 在项目根目录的终端执行：

   ```powershell
   Copy-Item .continue\.env.example .continue\.env
   ```

4. 打开 `.continue/.env`，把等号后面的示例文字换成自己的 DeepSeek API Key。这个文件已被 Git 忽略，不要把密钥发给别人或提交到 GitHub。
5. 按 `Ctrl+Shift+P`，运行 `Developer: Reload Window`。打开 Continue，选择 `DeepSeek Flash` 模型和 `Agent` 模式。
6. 打开 Continue 的 `Tools`，确认 `learning-mcp-server` 下能看到 4 个工具，然后发送上面的示例问题。

在 Windows PowerShell 中，如果直接输入 `npm` 被脚本执行策略拦住，使用这里的 `npm.cmd` 即可。

## 只想手动查看工具

不配置 DeepSeek，也可以用 MCP Inspector 手动调用工具。在项目根目录运行：

```powershell
npm.cmd run inspector
```

在 Inspector 中连接后，打开 `Tools`，调用 `add` 或 `list_github_issues`。使用 Continue 时，不需要同时启动 Inspector；Continue 会自行启动 MCP Server。

## 文件与流程

| 文件 | 作用 |
| --- | --- |
| `src/index.ts` | 创建 MCP Server、注册工具、编写每个工具的处理逻辑 |
| `package.json` | 记录依赖以及 `inspector`、`typecheck` 等命令 |
| `tsconfig.json` | TypeScript 编译配置 |
| `.continue/models/deepseek.yaml` | 告诉 Continue 使用哪个 AI 模型；不包含实际密钥 |
| `.continue/mcpServers/learning-mcp.yaml` | 告诉 Continue 如何启动本地 MCP Server |
| `.continue/.env.example` | API Key 填写示例；实际密钥放在被忽略的 `.continue/.env` |
| `.vscode/mcp.json` | 给 VS Code 自带聊天使用的另一份 MCP 启动配置 |

在 `src/index.ts` 中，`registerTool` 定义工具名、说明、输入参数和处理函数；`StdioServerTransport` 让 Continue 通过标准输入/输出与 Server 通信。GitHub 工具只读取公开信息，不修改仓库。

## 已知限制

- `list_github_issues` 只读取公开仓库，不支持私有仓库。
- GitHub 对未登录的 API 请求有频率限制。遇到限制时，工具会返回错误信息。
- GitHub 的 issue 接口也会返回 PR。本项目读取最近一页结果并排除 PR，因此某些仓库返回的 issue 可能少于请求数量。
- 为控制返回内容大小，每条 issue 的正文最多保留前 500 个字符。

这是学习用的 MVP，重点是理解从 AI 对话到 MCP 工具、再到外部 API 的完整流程。
