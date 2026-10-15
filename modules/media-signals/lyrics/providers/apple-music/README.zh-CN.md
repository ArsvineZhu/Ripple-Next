[English](README.md) · [模块](../../../README.zh-CN.md)

# Apple Music

Apple Music 尚未实现直接歌词来源。已核对的 MusicKit Song 只有 `hasLyrics` 标记，无法用它取得正文或逐字时间。macOS Music.app 的本地／已保存歌词导出、合作播放器桥接可在 Mac 上继续验证；本机没有完成这类验证。本地 LRC 不依赖这些方案，也不提取 Apple 私有令牌。

第三方路线可以是合作客户端／供应方桥接。Cider 文档中有选择 MXM／QQ 等来源的歌词接口，它与 Apple 原生曲库歌词出口不同；此次只检查文档，没有验证服务、调用接口或发送凭据。

Sources: [MusicKit Song](https://developer.apple.com/documentation/musickit/song), [hasLyrics](https://developer.apple.com/documentation/musickit/song/haslyrics), [MusicKit](https://developer.apple.com/musickit/).
