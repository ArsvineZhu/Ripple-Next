[English](README.md) · [模块](../../../README.zh-CN.md)

# 网易云音乐

网易云方案已实测并实现为独立实验适配器：明确提供歌曲数字 ID，读取逐行 LRC 和按时间匹配的翻译。公开样例解析出 51 条 cue。不会读取登录态、搜索或自动请求；该消费者接口无公开稳定承诺。YRC 逐字接口可继续研究，但本适配器目前不支持它，不把逐行歌词伪装成逐字。

Evidence endpoint: [public read probe](https://music.163.com/api/song/lyric?id=33894312&lv=-1&kv=-1&tv=-1). Live response text stays under ignored out/, not in tests.
