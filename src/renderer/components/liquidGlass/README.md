[简体中文](README.zh-CN.md) · [Design principles](../../../../docs/design-principles.md)

# Settings glass

Settings uses a 36×16 px switch track with a 24 px hit target and 20×16 px slider handles. Sliders have an unfilled surround and a 6 px accent track. Sliders and switches use white resting capsules and a 1.45× clear lens immediately on press. The full sampling box is prepared at lens size. Active handles have no blur or solid tint. Their displacement map compresses the track inside the lens and refracts its rim with separate RGB sampling; directional highlights define the edge. Handle optics use a compact preset derived from the shared material preferences. Held drag deformation is bounded and has no position offset; release, cancellation, blur and unmount restore the resting state.

`useGlassMotion` owns pointer response without consuming the host's events. Handles respond while pressed; menus have approach feedback. Back buttons begin tracking only while hovered or held and return to rest on leaving or releasing outside the control. Native range capture transfer while the pointer is still held preserves the active lens. Reduced motion keeps the operations available without the animated response.

Select/SearchableSelect retain Radix/cmdk focus and input ownership. Closed values align right; popups use left-aligned labels, leading checkmarks and descriptions. Size is bounded before positioning, and the time-zone list is mounted during open/close. Popup transforms use the positioning origin; backdrop sampling remains separate from foreground text opacity.

## Material and resources

| Source                                                                                                                          | Revision                                 | Notice                        |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------- |
| [LeonardSEO/liquid-glass-react](https://github.com/LeonardSEO/liquid-glass-react/tree/b857e5cd1ce3daf5599fc9a838364e591aa0c0e5) | b857e5cd1ce3daf5599fc9a838364e591aa0c0e5 | [MIT](vendor/leonard/LICENSE) |
| [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react/tree/ac48eab18d1f7f444ae30002d240cae29c863a21)             | ac48eab18d1f7f444ae30002d240cae29c863a21 | [MIT](vendor/rdev/LICENSE)    |

Original vendor files and notices remain intact. Production uses the adapted Leonard material and the rdev directional motion equation. The material includes refraction/dispersion channels, specular/tint masks and its SVG filter pipeline; the motion owner supplies pressed geometry.

The superellipse field uses exponent 2^K, CSS-pixel distances and analytic normals, with the rounded reference field at K=1. Field and displacement/specular/tint resources have independent bounded caches. Composition changes and transforms do not regenerate maps; DPR invalidates its dependent resources.

## Preferences and preview

Appearance & Position → Liquid Glass (Exp) owns a sticky preview of actual slider, switch, menu and button controls. Preview values stay local; material changes use the shared Settings context. Disabling Settings glass displays ordinary controls and removes glass pointer response. Island glass is unavailable.

Reset sets IOR 2, refraction 1.5, dispersion 0.08, menu blur 3, saturation 1.5, specular multiplier 1, elasticity 0.5, attraction radius 20 and drag deformation on. Saved preferences change only through their normal commits/reset action.

## Verification

[Appearance tests](../../../../tests/features/appearance) contain independent numerical references, cache/dependency checks and pointer lifecycle behavior. Test native range dragging/keys, held switches, menus/focus, reduced motion, resize, editor return, preview/reset and native color cancellation on the matching host. See [platform support](../../../../docs/platform-compatibility.md) and [capture provenance](../../../../docs/assets/screenshots/README.md).
