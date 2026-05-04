import { readFileSync, writeFileSync } from 'fs';

const filePath = '/Users/mtokons/Desktop/CodeProject/partner-portal/src/lib/sharepoint.ts';
let content = readFileSync(filePath, 'utf-8');

// Remove single-line "if (useMock) return ...;"
content = content.replace(/if\s*\(useMock\)\s*return\s*[^;]+;/g, '');

// Remove multi-line "if (useMock) { ... }"
// This uses a non-greedy match that respects curly braces (mostly)
// Since the blocks are consistently formatted, we can target them.
content = content.replace(/if\s*\(useMock\)\s*{[\s\S]*?\n\s{2}}/g, '');

writeFileSync(filePath, content);
console.log("Mock code stripped.");
