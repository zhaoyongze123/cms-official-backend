(() => {
  const schedule = document.getElementById("id_schedule");
  const timeInput = document.getElementById("id_daily_send_at");
  if (!schedule || !timeInput) return;

  const fieldRow = timeInput.closest(".form-group") || timeInput.closest(".row");
  const syncVisibility = () => {
    const isDaily = schedule.value === "daily";
    if (fieldRow) fieldRow.hidden = !isDaily;
    timeInput.disabled = !isDaily;
  };

  schedule.addEventListener("change", syncVisibility);
  syncVisibility();
})();
