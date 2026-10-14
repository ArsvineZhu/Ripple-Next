# Design principles

Ripple Next is a compact desktop companion. Its interface should feel immediate and calm while leaving the user's desktop in control.

## Core concepts

### User context and agency

Design for what the user is doing, already knows, and has chosen. Carry intent forward across navigation and edits, and make the scope and consequence of each action clear. Reuse context already established by the page instead of repeating it in every label. For example, an action beside an API key field can simply say “Change”, not “Change API Key”.

### Clarity and hierarchy

Make important content, current state, and the next useful action easy to find. Use position, spacing, typography, and contrast to express priority. For example, give the primary action the clearest emphasis and keep destructive actions distinct but visually restrained.

### Feedback and recovery

Give every meaningful action an understandable result. Keep feedback close to its source, explain what needs attention, and preserve the user's work when something fails. For example, show an invalid URL message below its field so the user can correct it in place.

### Consistency and coherence

Give controls the same meaning and behavior throughout the app. Shared tokens and components provide a stable foundation; adapt their presentation to the task. For example, menus can contain different options while keeping selection and focus behavior consistent.

### Accessibility and predictability

Make the interface usable through pointer, keyboard, and assistive technology. Provide clear accessible names, visible focus, adequate hit areas, readable contrast, and familiar keyboard behavior. For example, a searchable option list should support text entry, arrow keys, Enter, and Escape.

### Restraint and purposeful motion

Give visual emphasis and animation a clear job: guide attention, show a relationship, or explain a state change. Keep effects quiet enough for content to remain legible. For example, an expand or collapse transition should clarify the Island's size change without delaying input or hiding a layout jump.

## Visual system

Apple HIG informs Ripple Next's interaction, feedback, and accessibility decisions. Vercel and v0 inform a token-based, component-led design workflow. Ripple's visual language is compact and dark, with subtle surfaces, clear contrast, and deliberate motion.

Define color, spacing, typography, radii, focus, and motion through shared tokens. Keep related controls aligned, allow translated text to wrap, and review layouts at the Island's supported sizes. Consistency should help users recognize meaning while preserving differences that make each task clear.

## Applying the principles

For each change, identify the user's task, current state, and next feedback. Apply the concepts together: context shapes wording, hierarchy guides attention, feedback confirms results, and accessibility keeps the interaction available to more users. Review the result in all four interface languages.

## References

- [Apple Human Interface Guidelines: Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)
- [Apple Human Interface Guidelines: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons)
- [Apple Human Interface Guidelines: Focus and selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection/)
- [Apple Human Interface Guidelines: Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data)
- [Apple Human Interface Guidelines: Menus](https://developer.apple.com/design/human-interface-guidelines/menus)
- [Vercel v0: Design systems](https://v0.dev/docs/design-systems)
- [Vercel: AI-powered prototyping with design systems](https://vercel.com/blog/ai-powered-prototyping-with-design-systems)

## Reading and learning

Use 16px body copy with 1.5–1.6 line height and a 60–75 character measure for guides. Keep UI labels at 14px, captions at least 12px, and headings in descending sizes. Balance short headings, wrap descriptions naturally, and use tabular numbers for changing values. Guide prose stays selectable. Font choices use the same specimen so their differences are visible.

Teach workflows with actual recorded application actions, user-controlled playback and camera motion that guides attention. Keep keyboard guidance first. Playful Chinese is an optional expression under explicit Simplified Chinese; preserve clear destructive actions, technical identifiers and regional formatting.
