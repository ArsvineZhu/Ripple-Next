[English](media-signals.md) · [本地原型](../experiments/media-signals/README.zh-CN.md)

# 歌词与音频信号

本文记录本地前置研究及集成方向。打包应用尚不包含歌词或音频分析功能；Linux 原型在工作区独立运行，不修改已安装应用。

## 决策

将播放身份／时间轴、歌词文档、音频分析分成三种能力。媒体控制会话不是音频流，音频设备也不提供歌词文字。可视化使用原生输出回环，歌词使用播放器／供应方适配器；不把音频速率的数据塞入 MediaSnapshot，也不通过设置存储传递 PCM。

| 能力           | Linux                                                      | Windows                                           | macOS                                           |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| 身份与时钟     | MPRIS owner／曲目 ID、Position、Rate、Seeked               | GSMTC 会话及时间轴属性／事件                      | 已支持播放器的适配器；系统音频 tap 不是歌曲时钟 |
| 输出设备 PCM   | PipeWire sink monitor；PulseAudio monitor 是独立备用适配器 | WASAPI 端点回环                                   | Core Audio process tap 或 ScreenCaptureKit      |
| 单独播放器 PCM | PipeWire Stream/Output/Audio，关联进程树及对象 serial      | WASAPI 应用回环，Windows build 20348+，包含进程树 | Core Audio tap，macOS 14.2+，按进程／进程组选择 |
| 歌词           | 可选文字／自定义元数据、本地伴随文件或明确的播放器 API     | GSMTC 媒体属性没有歌词文字成员，需独立来源        | 播放器专用来源；音频 tap 不提供通用歌词输出     |

Windows／macOS 结论依据平台一手文档，尚未在相应主机运行验证。Core Audio tap 需要系统音频权限及 `NSAudioCaptureUsageDescription`；保持 tap 不静音原输出，结束时销毁聚合设备。Windows 单进程回环可以独立于输出端点工作。

## Linux 实测

主机使用 PipeWire 1.6.2，运行 Folia。其 MPRIS 身份为 Folia，总线名称来自 Chromium；当前元数据有标题、歌手、专辑、时长与曲目 ID，没有歌词文字。Position、Rate、Seeked 可用于时钟。现有 Ripple MediaSession 尚未携带时间轴字段，正式集成需要明确的时间轴契约。

Folia 应用流与内置输出设备 monitor 都已取得真实双声道 48 kHz f32 PCM；每秒探测均为 384,000 字节，且包含非零音频。实际图连线证明采集端来自 Folia 输出节点，原来通往扬声器的连线仍活动。选择器排除 Audio/Source，禁止退回或重新连接到其他目标。

本机 MPRIS 与音频 PID 不同：前者是 Folia 主进程，后者是子进程。应先解析 D-Bus owner 的 Unix PID，再关联 PipeWire 客户端／进程树；开始采集时校验存活身份和 object.serial。应用显示名、复用的节点 ID 或歌曲标题不足以建立持久绑定。

原型分析 2048 帧窗口，在 48 kHz 下为 42.67 ms，最多每秒发送 30 个缩减帧。使用恰好落在 FFT 频点的 1500 Hz、振幅 0.25、双声道反相测试，验证 RMS、峰值、FFT 振幅／频率及分片 PCM 拼装。实际开销记录在本地 out/ 报告中，覆盖分析时间和帧传输，不作为跨机器保证。

输出回环的采集节点自身也是 `Stream/Input/Audio`，并带 `stream.capture.sink=true`，因此仅凭流类别无法证明正在使用麦克风。当前产品设备观察器依赖输入流类别；集成音频分析时应结合采集模式和图目标细分，否则可能把自身的输出 tap 误报为麦克风。

原型显示当前实时采样窗口。可拖动的整曲波形需要获准读取的本地文件／解码流或峰值索引来源；输出回环无法提供尚未播放的音频。已播放区间可以逐步累计包络，而不保留 PCM。端到端显示延迟还包含音频图、传输及绘制缓冲，FFT 窗口时长只是其中一部分。

## 歌词来源与时钟

Folia 的可选 `GET http://127.0.0.1:32109/v1/lyric` 是只读回环接口。实际响应包含原文、可选翻译、逐字区间及原生／估算逐字标记；观察到的快照有 99 行，独立于 MPRIS 元数据可用。

行／字区间单位是秒，offset 单位是毫秒。按 `lyricTime = playbackSeconds - offset / 1000` 定位，在字区间内插值填色。暂停冻结 MPRIS 锚点，跳转／切歌／变速替换锚点；在不连续变化后重读 Position，并偶尔校准，不按绘制频率查询。MPRIS 明确不会为正常前进的 Position 发送 PropertiesChanged。

HTTP 接口只提供快照，没有推送事件或播放器时钟；实验仅在有查看页面连接时以 1 Hz 读取。Folium 模组的 `lyrics.loaded` 与播放事件可作为后续事件桥接方案，需要单独审阅并启用播放器集成；本原型不安装模组。

