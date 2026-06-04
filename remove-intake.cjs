const fs = require('fs');
let code = fs.readFileSync('assets/js/rent-collection.js', 'utf8');

// List of functions to remove entirely
const functionsToRemove = [
  'renderTenantIntakePanel',
  'renderTenantRequestList',
  'renderTenantRequestDraftNote',
  'refreshTenantRequests',
  'handleTenantRequestListClick',
  'acceptTenantRequestToForm',
  'dismissTenantRequest',
  'removeTenantRequestFromInbox',
  'completePendingTenantRequestAfterSave',
  'clearPendingTenantRequestDraft',
  'syncPublicProfile',
  'copyTenantIntakeLink',
  'openTenantIntakeLink',
  'buildTenantIntakePayload',
  'buildTenantIntakeLink',
  'buildTenantIntakeShareMessage',
  'requestTenantService',
  'normalizeTenantRequest'
];

for (const fn of functionsToRemove) {
  const regex = new RegExp('(?:async )?function ' + fn + '\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}', 'g');
  code = code.replace(regex, '');
}

// Remove references to those functions or related variables
code = code.replace(/\\bawait syncPublicProfile\\(\\{ silent: true \\}\\);/g, '');
code = code.replace(/const syncSucceeded = await syncPublicProfile\\(\\{ silent: true \\}\\);/g, '');
code = code.replace(/ui\\.tenantRequests.*?;/g, '');
code = code.replace(/ui\\.pendingTenantRequest.*?;/g, '');
code = code.replace(/tenantIntakeNote:.*?,/g, '');
code = code.replace(/copyTenantIntakeLinkBtn:.*?,/g, '');
code = code.replace(/openTenantIntakeLinkBtn:.*?,/g, '');
code = code.replace(/refreshTenantRequestsBtn:.*?,/g, '');
code = code.replace(/tenantRequestList:.*?,/g, '');
code = code.replace(/tenantRequestDraftNote:.*?,/g, '');
code = code.replace(/if \\(elements\\.copyTenantIntakeLinkBtn\\) \\{[\\s\\S]*?\\}/g, '');
code = code.replace(/if \\(elements\\.openTenantIntakeLinkBtn\\) \\{[\\s\\S]*?\\}/g, '');
code = code.replace(/if \\(elements\\.refreshTenantRequestsBtn\\) \\{[\\s\\S]*?\\}/g, '');
code = code.replace(/if \\(elements\\.tenantRequestList\\) \\{[\\s\\S]*?\\}/g, '');
code = code.replace(/renderTenantIntakePanel\\(\\);/g, '');
code = code.replace(/renderTenantRequestList\\(\\);/g, '');
code = code.replace(/await refreshTenantRequests\\(\\{ manual: false \\}\\);/g, '');
code = code.replace(/clearPendingTenantRequestDraft\\(\\);/g, '');
code = code.replace(/await completePendingTenantRequestAfterSave\\(\\);/g, '');
code = code.replace(/const REQUESTS_FUNCTION_PATH = ".*?";/, '');

fs.writeFileSync('assets/js/rent-collection.js', code);
console.log('Done cleaning JS.');
