/** "Colour: the plane is PQ, the LEDs are not" -> "colour-the-plane-is-pq-the-leds-are-not". Shared by heading ids and the search index. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
