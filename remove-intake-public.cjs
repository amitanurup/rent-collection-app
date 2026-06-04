const fs = require('fs');
let code = fs.readFileSync('assets/js/tenant-public.js', 'utf8');

code = code.replace(/const REQUESTS_FUNCTION_PATH = ".*?";\r?\n/, '');
code = code.replace(/(?:async )?function requestTenantService\([\s\S]*?\n\}\r?\n/g, '');
code = code.replace(/async function getProfileConfig[\s\S]*?\n\}\r?\n/g, '');
code = code.replace(/async function handleIntakeFormSubmit[\s\S]*?\n\}\r?\n/g, '');
code = code.replace(/function updateAadhaarDocumentHint[\s\S]*?\n\}\r?\n/g, '');
code = code.replace(/async function handleAadhaarFileChange[\s\S]*?\n\}\r?\n/g, '');
code = code.replace(/async function initIntakeApp[\s\S]*?\n\}\r?\n/g, '');
code = code.replace(/if \(elements.intakeForm\) \{[\s\S]*?\n\}\r?\n/g, '');
code = code.replace(/const elements = \{[\s\S]*?\};\r?\n/g, (match) => {
  return match.replace(/intakeForm:.*?,\r?\n/g, '')
              .replace(/intakeName:.*?,\r?\n/g, '')
              .replace(/intakeMobile:.*?,\r?\n/g, '')
              .replace(/intakeMoveInDate:.*?,\r?\n/g, '')
              .replace(/intakeTotalMembers:.*?,\r?\n/g, '')
              .replace(/intakeIdNumber:.*?,\r?\n/g, '')
              .replace(/intakeAddress:.*?,\r?\n/g, '')
              .replace(/intakeNotes:.*?,\r?\n/g, '')
              .replace(/intakeAadhaarFile:.*?,\r?\n/g, '')
              .replace(/intakeAadhaarCapture:.*?,\r?\n/g, '')
              .replace(/intakeCaptureBtn:.*?,\r?\n/g, '')
              .replace(/intakeDocumentHint:.*?,\r?\n/g, '')
              .replace(/intakeTitle:.*?,\r?\n/g, '')
              .replace(/intakeIntroCopy:.*?,\r?\n/g, '')
              .replace(/intakeCard:.*?,\r?\n/g, '');
});

fs.writeFileSync('assets/js/tenant-public.js', code);
console.log('Cleaned tenant-public.js');
