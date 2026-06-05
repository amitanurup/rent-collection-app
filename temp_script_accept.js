
window.openAcceptIntakeModal = function() {
  return new Promise((resolve) => {
    const modal = document.getElementById("acceptIntakeModal");
    const rentInput = document.getElementById("acceptIntakeRent");
    const elecInput = document.getElementById("acceptIntakeElectricity");
    const waterInput = document.getElementById("acceptIntakeWater");
    rentInput.value = "";
    elecInput.value = "";
    waterInput.value = "";
    ui.acceptIntakeResolver = resolve;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => rentInput.focus());
  });
};

window.closeAcceptIntakeModal = function(val) {
  const modal = document.getElementById("acceptIntakeModal");
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  if (ui.acceptIntakeResolver) {
    ui.acceptIntakeResolver(val);
    ui.acceptIntakeResolver = null;
  }
};

window.submitAcceptIntakeModal = function() {
  const rent = document.getElementById("acceptIntakeRent").value;
  const elec = document.getElementById("acceptIntakeElectricity").value;
  const water = document.getElementById("acceptIntakeWater").value;
  if (!rent || !elec) {
    showToast("Please enter Rent and Electricity unit charge.");
    return;
  }
  closeAcceptIntakeModal({ rent, electricity: elec, water });
};
