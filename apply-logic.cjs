const fs = require('fs');
let code = fs.readFileSync('assets/js/rent-collection.js', 'utf8');
const newLogic = fs.readFileSync('new_logic.txt', 'utf8');

const regex = /async function readFromDb\(key\) \{[\s\S]*?async function deleteFromDb/g;
code = code.replace(regex, newLogic + '\nasync function deleteFromDb');

fs.writeFileSync('assets/js/rent-collection.js', code);
console.log('Applied db logic node script!');
