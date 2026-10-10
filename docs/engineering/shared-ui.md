# 抓包流量公共 UI

流量列表、组合筛选、双栏报文、独立详情、请求重放和插件设置采用
`@xsec/ui-react` 0.1.7、`@xsec/design-tokens` 0.1.2 与 React 18.3.1。
按钮、输入、选择、Checkbox、Table、Dialog、标题、加载、空态和错误反馈使用公共组件。
Host 明暗、密度、字号、代码字体和减少动效同步到同一主题作用域。
五种宽度下保留局部表格滚动、长内容换行及窄屏单列；主要触控操作至少 44px。
两个分隔条支持指针、触控和键盘，触控区域至少 24px，卸载释放监听器。

## 数据和生命周期

列表、历史、正文和重放结果通过 Host 私有会话绑定读取。新增
`xsec.traffic.list.open`、`xsec.traffic.replay-attempts.open`、
`xsec.traffic.replay.open` 使用既有 `xsec.traffic.payload` 通道；
`xsec.traffic.payload.open` 支持可选 UUID requestId。
每次读取使用独立的 kind / UUID 标识，RPC acknowledgement 与分片 completion
同时受理；分片版本、编号、数量、UTF-8 和 JSON 完整性在实际边界校验。
RPC 保持 64 KiB、列表保持 100 条分页、packet 保持 48 KiB，并限制每次最多
2,048 个 packet。重放请求沿用后端 2 MiB 上限，Host 仅为两个声明的重放方法
配置既有精确请求额度。读取、重放和引用继续分别校验 session read / write /
composer write 权限；原方法及旧 payload flowId 读取契约保留。

读取失败清除失效列表，并提供显式重新读取。规则刷新失败清除当前规则快照，
禁用依赖快照的变更，保留编辑草稿；严重级别包括真实契约的 `info`。
设置、CA、规则与重放通过同步 busy / epoch 控制重复提交和挂载归属。
Host bridge 的 lifetime 拒绝界面释放后的迟到读取；前端订阅、计时器、
ResizeObserver 和指针监听随页面释放。已提交操作的真实结果由 Runtime 持有。

## 构建和依赖

esbuild 输出 Safari 16 / Chrome 105 / ES2022 单文件 ESM，并校验外部 import、
命名 activate 入口、固定 vendor 校验和及锁文件版本。包包含逐字节可复核的
frontend、许可证和 CycloneDX SBOM。React、React DOM、lucide-react 与传递依赖
固定版本；共享 Node 依赖和 pnpm store 复用，依赖下载为零。
生产输出的主要依赖贡献为 React DOM 130,748 B、Base UI React 108,153 B；
Motion 的产物贡献为 0 B。以上为 esbuild 的 bytesInOutput，gzip 计量整份入口。

## 已执行验证

证据目录：
`/Users/xiaosong/.codex/visualizations/2026/10/02/01a0faad-6517-7cd3-90b5-b818bc64660d/plugin-traffic-ui`。

| 范围 | 真实结果 / 证据 |
| --- | --- |
| 流量、筛选、详情、分页、引用 | 13 项流程通过，traffic-flow-v2-report.json |
| 设置、规则读写、CA 状态及取消 | 10 项通过，settings-flow-v3-report.json |
| 大历史、草稿、敏感目标取消、解析及离线错误、键盘 | 6 项通过，replay-flow-v2-report.json |
| 并发完整读取和拒绝边界 | 列表 81,415 B、正文 140,316 B、历史 151,823 B，6 项拒绝边界通过，stream-boundary-v3-report.json |
| 生命周期 | 列表/详情 3 项、设置 6 项、重放/触控/卸载 6 项通过，对应 lifecycle 报告 |
| 响应式与视觉 | 四页面 160 组和筛选 Dialog 40 组，visual-v3-report.json；320px / 18px 设置 31 个可见控件检查通过 |
| macOS arm64 Desktop | 四页面成功 RPC、真实生产 sandbox 100 条列表及完整正文、frontend / host 开发日志通过，native-mount-v3-report.json；截图已目视检查 |
| 真实重放后端 | Chrome、browser MCP、managed mitmdump、loopback HTTP、SQLite、conversation binding，超过 64 KiB 的请求完成并精确保存历史，replay-real-host-v2-report.json |

