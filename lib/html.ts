// Cleans rich text before it is saved, so stored notes can never contain scripts.
import sanitizeHtml from "sanitize-html";

export function cleanHtml(dirty: string): string {
  return sanitizeHtml(dirty.slice(0, 200_000), {
    allowedTags: ["p", "div", "br", "b", "strong", "i", "em", "u", "h2", "h3", "ul", "ol", "li", "a", "blockquote"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

// Plain text for previews and search.
export function htmlToText(html: string): string {
  return sanitizeHtml(html.replace(/<(br|\/p|\/div|\/li|\/h\d)>/gi, " "), { allowedTags: [], allowedAttributes: {} })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
