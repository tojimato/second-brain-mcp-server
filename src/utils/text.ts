/**
 * Splits text into chunks of specified size with an optional overlap.
 */
export function chunkText(text: string, size: number = 1500, overlap: number = 200): string[] {
    if (text.length <= size) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        let end = start + size;
        if (end < text.length) {
            const lastSpace = text.lastIndexOf(' ', end);
            const lastNewline = text.lastIndexOf('\n', end);
            const breakpoint = Math.max(lastSpace, lastNewline);
            if (breakpoint > start + (size / 2)) {
                end = breakpoint;
            }
        } else {
            end = text.length;
        }
        chunks.push(text.slice(start, end).trim());
        start = end - overlap;
        if (start < 0) start = 0;
        if (end >= text.length) break;
    }
    return chunks;
}

/**
 * Extracts links in the format [[concept]] from text.
 */
export function extractLinks(text: string): string[] {
    const regex = /\[\[(.*?)\]\]/g;
    const links = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
        links.add(match[1].trim());
    }
    return Array.from(links);
}
