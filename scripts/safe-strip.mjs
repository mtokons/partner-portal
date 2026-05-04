import { readFileSync, writeFileSync } from 'fs';

const filePath = '/Users/mtokons/Desktop/CodeProject/partner-portal/src/lib/sharepoint.ts';
let content = readFileSync(filePath, 'utf-8');

// Pattern: if (useMock) { ... } ending with a closing brace on its own line
// This is typical for the blocks in sharepoint.ts
content = content.replace(/if\s*\(useMock\)\s*{[\s\S]*?\n\s+}/g, '');

// Also remove single line if (useMock) return ...;
content = content.replace(/if\s*\(useMock\)\s*return\s*[^;]+;/g, '');

writeFileSync(filePath, content);
console.log("Mock blocks stripped.");
