// TypeScript 6 tightened TS2882: side-effect imports now require a
// matching module declaration. Next.js + Webpack / Turbopack handle
// CSS imports natively at runtime — there's no module to type-check,
// just bytes flowing into the build's CSS chunk. This declaration
// keeps the type-checker quiet without changing any runtime behavior.
//
// Covers both:
//   - bare side-effect imports from @fontsource/* packages
//   - relative imports of co-located stylesheets (./globals.css etc.)
declare module '*.css'
