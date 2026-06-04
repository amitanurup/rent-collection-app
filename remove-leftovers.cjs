const fs = require('fs');
let code = fs.readFileSync('assets/js/rent-collection.js', 'utf8');

// Use multiline regex to safely remove lines containing these exact calls
code = code.replace(/^\s*await syncPublicProfile\(\{ silent: true \}\);\s*$/gm, '');
code = code.replace(/^\s*await refreshTenantRequests\(\{ manual: false \}\);\s*$/gm, '');

fs.writeFileSync('assets/js/rent-collection.js', code);
console.log('Leftovers cleaned.');
