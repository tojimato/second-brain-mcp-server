/**
 * Detects the format of a file based on its extension.
 */
export function detectFormat(filePath: string): 'markdown' | 'html' | 'code' | 'text' {
    const ext = filePath.includes('.') ? filePath.substring(filePath.lastIndexOf('.')).toLowerCase() : '';
    const basename = filePath.split(/[\\/]/).pop()?.toLowerCase() || '';

    const markdownExtensions = ['.md', '.markdown', '.mdown', '.mkdn'];
    const htmlExtensions = ['.html', '.htm', '.xhtml'];
    const codeExtensions = [
        '.cs', '.php', '.js', '.ts', '.py', '.java', '.cpp', '.c', '.go',
        '.rb', '.rs', '.swift', '.kt', '.sql', '.sh', '.json', '.yaml', '.yml',
        '.css', '.scss', '.less', '.jsx', '.tsx', '.vue', '.svelte', '.astro',
        '.h', '.hpp', '.hxx', '.gradle', '.kts', '.toml', '.ini', '.env',
        '.xml', '.xsd', '.proto', '.dart', '.lua', '.pl', '.scala', '.hs',
        '.erl', '.ex', '.exs', '.r', '.razor', '.blazor', '.m', '.mm',
        '.plist', '.properties', '.pro', '.entitlements', '.strings',
        '.cshtml', '.vbhtml', '.aspx', '.ascx', '.master'
    ];

    const codeFiles = [
        'dockerfile', 'makefile', 'vagrantfile', 'rakefile', 'procfile',
        'gemfile', 'package.json', 'podfile', 'podfile.lock', 'appfile',
        'fastfile', 'gymfile', 'matchfile'
    ];

    if (markdownExtensions.includes(ext)) return 'markdown';
    if (htmlExtensions.includes(ext)) return 'html';
    if (codeExtensions.includes(ext) || codeFiles.includes(basename)) return 'code';
    return 'text';
}

/**
 * Strips non-semantic boilerplate from HTML while keeping structural tags.
 */
export function cleanHtml(html: string): string {
    // Remove tags that usually don't contain main content
    const tagsToRemove = ['script', 'style', 'head', 'nav', 'footer', 'iframe', 'header', 'aside'];
    let cleaned = html;

    for (const tag of tagsToRemove) {
        const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
        cleaned = cleaned.replace(regex, '');
    }

    // Remove comments
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    // Remove multiple newlines
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n').trim();

    return cleaned;
}

/**
 * Recursively splits text into chunks using a hierarchy of delimiters.
 */
export function chunkTextRecursive(
    text: string,
    size: number = 1500,
    overlap: number = 200,
    format: 'markdown' | 'html' | 'code' | 'text' = 'text'
): string[] {
    const delimiters = getDelimiters(format);
    return splitRecursive(text, delimiters, size, overlap);
}

function getDelimiters(format: 'markdown' | 'html' | 'code' | 'text'): string[] {
    switch (format) {
        case 'markdown':
            return ["\n# ", "\n## ", "\n### ", "\n#### ", "\n\n", "\n", ". ", " ", ""];
        case 'html':
            return ["<h1", "<h2", "<h3", "<h4", "<p", "<div", "<li", "\n\n", "\n", ". ", " ", ""];
        case 'code':
            return [
                "\nclass ", "\ninterface ", "\nnamespace ", "\nstruct ", "\nenum ",
                "\nfunction ", "\ndef ", "\nfn ", "\npublic ", "\nprivate ", "\nprotected ", "\nstatic ",
                "\n\n", "\n", " ", ""
            ];
        default:
            return ["\n\n", "\n", ". ", " ", ""];
    }
}

function splitRecursive(text: string, delimiters: string[], maxSize: number, overlap: number): string[] {
    const finalChunks: string[] = [];

    // Start with the full text as one "candidate"
    let candidates = [text];

    for (const delimiter of delimiters) {
        const newCandidates: string[] = [];
        let anySplit = false;

        for (const candidate of candidates) {
            if (candidate.length <= maxSize) {
                newCandidates.push(candidate);
                continue;
            }

            const splitParts = splitWithDelimiter(candidate, delimiter);
            if (splitParts.length > 1) {
                newCandidates.push(...splitParts);
                anySplit = true;
            } else {
                newCandidates.push(candidate);
            }
        }

        candidates = newCandidates;
        // If we've reached the point where everything fits, or we are at the last delimiter
        if (candidates.every(c => c.length <= maxSize)) break;
    }

    // Merge candidates into actual chunks with overlap
    let currentChunk = "";
    for (const candidate of candidates) {
        if (candidate.length > maxSize) {
            // Hard split if it's still too big (shouldn't happen with "" delimiter at end)
            let start = 0;
            while (start < candidate.length) {
                finalChunks.push(candidate.slice(start, start + maxSize));
                start += maxSize - overlap;
            }
            continue;
        }

        if ((currentChunk + candidate).length <= maxSize) {
            currentChunk += (currentChunk ? " " : "") + candidate;
        } else {
            if (currentChunk) finalChunks.push(currentChunk.trim());

            // Start next chunk. We should ideally take the end of the previous chunk for overlap,
            // but for simplicity in recursive splitting, we'll just start fresh or take a piece.
            // A more complex implementation would handle semantic overlap better.
            currentChunk = candidate;
        }
    }

    if (currentChunk) finalChunks.push(currentChunk.trim());
    return finalChunks;
}

function splitWithDelimiter(text: string, delimiter: string): string[] {
    if (!delimiter) return text.split('');

    // Split the text while keeping the delimiter
    // We want to keep the delimiter at the START of the new part if it's a structural one (like # or class)
    // and at the END if it's a closing one or punctuation.

    const parts = text.split(delimiter);
    if (parts.length === 1) return parts;

    const result: string[] = [];
    const isStructural = delimiter.startsWith('\n') || delimiter.startsWith('<') || ["class ", "function ", "def ", "fn "].some(k => delimiter.includes(k));

    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if (!part && i === 0) continue; // Skip first empty if split starts with delimiter

        if (i > 0 && isStructural) {
            // Prepend delimiter to the current part
            part = delimiter + part;
        } else if (i < parts.length - 1 && !isStructural) {
            // Append delimiter to the current part (for . , \n etc)
            part = part + delimiter;
        }

        if (part) result.push(part);
    }
    return result;
}

/**
 * Splits text into chunks of specified size with an optional overlap.
 * @deprecated Use chunkTextRecursive for better RAG results.
 */
export function chunkText(text: string, size: number = 1500, overlap: number = 200): string[] {
    return chunkTextRecursive(text, size, overlap, 'text');
}

export const IGNORED_LINK_PLACEHOLDERS = [
    'concept-name',
    'links'
];

/**
 * Extracts links in the format [[concept]] from text.
 */
export function extractLinks(text: string): string[] {
    const regex = /\[\[(.*?)\]\]/g;
    const links = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
        const link = match[1].trim();
        if (!IGNORED_LINK_PLACEHOLDERS.includes(link)) {
            links.add(link);
        }
    }
    return Array.from(links);
}