插件 `pnpm typecheck`、`pnpm check:generated`、28 项 `pnpm test` 与 CLI
validate / dev watcher / pack、ZIP 内容及 SHA-256 在 final-gates 与 packaging-gates 回执维护。
Host 初轮 changed 检查通过类型、23 项相关测试和 fail-fast；新增真实重放
回归通过 `cargo fmt --all --check`、带 `real-browser-e2e` 的对应 lib 测试与
package Clippy。最终整合父提交后的验证和主仓摘要以 local-integration-final.json 为准。
浏览器验证使用现有 Playwright；本会话未提供 Browser skill。

## 性能决定

同一 Runtime、同一 30 条 success 状态记录，一次预热、4 组 ABBA、每版
8 个新 Chromium context。输入为可信点击/滚轮，刷新和详情检查实际提交及绘制；
滚动测量各版实际滚动容器。每次核对父页面和 iframe execution context / target
拓扑，强制 GC 后按实际 isolate 计量。总 JS 堆包括相同 Host harness。

| 中位数 | 基线 | 公共 UI |
| --- | ---: | ---: |
| 就绪 | 170.45 ms | 164.40 ms |
| 刷新提交 / 绘制 | 14.95 / 39.65 ms | 32.80 / 54.75 ms |
| 详情提交 / 绘制 | 28.20 / 45.35 ms | 18.85 / 44.40 ms |
| 实际滚动绘制 | 33.55 ms | 33.35 ms |
| 列表总 JS 堆 | 13,524,706 B | 15,575,010 B |
| 详情总 JS 堆 | 14,808,838 B | 17,033,422 B |
| frontend gzip | 33,249 B | 128,487 B |

基线 100 条列表超过既有 64 KiB RPC 上限，等价比较使用双方成功的 30 条记录。
新版 100 条另做一次预热、4 个新 context，绝对就绪中位数 272.85 ms，
GC 后总堆 16,648,078 B。技术 10% 调查线保留；公共组件的主题、表单、焦点、
弹层及完整分片读取成本已调查，依据用户自主实现授权接受本地集成，决定为
`ACCEPTED_WITH_MEASUREMENT_LIMITS`。原始报告为 performance-v4-report.json、
performance-100-v1-report.json 和 performance-investigation-v2.json。
有限样本不代表其他浏览器、原生 RSS 或长会话性能。

最新原生构建 run `5c94ad12-9e3a-490c-821d-bcbe14d4a571`：102.670 s，
峰值采样 RSS 3,451,518,976 B，卷级净变化 −3,150,467,072 B。
真实重放及 Clippy run `f85a7c43-8cb0-4329-963a-b1340795e5d3`：186.421 s，
峰值 RSS 4,217,290,752 B，卷级 +905,814,016 B；swap 均保持 61,603,840 B。
原生使用共享 dev target，真实重放复用 diagnostic target；输出位置和完整资源
记录在各 resource-report.json。卷级变化包括同时发生的系统活动。

## 兼容、回滚和待验收边界

本版本需配套包含三个新增 Host 方法的 Desktop。Plugin API 2 / engine ^1.5.0、
权限和持久化格式沿用现行契约；frontend 本地集成顺序为 Host 与插件配套回读。
旧 Desktop 对新方法的拒绝需按版本配套处理。回滚撤销本批插件及 Host 独立提交，
经资源入口重建 frontend / 许可证 / SBOM 与 Desktop。已确认的用户规则、设置和
重放记录保持原格式，业务数据恢复使用对应显式操作并回读。

Windows x64、Linux x64、macOS Intel、Safari 16 实机、系统输入法、读屏、
长会话、原生性能、系统 CA 导入/轮换以及正式安装/发布未验证。
前端重放的解析、取消及离线错误和后端真实成功链路分别有证据；本批尚未验证
生产前端到 hosted browser 的成功发送全链路。隔离快照默认官方插件初始化
仍返回 expected 8 plugins, got 0，其原因需独立调查。
