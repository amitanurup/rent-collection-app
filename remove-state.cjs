const fs = require('fs');
let code = fs.readFileSync('assets/js/rent-collection.js', 'utf8');

code = code.replace(/^\s*tenantRequests:\s*\[\],\s*$/gm, '');
code = code.replace(/^\s*tenantRequestsLoading:\s*false,\s*$/gm, '');
code = code.replace(/^\s*tenantRequestsError:\s*"",\s*$/gm, '');
code = code.replace(/^\s*pendingTenantRequestId:\s*"",\s*$/gm, '');
code = code.replace(/^\s*pendingTenantRequestName:\s*"",\s*$/gm, '');

fs.writeFileSync('assets/js/rent-collection.js', code);
console.log('State cleaned');
