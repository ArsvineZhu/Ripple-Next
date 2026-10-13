[English](README.md)

# 设置玻璃控件

`GlassSurface` 装饰现有 `PreferenceSlider` 手柄，原生 range 继续管理连续取值、键盘微调、刻度吸附和 pointer capture。运动参数为 elasticity=0.15、接近范围 200 CSS px、0.2 秒 ease-out、按压 scale=0.96；取值轴保持不偏移，垂直反馈限制为 2 CSS px。触摸保留按压反馈；减少动态效果时保留光晕和焦点状态，关闭形变。失焦、取消、离开范围和卸载会归位并清理订阅。

Select 与 SearchableSelect 继续由 Radix/cmdk 管理输入和焦点。收起时数值文字右对齐；展开卡片内，选项名称、必要的说明左对齐，勾选标记位于左侧。卡片以 Radix 定位原点整体缩放，展开 240 ms、收起 140 ms；淡入淡出只作用于前景文字，以保留背景采样。减少动态效果时直接切换。颜色框打开[系统选择器](../../../main/services/colorPicker.ts)。

二元设置使用普通 `PreferenceSwitch`，尺寸为 56 × 30 CSS px 的胶囊，开启时为绿色轨道和白色手柄。颜色框保留普通色块与数值按钮。玻璃用于滑块手柄、多选项弹出卡片和 60 × 36 CSS px 的胶囊返回键。返回键共用 rdev 运动控制器，在祖先 ref 挂载后读取真实控件，按钮与图标一起运动。

菜单沿用 LeonardSEO 的深色材质层，使用 8 CSS px bezel、24 CSS px 圆角、K=1.62、specular=0.16 和中性半透明底色，使平坦设置背景上的边缘与内部保持连贯。blur=3、ior=1.5、refraction=1、dispersion=0.06、saturation=1.5、profile=squircle、光照角度 -135°，厚度仍为 1.5 × bezel。滑块保留上游光学默认值，尺寸 40 × 28 CSS px、圆角 14、K=1.15；不支持 corner-shape 时回退到普通圆角轮廓。

来源、锁定 SHA、许可证和逐项补丁见 [English](README.md#sources-and-patches)。保留上游原文件、滤镜顺序、三通道色散、高光与 tint 遮罩，只形成一个组合材质实现。二维超椭圆使用欧氏 CSS 像素距离，K=1 退化为原版圆角。贴图分层缓存限制为 96 项／估算 48 MiB，轮廓场缓存为 16 项／24 MiB；纯位置和 CSS 形变不重建资源，不保留持续动画循环。两份 MIT 许可证同时随安装包分发。

SearchableSelect 在 Radix 提供定位变量前限制尺寸；时区列表只在展开／收起期间挂载，选项数据经过 memo。在 i9-12900H Windows 机器、Electron 44.5.1、906 × 604 CSS px、实际 DPR 1.5 下，修复前菜单先撑到 16,461 CSS px 高，每次生成／编码六张贴图，三次展开的主线程长任务为 543／641／593 ms。最终可见窗口的记录中，首次编码三张正确尺寸贴图，共 8.9 ms、长任务 88 ms；重复展开没有编码或长任务。首次冷展开仍超过 16.7 ms 的整帧预算。rAF 间隔只表示调度，GPU 光栅化／合成完成与解码资源内存未测。

A/B/C/D 对照留在 `experiment/liquid-glass-20261013` 的 f095448，本 PR 接入小控件。复测运行 `pnpm check`、`pnpm test`、`pnpm package` 和 `pnpm start`，在外观页检查滑杆完整拖动、键盘微调、菜单展开／收起、提示、焦点恢复、浅色／深色、减少动态效果和窗口尺寸变化。进入编辑页，接近并按压胶囊返回键，移出后释放、失焦，检查归位；切换 12 小时制和自动定位，检查条件设置出现／隐藏动画；进入与返回应按相反方向切换。确认／取消系统选色，并检查已有透明度。

数值回归覆盖 DPR 1／1.5／2 的原版圆角、缓存像素一致性和分层依赖。Windows 实机验证使用 Electron 44.5.1／Chromium 152.0.7977.130、实际 DPR 1.5 和隔离测试配置。macOS／Linux 的调用与返回格式经过 mock 测试，真实对话框需在对应系统复测；依赖见[平台说明](../../../../docs/platform-compatibility.zh-CN.md)。
