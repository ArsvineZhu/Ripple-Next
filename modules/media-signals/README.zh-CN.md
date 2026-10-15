[English](README.md) · [演示](../../experiments/media-signals/README.zh-CN.md) · [研究](../../docs/media-signals.zh-CN.md)

# 媒体信号模块

研究进度见 [#15](https://github.com/ArsvineZhu/Ripple-Next/issues/15)。

可复用的本地模块，独立于 Electron 应用入口、状态和 IPC，尚未打包或在 Ripple Next 中启用。

| 归属                                      | 实现                                                              |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `audio/analyzer.mjs`                      | 固定双声道环形缓冲，预计算 FFT 表／窗／频段，复用工作区及输出数组 |
| `audio/frame.mjs`                         | 与传输方式独立的版本化二进制分析帧编解码                          |
| `platform/linux`                          | PipeWire 输出发现／采集与 MPRIS 观察／时钟；禁止麦克风 fallback   |
| `lyrics/model.mjs`、`lyrics/timeline.mjs` | 通用歌词文档、来源身份及秒制时间轴                                |
| `lyrics/providers/<provider>`             | 各供应方自行负责格式转换、请求和来源标记                          |

## 歌词供应方

- [Folia](lyrics/providers/folia/README.zh-CN.md)：可用的本地 HTTP 适配器，协议仅属于 Folia。
- [本地 LRC](lyrics/providers/local-lrc/README.zh-CN.md)：可用的文件／文字解析器，适用于任意播放器时钟。
- [MPRIS 文字](lyrics/providers/mpris/README.zh-CN.md)：可用的可选播放器文字／LRC 来源。
- [网易云](lyrics/providers/netease/README.zh-CN.md)：按明确 ID 请求逐行 LRC 的实验适配器，已实测；上游未承诺公开稳定协议。
- [Spotify](lyrics/providers/spotify/README.zh-CN.md)、[Apple Music](lyrics/providers/apple-music/README.zh-CN.md)：已调查方案与限制，尚未实现直接歌词加载器。

文档区分纯文本、逐行、原生逐字和估算逐字。`offsetSeconds` 表示显示延后，各适配器自行转换偏移约定：Folia 正毫秒值表示延后，本地 LRC 将正偏移标签解释为提前。来源关联分别标明会话、手动文件／ID、仅标题或未验证；只匹配标题不能证明曲目身份。

## 音频契约

`push(Buffer)` 输入交错双声道 f32le PCM，`snapshot()` 返回借用视图，有效期到下一次快照；保留历史的调用方需要复制。合并两声道 FFT 功率，避免反相抵消；Hann 窗补偿相干振幅。频率读数是最强频点，不是基音识别。

分析帧不含 PCM。v1 固定 1152 字节，小端序：64 字节头部（magic／版本／长度、序号、采样率、样本数、时间戳、FFT 长度、最强频点和双声道 RMS／峰值），64 字节频谱，以及 1024 字节 signed-16 双声道 min/max 包络（每声道 128 对）。波形显示裁剪到 ±1，浮点 RMS／峰值仍保留超范围数值；包络量化误差不超过 1/32767。帧解析校验长度／版本，并在一个固定帧缓冲中重组任意传输分片。

演示使用独立二进制 HTTP 音频流，元数据／歌词修订走 SSE；隐藏／关闭时取消两者。Linux 适配器监督原生子进程，不改变原扬声器连线。

## 验证

```sh
node --test tests/features/media-signals/*.test.mjs
node experiments/media-signals/benchmark.mjs
```

固定输入基准使用 48 kHz、2048 双声道样本、500 次预热及五轮各 1000 次分析；可选 `--baseline <本地分析器.mjs>` 对比保存的实现。本工作区测得中位数约 0.43 → 0.13 ms，该夹具的 JSON 分析包为 2844 字节，二进制为 1152 字节。真实歌曲开销不同，实机证据保存在忽略的 out/。

不读取 Cookie、用户密钥或服务私有会话。只有调用方明确传入歌曲数字 ID 并调用网易云适配器时才发出外部歌词请求；演示本身只用本地／播放器来源。测试使用合成 PCM 和原创歌词。