接口的标题／歌手是可选字段，没有必需曲目 ID／修订号，当前实测响应也缺少这些身份字段。因此限制为 Folia 来源，在元数据变化时清空旧歌词，核对存在的标题并丢弃过期请求；响应缺少身份时，这些措施仍无法证明切歌期间的原子关联。正式桥接应提供来源会话、曲目 ID、修订号及单调时间戳，以明确契约代替猜测。

其他播放器优先读取明确导出的歌词，其次是用户选择的本地 LRC／TTML 或文件标签。LRCLIB 等在线服务可按标题／歌手／专辑／时长匹配，但必须由用户选择启用，保留来源及匹配置信度，区分纯音乐、未找到、不可用。实验不发出此类请求。PCM 本身不能取得播放器的歌词文档；语音识别／强制对齐属于另一种能力。

## 可复用模块与供应方边界

实现已放进 [modules/media-signals](../modules/media-signals/README.zh-CN.md)，experiments 只保留演示／基准运行器。DSP、二进制帧和通用歌词时间轴可复用，应用入口没有导入。各供应方在独立目录中管理单位转换和请求。

| 来源                 | 当前实现与调查方案                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Folia                | 可用本地 HTTP 适配器，独立于 `lyrics/providers/folia`，协议不通用于其他播放器。                                         |
| 本地 LRC／MPRIS 文字 | 可用通用来源，使用任意选中播放器的时钟，无时间信息时保持纯文本。                                                        |
| 网易云               | 明确歌曲 ID 的实验性 LRC／翻译适配器，公开样例解析出 51 条 cue；不宣称有稳定开放协议或已实现 YRC。                      |
| Spotify              | 已审查开发者 API 中未发现公开歌词正文接口；可选本地歌词或独立获准使用的供应方。                                         |
| Apple Music          | 已核对的 MusicKit Song 只有 hasLyrics；Mac 上本地／已保存歌词导出仍需验证。Cider 等合作客户端有独立供应方歌词服务文档。 |

各方案证据及限制保存在[适配目录](../modules/media-signals/README.zh-CN.md#歌词供应方)。没有启用 Spotify／Apple 直接加载器、Cookie 提取或自动外部查询。演示可明确向当前曲目分配本地 LRC，切歌清除。

相同 PCM 基准使用 Node 22.23.3、同一份 2048 双声道样本及五轮预热测量，保存的基线分析中位数约 0.43 ms，当前模块约 0.13 ms；该夹具的 JSON 帧为 2844 字节，二进制固定为 1152 字节。真实音乐实测约 29.3 帧／秒、33 KiB／秒。真实 CPU／歌曲窗口属于观察值，不作为相同输入基准。实现复用 FFT 表及工作／输出数组，元数据与歌词修订分开发送，不随每次时钟更新重复发送完整歌词。

## 正式集成归属

- 主进程：管理原生采集／来源身份、歌词请求、取消、资源租约、时间锚点及过期代次。音频分析放在 worker／原生 helper 和有界缓冲中，不占用元数据／控制队列。
- 共享层：管理可序列化来源能力、时间轴／歌词 schema 及缩减帧契约，区分纯文本、逐行、原生逐字和估算逐字。
- Preload：提供明确的订阅／取消订阅接口，固定大小分析帧独立于持久化和状态广播；通过来源代次、序号及时间戳丢弃旧帧。
- 界面：Canvas／WebGL 绘制及基于锚点的逐字高亮。隐藏／离屏消费者释放音频租约，可见消费者可共享同一采集；按有效绘制频率限流并跳过慢消费者帧。

故障局限于来源：没有歌词不阻断播放或音频分析，设备断开不转录麦克风。保留原播放控制及音频路由；原型验证这些边界，不增加打包 IPC 或设置。

## 来源

- [MPRIS Player：Position、Rate、Seeked](https://specifications.freedesktop.org/mpris/latest/Player_Interface.html)
- [PipeWire pw-cat](https://docs.pipewire.org/page_man_pw-cat_1.html)、[capture-sink 属性](https://docs.pipewire.org/group__pw__keys.html)、[目标与禁止 fallback](https://docs.pipewire.org/page_man_pipewire-props_7.html)
- [Windows 进程回环及最低版本](https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/)、[GSMTC 媒体属性](https://learn.microsoft.com/en-us/uwp/api/windows.media.control.globalsystemmediatransportcontrolssessionmediaproperties)
- [Apple Core Audio taps](https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps)
- [Folia 歌词接口](https://github.com/chthollyphile/folia-major/blob/009d6e4bd8b40ec618d27552948b6fae05cf0327/docs/lyric-api.md)、[Folium 事件](https://github.com/chthollyphile/folia-major/blob/009d6e4bd8b40ec618d27552948b6fae05cf0327/mods/README.md)
- [LRCLIB API](https://lrclib.net/docs)
