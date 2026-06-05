document.addEventListener('DOMContentLoaded', () => {
  const submitSection = document.getElementById('submitSection');
  const statusSection = document.getElementById('statusSection');
  const intakeForm = document.getElementById('intakeForm');
  const statusForm = document.getElementById('statusForm');
  const submitBtn = document.getElementById('submitBtn');
  const checkStatusBtn = document.getElementById('checkStatusBtn');
  const showStatusBtn = document.getElementById('showStatusBtn');
  const backToApplyBtn = document.getElementById('backToApplyBtn');
  const statusResult = document.getElementById('statusResult');
  const statusName = document.getElementById('statusName');
  const statusBadge = document.getElementById('statusBadge');
  const toastEl = document.getElementById('toast');

  let syncTimeout;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => toastEl.classList.remove('show'), 3000);
  }

  // The rent-sync.php URL should be constructed relative to this page
  // Assuming the structure: https://website.com/tenant-intake.html and https://website.com/rent-sync.php
  const getSyncUrl = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('api')) {
      return params.get('api');
    }
    return new URL('rent-sync.php', window.location.href).href;
  };

  showStatusBtn.addEventListener('click', () => {
    submitSection.classList.add('hidden');
    statusSection.classList.remove('hidden');
    statusResult.classList.add('hidden');
  });

  backToApplyBtn.addEventListener('click', () => {
    statusSection.classList.add('hidden');
    submitSection.classList.remove('hidden');
  });

  intakeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const payload = {
      name: document.getElementById('fullName').value.trim(),
      mobile: document.getElementById('mobileNumber').value.trim(),
      totalMembers: document.getElementById('totalMembers').value.trim() || 1,
      aadhaarNumber: document.getElementById('aadhaarNumber').value.trim(),
      startDate: document.getElementById('startDate').value.trim(),
      address: document.getElementById('address').value.trim()
    };

    try {
      const response = await fetch(`${getSyncUrl()}?action=submit_intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error("Non-JSON Server Response: " + text.substring(0, 30));
      }

      if (data.success) {
        showToast('Application submitted successfully!');
        intakeForm.reset();
        setTimeout(() => showStatusBtn.click(), 1500);
      } else {
        showToast(data.error || 'Failed to submit application.');
      }
    } catch (err) {
      showToast('Error: ' + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }
  });

  statusForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    checkStatusBtn.disabled = true;
    checkStatusBtn.textContent = 'Checking...';
    statusResult.classList.add('hidden');

    const mobile = document.getElementById('statusMobile').value.trim();

    try {
      const response = await fetch(`${getSyncUrl()}?action=check_intake&mobile=${encodeURIComponent(mobile)}`);
      const data = await response.json();
      
      if (data.found) {
        statusName.textContent = `Hello, ${data.name}`;
        statusBadge.textContent = data.status.toUpperCase();
        
        statusBadge.className = 'status-badge';
        const assignedDataEl = document.getElementById('assignedDataResult');
        assignedDataEl.classList.add('hidden');
        
        if (data.status === 'pending') {
          statusBadge.classList.add('status-pending');
        } else if (data.status === 'approved') {
          statusBadge.classList.add('status-approved');
          if (data.assignedData) {
            document.getElementById('assignedRent').textContent = data.assignedData.rent ? `Rs. ${data.assignedData.rent}` : "-";
            document.getElementById('assignedElec').textContent = data.assignedData.electricity ? `Rs. ${data.assignedData.electricity}` : "-";
            document.getElementById('assignedWater').textContent = data.assignedData.water ? `Rs. ${data.assignedData.water}` : "-";
            document.getElementById('assignedAdvance').textContent = data.assignedData.advance ? `Rs. ${data.assignedData.advance}` : "-";
            
            const upiIdStr = data.assignedData.upiId || "";
            const totalAmount = (parseFloat(data.assignedData.rent || 0) + parseFloat(data.assignedData.advance || 0)).toFixed(2);
            if (totalAmount > 0) {
              const upiLink = `upi://pay?pa=${encodeURIComponent(upiIdStr)}&pn=House%20Rent&am=${totalAmount}&cu=INR&tn=Rent%20Advance`;
              document.getElementById('upiPayLink').href = upiLink;
              
              if (!upiIdStr) {
                document.getElementById('upiPayLink').onclick = (e) => {
                  e.preventDefault();
                  alert("Owner ne abhi tak apna UPI ID set nahi kiya hai.");
                };
              }
              
              document.getElementById('upiPaymentSection').classList.remove('hidden');
            } else {
              document.getElementById('upiPaymentSection').classList.add('hidden');
            }
            
            document.getElementById('downloadChargesBtn').onclick = () => {
              const receiptWindow = window.open('', '_blank');
              receiptWindow.document.write(`
                <html>
                <head>
                  <title>Charges Receipt</title>
                  <style>
                    body { font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333; }
                    .receipt-box { border: 1px solid #ccc; padding: 20px; max-width: 400px; margin: 0 auto; border-radius: 8px; }
                    h2 { text-align: center; margin-top: 0; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px dashed #eee; padding-bottom: 4px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 0.9em; color: #777; }
                  </style>
                </head>
                <body>
                  <div class="receipt-box">
                    <h2>Rent Charges Receipt</h2>
                    <div class="row"><span>Name:</span> <strong>${data.name}</strong></div>
                    <div class="row"><span>Mobile:</span> <strong>${data.mobile}</strong></div>
                    <div class="row"><span>Date:</span> <strong>${new Date().toLocaleDateString()}</strong></div>
                    <h3 style="margin-top: 20px;">Assigned Charges</h3>
                    <div class="row"><span>Monthly Rent:</span> <strong>Rs. ${data.assignedData.rent || "-"}</strong></div>
                    <div class="row"><span>Electricity (per unit):</span> <strong>Rs. ${data.assignedData.electricity || "-"}</strong></div>
                    <div class="row"><span>Water Bill:</span> <strong>Rs. ${data.assignedData.water || "-"}</strong></div>
                    <div class="row"><span>Advance Rent:</span> <strong>Rs. ${data.assignedData.advance || "-"}</strong></div>
                    <div class="row" style="margin-top: 10px; font-weight: bold; border-top: 1px solid #333; padding-top: 8px;">
                      <span>Total Initial Payment:</span> 
                      <span>Rs. ${totalAmount > 0 ? totalAmount : "-"}</span>
                    </div>
                    <div class="footer">Thank you. Keep this for your records.</div>
                  </div>
                  <script>
                    window.onload = function() { window.print(); }
                  </script>
                </body>
                </html>
              `);
              receiptWindow.document.close();
            };

            assignedDataEl.classList.remove('hidden');
          }
        } else if (data.status === 'rejected') {
          statusBadge.classList.add('status-rejected');
        }
        
        statusResult.classList.remove('hidden');
      } else {
        showToast('No application found for this mobile number.');
      }
    } catch (err) {
      showToast('Network error. Please try again.');
    } finally {
      checkStatusBtn.disabled = false;
      checkStatusBtn.textContent = 'Check Status';
    }
  });
});
