(function () {
  var body = document.body;
  if (!body) return;
  if (!body.classList.contains("app-simple_cms") || !body.classList.contains("model-article")) return;

  var form = document.querySelector("#article_form, form");
  var titleEl = document.getElementById("id_title");
  if (!form || !titleEl) return;

  var storageKey = "article-draft:" + window.location.pathname;
  var fields = [
    "id_title",
    "id_slug",
    "id_status",
    "id_category",
    "id_meta_description",
    "id_publish_date_0",
    "id_publish_date_1"
  ];

  function getBodyValue() {
    if (window.CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.id_body) {
      return CKEDITOR.instances.id_body.getData();
    }
    var bodyEl = document.getElementById("id_body");
    return bodyEl ? bodyEl.value : "";
  }

  function setBodyValue(value) {
    if (window.CKEDITOR && CKEDITOR.instances && CKEDITOR.instances.id_body) {
      CKEDITOR.instances.id_body.setData(value || "");
      return;
    }
    var bodyEl = document.getElementById("id_body");
    if (bodyEl) bodyEl.value = value || "";
  }

  function collectState() {
    var data = { savedAt: new Date().toISOString(), body: getBodyValue() };
    fields.forEach(function (fieldId) {
      var el = document.getElementById(fieldId);
      if (el) data[fieldId] = el.value;
    });
    return data;
  }

  function restoreState(data) {
    fields.forEach(function (fieldId) {
      var el = document.getElementById(fieldId);
      if (el && Object.prototype.hasOwnProperty.call(data, fieldId)) {
        el.value = data[fieldId] || "";
      }
    });
    setBodyValue(data.body || "");
  }

  function hasMeaningfulDraft(data) {
    if (!data) return false;
    if (data.id_title && data.id_title.trim()) return true;
    if (data.body && data.body.replace(/<[^>]+>/g, "").trim()) return true;
    return false;
  }

  try {
    var raw = localStorage.getItem(storageKey);
    if (raw) {
      var saved = JSON.parse(raw);
      var pageIsEmpty = !titleEl.value && !getBodyValue();
      if (pageIsEmpty && hasMeaningfulDraft(saved)) {
        restoreState(saved);
      }
    }
  } catch (e) {
    // Ignore malformed localStorage payloads.
  }

  var timer = window.setInterval(function () {
    try {
      localStorage.setItem(storageKey, JSON.stringify(collectState()));
    } catch (e) {
      // Ignore quota and privacy errors.
    }
  }, 15000);

  form.addEventListener("submit", function () {
    window.clearInterval(timer);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      // Ignore storage errors.
    }
  });
})();
