
window.viewAadhaarDocument = function(event, tenantId) {
  event.stopPropagation();
  const tenant = state.tenants.find(t => t.id === tenantId);
  if (!tenant || !tenant.aadhaarDocument || !tenant.aadhaarDocument.data) {
    showToast("Aadhaar document not found.");
    return;
  }
  
  const newWin = window.open();
  if (newWin) {
    newWin.document.write('<html><head><title>Aadhaar - ' + escapeHtml(tenant.fullName) + '</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;background:#000;height:100vh;">');
    if (tenant.aadhaarDocument.type.startsWith('image/')) {
       newWin.document.write('<img src="' + tenant.aadhaarDocument.data + '" style="max-width:100%;max-height:100vh;" />');
    } else if (tenant.aadhaarDocument.type === 'application/pdf') {
       newWin.document.write('<iframe src="' + tenant.aadhaarDocument.data + '" width="100%" height="100%" style="border: none;"></iframe>');
    } else {
       newWin.document.write('<a href="' + tenant.aadhaarDocument.data + '" style="color:white;font-size:24px;">Download Document</a>');
    }
    newWin.document.write('</body></html>');
    newWin.document.close();
  } else {
    showToast("Popup blocked! Please allow popups.");
  }
};
