const fs = require('fs');
const jsCode = fs.readFileSync('assets/js/rent-collection.js', 'utf8');

let tryCatchAdded = jsCode.replace('async function init() {', 'async function init() {\n  try {');
tryCatchAdded = tryCatchAdded.replace('maybeSendDueNotifications();\n\n  window.addEventListener(', 'maybeSendDueNotifications();\n}catch(e){\nconsole.error(\"INIT CRASHED AT:\", e);\nshowToast(\"INIT CRASHED\" + e.stack);\nthrow e;\n}\n\n  window.addEventListener(');

fs.writeFileSync('assets/js/rent-collection.js', tryCatchAdded);
