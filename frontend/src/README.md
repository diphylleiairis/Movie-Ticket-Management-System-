# Frontend source

The frontend is organized by application concerns and business features. Feature folders should not access backend repositories directly; use the versioned REST API through `src/api/`.

Use Tailwind CSS utilities in component `className` attributes for styling, including responsive layouts and interaction states. Keep complete class names in source so Tailwind can detect them; use conditional complete strings or variants for dynamic states. Existing semantic classes provide state and TestCafe selector hooks.

`index.css` loads Tailwind's theme and utilities through the Vite plugin, plus global defaults and animation keyframes. Preflight is intentionally omitted to preserve browser defaults used by the current interface. Keep page and component styles in TSX instead of adding standalone CSS files.
