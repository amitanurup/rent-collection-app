const fs = require('fs');
let code = fs.readFileSync('assets/js/rent-collection.js', 'utf8');

const toRemove = [
  'renderTenantRequestDraftNote();',
  'renderTenantRequestList();',
  'await completePendingTenantRequestAfterSave();',
  'clearPendingTenantRequestDraft();',
  'if (elements.tenantRequestList) {',
  'elements.tenantRequestList.addEventListener("click", handleTenantRequestListClick);',
  '}',
  'if (elements.refreshTenantRequestsBtn) {',
  'elements.refreshTenantRequestsBtn.addEventListener("click", () => {',
  'refreshTenantRequests({ manual: true });',
  '});'
];

// We will use regex to remove these safely
code = code.replace(/^\s*renderTenantRequestDraftNote\(\);\s*$/gm, '');
code = code.replace(/^\s*renderTenantRequestList\(\);\s*$/gm, '');
code = code.replace(/^\s*await completePendingTenantRequestAfterSave\(\);\s*$/gm, '');
code = code.replace(/^\s*clearPendingTenantRequestDraft\(\);\s*$/gm, '');

// Multiline removes
code = code.replace(/if\s*\(elements\.tenantRequestList\)\s*\{\s*elements\.tenantRequestList\.addEventListener\("click",\s*handleTenantRequestListClick\);\s*\}/gm, '');
code = code.replace(/if\s*\(elements\.refreshTenantRequestsBtn\)\s*\{\s*elements\.refreshTenantRequestsBtn\.addEventListener\("click",\s*\(\)\s*=>\s*\{\s*refreshTenantRequests\(\{ manual: true \}\);\s*\}\);\s*\}/gm, '');
code = code.replace(/tenantRequestsNote: document\.getElementById\("tenantRequestsNote"\),/g, '');

fs.writeFileSync('assets/js/rent-collection.js', code);
console.log('Done deep clean');
