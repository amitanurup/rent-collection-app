const fs = require('fs');
let code = fs.readFileSync('assets/js/rent-collection.js', 'utf8');

// 1. Remove elements
code = code.replace(/downloadDataBtn: document\.getElementById\("downloadDataBtn"\),\r?\n/g, '');
code = code.replace(/profileGithubToken: document\.getElementById\("profileGithubToken"\),\r?\n/g, '');
code = code.replace(/profileGithubGistId: document\.getElementById\("profileGithubGistId"\),\r?\n/g, '');

// 2. Remove event listener
code = code.replace(/if\s*\(elements\.downloadDataBtn\)\s*\{\s*elements\.downloadDataBtn\.addEventListener\("click",\s*forceManualSync\);\s*\}\r?\n/g, '');

// 3. Remove autoSync call in init()
code = code.replace(/setInterval\(autoSync,\s*15000\);\r?\n/g, '');
code = code.replace(/if\s*\(window\.location\.hostname\s*!==\s*"localhost"\s*&&\s*window\.location\.hostname\s*!==\s*"127\.0\.0\.1"\)\s*\{\s*autoSync\(\);\s*\}\r?\n/g, '');
code = code.replace(/autoSync\(\);\r?\n/g, '');

// 4. Remove autoSync function and variables
code = code.replace(/let\s+isAutoSyncing\s*=\s*false;\r?\n/g, '');
code = code.replace(/async\s+function\s+autoSync\(\)\s*\{[\s\S]*?\n\}\r?\n/g, '');
code = code.replace(/async\s+function\s+forceManualSync\(event\)\s*\{[\s\S]*?\n\}\r?\n/g, '');
code = code.replace(/async\s+function\s+getGithubSyncConfig\(\)\s*\{[\s\S]*?\n\}\r?\n/g, '');

// 5. Remove githubToken/GistId from createDefaultState, normalizeState, populateProfileForm
code = code.replace(/githubToken:\s*"",\r?\n/g, '');
code = code.replace(/githubGistId:\s*""\r?\n/g, '');
code = code.replace(/githubToken:\s*cleanString\(profile\.githubToken\),\r?\n/g, '');
code = code.replace(/githubGistId:\s*cleanString\(profile\.githubGistId\)\r?\n/g, '');
code = code.replace(/if\s*\(elements\.profileGithubToken\)\s*\{\s*elements\.profileGithubToken\.value\s*=\s*state\.profile\.githubToken\s*\|\|\s*"";\s*\}\r?\n/g, '');
code = code.replace(/if\s*\(elements\.profileGithubGistId\)\s*\{\s*elements\.profileGithubGistId\.value\s*=\s*state\.profile\.githubGistId\s*\|\|\s*"e6074ee14fc1506ed012f42f894a16d7";\s*\}\r?\n/g, '');

// 6. Clean up handleProfileSave
code = code.replace(/const\s+tokenChanged\s*=\s*state\.profile\.githubToken\s*!==\s*elements\.profileGithubToken\.value;\r?\n/g, '');
code = code.replace(/const\s+gistChanged\s*=\s*state\.profile\.githubGistId\s*!==\s*elements\.profileGithubGistId\.value;\r?\n/g, '');
code = code.replace(/state\.profile\.githubToken\s*=\s*cleanString\(elements\.profileGithubToken\.value\);\r?\n/g, '');
code = code.replace(/state\.profile\.githubGistId\s*=\s*cleanString\(elements\.profileGithubGistId\.value\);\r?\n/g, '');
code = code.replace(/if\s*\(tokenChanged\s*\|\|\s*gistChanged\)\s*\{\s*showToast\("Sync\ssettings\supdated\."\);\s*\}\r?\n/g, '');

// 7. Simplify writeToDb (Remove Gist logic)
const writeToDbRegex = /async\s+function\s+writeToDb\(key,\s*value\)\s*\{[\s\S]*?async\s+function\s+deleteFromDb/g;
code = code.replace(writeToDbRegex, 'async function writeToDb(key, value) {\n  if (typeof value === "object" && value !== null) {\n    value._timestamp = Date.now();\n  }\n  await writeToLocalDb(key, value);\n}\n\nasync function deleteFromDb');

// 8. Simplify readFromDb (Remove Gist logic)
const readFromDbRegex = /async\s+function\s+readFromDb\(key\)\s*\{[\s\S]*?async\s+function\s+writeToDb/g;
code = code.replace(readFromDbRegex, 'async function readFromDb(key) {\n  try {\n    const db = await getDb();\n    let localValue = await new Promise((resolve) => {\n      const transaction = db.transaction(DB_STORE, "readonly");\n      const request = transaction.objectStore(DB_STORE).get(key);\n      request.onsuccess = () => resolve(request.result);\n      request.onerror = () => resolve(null);\n    });\n    return localValue;\n  } catch (error) {\n    console.error(error);\n    return null;\n  }\n}\n\nasync function writeToDb');


fs.writeFileSync('assets/js/rent-collection.js', code);
console.log('GitHub sync logic removed from JS');
