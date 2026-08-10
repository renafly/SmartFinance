// Metro asset imports have no ambient type by default for extensions this
// project doesn't already use elsewhere. `.ttf` is needed to load the
// Ionicons font file directly (see features/categories/ionicons-font.ts),
// so it's typed loosely here — Metro resolves it to a fetchable URL string
// on web and to an opaque native asset module id (number) on native.
declare module "*.ttf" {
  const value: string | number;
  export default value;
}
