[English](README.md) · [研究说明](../../docs/media-signals.zh-CN.md)

# 媒体信号实验

独立运行的 Linux 原型，用于真实输出音频和逐字歌词研究，不修改 Ripple 的 IPC、应用状态或打包应用。研究进度见 [#15](https://github.com/ArsvineZhu/Ripple-Next/issues/15)。

## 运行

使用仓库指定的 Node 及已安装依赖。主机需要 `pw-cat`、`pw-dump`、可用的 PipeWire 会话和 MPRIS 播放器。Folia 歌词需要在其「设置 → 连接与集成 → 歌词接口」启用 `http://127.0.0.1:32109/v1/lyric`。

```sh
node experiments/media-signals/server.mjs
```

进程打印使用空闲端口的回环地址，打开后选择应用输出或设备混音，点击 **Start capture**。存在 Folia 时初始优先选中它。音频与歌词／时间轴来源独立选择并明确标注。需要固定端口时设置 `RIPPLE_LAB_PORT=43143`；Ctrl+C 结束服务和采集子进程。

页面显示双声道 min/max 波形、64 段频谱、RMS／峰值 dBFS、最强 FFT 频点、播放进度，以及原文／翻译和逐字填色；原生与估算逐字时间分别标注。频率读数是最强频点，不是基音或音符识别器。

## 数据路径与生命周期

- PipeWire `pw-cat`：按已核验输出节点的 `object.serial` 取得双声道 48 kHz f32le。应用读取其输出流，设备读取 monitor 输出；选择列表不提供麦克风／输入节点，禁止退回默认输入。
- [`modules/media-signals/audio`](../../modules/media-signals/README.zh-CN.md)：固定 2048 帧双声道环形缓冲、Hann 窗 FFT、双声道功率合成以保留反相立体声、每声道 128 个 min/max 点；最多每秒向浏览器发送 30 个分析帧，对慢客户端保持有界。PCM 不落盘，也不发送到浏览器；缩减帧使用独立的定长二进制流，元数据／歌词走 SSE，歌词文档仅在修订变化时发送。
- MPRIS：首次快照、属性／会话／跳转事件，加每五秒一次的位置校准。浏览器按速率在单调时钟上外推位置，暂停时冻结。Position 不会随连续播放发送属性变化事件。
- Folia：有查看页面连接时，每秒读取一次本地歌词快照；行／字时间为秒，偏移为毫秒。不请求云端歌词服务。
- 最后一个页面断开或页面隐藏时释放音频采集。返回后重新连接元数据和歌词，音频需明确重新启动。不修改应用音量、播放状态或持久偏好。

歌词 API 可以缺少标题／歌手，也没有曲目修订号。页面只给 Folia MPRIS 来源使用此接口，切歌清空旧歌词，并拒绝明确不匹配的标题。**响应没有身份信息时，无法证明精确对应当前曲目**，界面会标注这一限制；接口失败只清空歌词，不影响音频。

## 其他歌词来源

加载本地 .lrc／.txt，可向任意选中播放器明确分配纯文本或逐行歌词；Use player lyrics 恢复自动选择。文件只留在本机，切歌清除。Folia 只是独立[供应方](../../modules/media-signals/README.zh-CN.md)，不代表通用层协议。网易云适配器需明确歌曲 ID 才请求；Spotify／Apple Music 目录记录已研究方案，不宣称有可用的直接加载器。演示不自动请求这些远程服务。

## 验证

```sh
node --test tests/features/media-signals/*.test.mjs
pnpm exec oxlint --config .config/oxlint.json --deny-warnings modules experiments
node experiments/media-signals/benchmark.mjs
pnpm exec prettier --config .config/prettier.json --check 'experiments/**/*.{mjs,html,md}' 'modules/**/*.{mjs,md}'
```

测试使用原创文本和标定合成 PCM，不使用歌曲或主机麦克风。实机检查涵盖两种输出来源、真实 PipeWire 连线、变化中的音频帧／歌词、隐藏／断开后的清理及资源开销。截图、实时元数据和测量报告保存在忽略的 out/，不将取得的歌词／音频加入夹具。

Windows 和 macOS 路径已研究，但本原型未实现或在相应主机验证；见[集成决策](../../docs/media-signals.zh-CN.md)。
