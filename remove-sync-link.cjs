const fs = require('fs');
let code = fs.readFileSync('assets/js/rent-collection.js', 'utf8');

// Remove functions
code = code.replace(/(?:async )?function checkSyncHash\([\s\S]*?\n\}\r?\n/g, '');
code = code.replace(/(?:async )?function handleCopySyncLink\([\s\S]*?\n\}\r?\n/g, '');

// Remove references
code = code.replace(/^\s*checkSyncHash\(\);\s*$/gm, '');
code = code.replace(/^\s*copySyncLinkBtn:\s*document\.getElementById\("copySyncLinkBtn"\),\s*$/gm, '');
code = code.replace(/if\s*\(elements\.copySyncLinkBtn\)\s*\{\s*elements\.copySyncLinkBtn\.addEventListener\("click",\s*handleCopySyncLink\);\s*\}/gm, '');

fs.writeFileSync('assets/js/rent-collection.js', code);
console.log('Removed sync link logic');
