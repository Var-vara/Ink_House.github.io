document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const { client, isConfigured, slugify, escapeHtml, showToast } = AuthorSite;
  const setupWarning = document.getElementById("setup-warning");
  const loginPanel = document.getElementById("login-panel");
  const dashboard = document.getElementById("admin-dashboard");
  let currentUser = null;
  let works = [];
  let chapters = [];
  let galleryItems = [];
  let chapterBlocks = [];

  const byId = id => document.getElementById(id);
  const setMessage = (id, text, kind = "") => {
    const node = byId(id);
    node.textContent = text;
    node.className = `form-message ${kind}`;
  };

  if (!isConfigured) {
    setupWarning.classList.remove("hidden");
    loginPanel.classList.add("hidden");
    return;
  }

  async function isAdmin(userId) {
    const { data, error } = await client.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
    if (error) throw error;
    return Boolean(data?.is_admin);
  }

  async function openDashboard(user) {
    if (!(await isAdmin(user.id))) {
      await client.auth.signOut();
      throw new Error("Этот аккаунт не получил права автора. Выполните файл make-admin.sql в Supabase.");
    }
    currentUser = user;
    byId("admin-user-email").textContent = user.email;
    loginPanel.classList.add("hidden");
    dashboard.classList.remove("hidden");
    await Promise.all([loadWorks(), loadGallery()]);
  }

  async function checkSession() {
    const { data } = await client.auth.getSession();
    if (data.session?.user) {
      try { await openDashboard(data.session.user); }
      catch (error) { setMessage("login-message", error.message, "error"); }
    }
  }

  byId("login-form").addEventListener("submit", async event => {
    event.preventDefault();
    setMessage("login-message", "Выполняется вход…");
    const { data, error } = await client.auth.signInWithPassword({ email: byId("login-email").value.trim(), password: byId("login-password").value });
    if (error) return setMessage("login-message", error.message, "error");
    try { await openDashboard(data.user); setMessage("login-message", ""); }
    catch (adminError) { setMessage("login-message", adminError.message, "error"); }
  });

  byId("logout-button").addEventListener("click", async () => {
    await client.auth.signOut();
    location.reload();
  });

  document.querySelector(".admin-tabs").addEventListener("click", event => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    document.querySelectorAll(".admin-tab").forEach(item => item.classList.toggle("active", item === button));
    document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.toggle("active", panel.id === `tab-${button.dataset.tab}`));
  });

  async function uploadImage(file, folder) {
    if (!file) return null;
    if (!file.type.startsWith("image/")) throw new Error("Выберите файл изображения.");
    if (file.size > 10 * 1024 * 1024) throw new Error("Файл слишком большой. Максимум 10 МБ.");
    const extension = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${currentUser.id}/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from("media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) throw error;
    return client.storage.from("media").getPublicUrl(path).data.publicUrl;
  }

  // ---------- ПРОИЗВЕДЕНИЯ ----------
  async function loadWorks() {
    const { data, error } = await client.from("works").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    works = data || [];
    renderWorksList();
    renderWorkSelect();
  }

  function renderWorksList() {
    const root = byId("admin-works-list");
    root.innerHTML = works.length ? works.map(work => `<button class="admin-list-item" type="button" data-work-id="${work.id}"><img src="${escapeHtml(work.cover_url || "images/cover-placeholder.svg")}" alt=""><span><strong>${escapeHtml(work.title)}</strong><small>${escapeHtml(work.genre || work.type)}</small></span><span class="status-badge ${work.status}">${work.status === "published" ? "Опубликовано" : "Черновик"}</span></button>`).join("") : '<p class="empty-state">Произведений пока нет.</p>';
  }

  function renderWorkSelect() {
    const select = byId("chapter-work-select");
    const previous = select.value;
    select.innerHTML = '<option value="">— выберите —</option>' + works.map(work => `<option value="${work.id}">${escapeHtml(work.title)}</option>`).join("");
    if (works.some(work => work.id === previous)) select.value = previous;
  }

  function resetWorkForm() {
    byId("work-form").reset();
    byId("work-id").value = "";
    byId("work-form-title").textContent = "Новое произведение";
    byId("current-cover").innerHTML = "";
    byId("delete-work-button").classList.add("hidden");
    setMessage("work-message", "");
  }

  function editWork(id) {
    const work = works.find(item => item.id === id);
    if (!work) return;
    byId("work-id").value = work.id;
    byId("work-title").value = work.title;
    byId("work-slug").value = work.slug;
    byId("work-type").value = work.type;
    byId("work-genre").value = work.genre || "";
    byId("work-description").value = work.description || "";
    byId("work-store-name").value = work.store_name || "";
byId("work-store-url").value = work.store_url || "";
    byId("work-status").value = work.status;
    byId("work-featured").checked = Boolean(work.featured);
    byId("current-cover").innerHTML = work.cover_url ? `<img src="${escapeHtml(work.cover_url)}" alt="Текущая обложка">` : "";
    byId("work-form-title").textContent = "Редактирование произведения";
    byId("delete-work-button").classList.remove("hidden");
    document.querySelectorAll("[data-work-id]").forEach(button => button.classList.toggle("active", button.dataset.workId === id));
  }

  byId("admin-works-list").addEventListener("click", event => {
    const button = event.target.closest("[data-work-id]");
    if (button) editWork(button.dataset.workId);
  });
  byId("new-work-button").addEventListener("click", resetWorkForm);
  byId("work-title").addEventListener("blur", () => { if (!byId("work-slug").value) byId("work-slug").value = slugify(byId("work-title").value); });

  byId("work-form").addEventListener("submit", async event => {
    event.preventDefault();
    setMessage("work-message", "Сохраняем…");
    try {
      const id = byId("work-id").value;
      const old = works.find(item => item.id === id);
      let coverUrl = old?.cover_url || null;
      const file = byId("work-cover").files[0];
      if (file) coverUrl = await uploadImage(file, "covers");
      const payload = {
        title: byId("work-title").value.trim(),
        slug: slugify(byId("work-slug").value || byId("work-title").value),
        type: byId("work-type").value,
        genre: byId("work-genre").value.trim() || null,
        description: byId("work-description").value.trim() || null,
        store_name:
  byId("work-store-name").value.trim() || null,

store_url:
  byId("work-store-url").value.trim() || null,
        cover_url: coverUrl,
        status: byId("work-status").value,
        featured: byId("work-featured").checked,
        updated_at: new Date().toISOString()
      };
      const query = id ? client.from("works").update(payload).eq("id", id) : client.from("works").insert(payload);
      const { error } = await query;
      if (error) throw error;
      await loadWorks();
      resetWorkForm();
      setMessage("work-message", "Сохранено.", "success");
      showToast("Произведение сохранено");
    } catch (error) { setMessage("work-message", error.message, "error"); }
  });

  byId("delete-work-button").addEventListener("click", async () => {
    const id = byId("work-id").value;
    if (!id || !confirm("Удалить произведение и все его главы? Это действие нельзя отменить.")) return;
    const { error } = await client.from("works").delete().eq("id", id);
    if (error) return setMessage("work-message", error.message, "error");
    await loadWorks(); resetWorkForm(); showToast("Произведение удалено");
  });

  // ---------- ГЛАВЫ И БЛОКИ ----------
  byId("chapter-work-select").addEventListener("change", async () => { resetChapterForm(); await loadChapters(); });

  async function loadChapters() {
    const workId = byId("chapter-work-select").value;
    if (!workId) { chapters = []; renderChaptersList(); return; }
    const { data, error } = await client.from("chapters").select("*").eq("work_id", workId).order("chapter_number");
    if (error) throw error;
    chapters = data || [];
    renderChaptersList();
  }

  function renderChaptersList() {
    const root = byId("chapters-list");
    if (!byId("chapter-work-select").value) { root.innerHTML = '<p class="empty-state">Сначала выберите произведение.</p>'; return; }
    root.innerHTML = chapters.length ? chapters.map(chapter => `<button class="admin-list-item" type="button" data-chapter-id="${chapter.id}"><span class="brand-mark">${chapter.chapter_number}</span><span><strong>${escapeHtml(chapter.title)}</strong><small>${(chapter.content_json || []).length} блоков</small></span><span class="status-badge ${chapter.is_published ? "published" : ""}">${chapter.is_published ? "Опубликовано" : "Черновик"}</span></button>`).join("") : '<p class="empty-state">Глав пока нет.</p>';
  }

  function resetChapterForm() {
    byId("chapter-form").reset();
    byId("chapter-id").value = "";
    byId("chapter-number").value = chapters.length + 1 || 1;
    byId("chapter-form-title").textContent = "Новая глава";
    byId("delete-chapter-button").classList.add("hidden");
    chapterBlocks = [];
    renderBlocksEditor();
    setMessage("chapter-message", "");
  }

  function editChapter(id) {
    const chapter = chapters.find(item => item.id === id);
    if (!chapter) return;
    byId("chapter-id").value = chapter.id;
    byId("chapter-title").value = chapter.title;
    byId("chapter-number").value = chapter.chapter_number;
    byId("chapter-published").checked = Boolean(chapter.is_published);
    byId("chapter-form-title").textContent = "Редактирование главы";
    byId("delete-chapter-button").classList.remove("hidden");
    chapterBlocks = JSON.parse(JSON.stringify(chapter.content_json || []));
    renderBlocksEditor();
  }

  function syncBlocksFromDom() {
    document.querySelectorAll("[data-block-index]").forEach(card => {
      const index = Number(card.dataset.blockIndex);
      const input = card.querySelector("[data-block-value]");
      const caption = card.querySelector("[data-block-caption]");
      if (input) chapterBlocks[index].text = input.value;
      if (caption) chapterBlocks[index].caption = caption.value;
    });
  }

  function renderBlocksEditor() {
    const root = byId("blocks-editor");
    if (!chapterBlocks.length) { root.innerHTML = '<p class="empty-state">Добавьте первый текстовый блок.</p>'; return; }
    const labels = { heading: "Заголовок", text: "Текст", quote: "Цитата", image: "Изображение" };
    root.innerHTML = chapterBlocks.map((block, index) => {
      const field = block.type === "image"
        ? `<img class="block-image-preview" src="${escapeHtml(block.url || "")}" alt=""><input data-block-caption value="${escapeHtml(block.caption || "")}" placeholder="Подпись под изображением">`
        : `<textarea data-block-value rows="${block.type === "text" ? 7 : 3}" placeholder="Введите ${labels[block.type].toLowerCase()}">${escapeHtml(block.text || "")}</textarea>`;
      return `<div class="block-editor-card" data-block-index="${index}"><div class="block-editor-top"><strong>${index + 1}. ${labels[block.type] || "Блок"}</strong><div class="block-editor-actions"><button type="button" data-block-action="up" title="Выше">↑</button><button type="button" data-block-action="down" title="Ниже">↓</button><button type="button" data-block-action="delete" title="Удалить">×</button></div></div>${field}</div>`;
    }).join("");
  }

  function addBlock(type, extras = {}) { syncBlocksFromDom(); chapterBlocks.push({ type, text: "", ...extras }); renderBlocksEditor(); }
  byId("add-heading-block").addEventListener("click", () => addBlock("heading"));
  byId("add-text-block").addEventListener("click", () => addBlock("text"));
  byId("add-quote-block").addEventListener("click", () => addBlock("quote"));
  byId("add-image-block").addEventListener("click", () => byId("chapter-image-input").click());
  byId("chapter-image-input").addEventListener("change", async () => {
    const file = byId("chapter-image-input").files[0];
    if (!file) return;
    try { showToast("Загружаем изображение…"); const url = await uploadImage(file, "chapters"); addBlock("image", { url, caption: "" }); showToast("Изображение добавлено"); }
    catch (error) { showToast(error.message, true); }
    byId("chapter-image-input").value = "";
  });

  byId("blocks-editor").addEventListener("click", event => {
    const action = event.target.closest("[data-block-action]");
    if (!action) return;
    syncBlocksFromDom();
    const card = action.closest("[data-block-index]");
    const index = Number(card.dataset.blockIndex);
    if (action.dataset.blockAction === "delete") chapterBlocks.splice(index, 1);
    if (action.dataset.blockAction === "up" && index > 0) [chapterBlocks[index - 1], chapterBlocks[index]] = [chapterBlocks[index], chapterBlocks[index - 1]];
    if (action.dataset.blockAction === "down" && index < chapterBlocks.length - 1) [chapterBlocks[index + 1], chapterBlocks[index]] = [chapterBlocks[index], chapterBlocks[index + 1]];
    renderBlocksEditor();
  });

  byId("chapters-list").addEventListener("click", event => { const button = event.target.closest("[data-chapter-id]"); if (button) editChapter(button.dataset.chapterId); });
  byId("new-chapter-button").addEventListener("click", () => {
    if (!byId("chapter-work-select").value) return showToast("Сначала выберите произведение", true);
    resetChapterForm();
  });

  byId("chapter-form").addEventListener("submit", async event => {
    event.preventDefault();
    const workId = byId("chapter-work-select").value;
    if (!workId) return setMessage("chapter-message", "Сначала выберите произведение.", "error");
    syncBlocksFromDom();
    setMessage("chapter-message", "Сохраняем…");
    const id = byId("chapter-id").value;
    const payload = { work_id: workId, title: byId("chapter-title").value.trim(), chapter_number: Number(byId("chapter-number").value), is_published: byId("chapter-published").checked, content_json: chapterBlocks, updated_at: new Date().toISOString() };
    const query = id ? client.from("chapters").update(payload).eq("id", id) : client.from("chapters").insert(payload);
    const { error } = await query;
    if (error) return setMessage("chapter-message", error.message, "error");
    await loadChapters(); resetChapterForm(); setMessage("chapter-message", "Глава сохранена.", "success"); showToast("Глава сохранена");
  });

  byId("delete-chapter-button").addEventListener("click", async () => {
    const id = byId("chapter-id").value;
    if (!id || !confirm("Удалить эту главу?")) return;
    const { error } = await client.from("chapters").delete().eq("id", id);
    if (error) return setMessage("chapter-message", error.message, "error");
    await loadChapters(); resetChapterForm(); showToast("Глава удалена");
  });

  // ---------- ГАЛЕРЕЯ ----------
  async function loadGallery() {
    const { data, error } = await client.from("gallery").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    galleryItems = data || [];
    renderGalleryList();
  }

  function renderGalleryList() {
    byId("admin-gallery-list").innerHTML = galleryItems.length ? galleryItems.map(item => `<button class="admin-list-item" type="button" data-gallery-id="${item.id}"><img src="${escapeHtml(item.image_url)}" alt=""><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description || "Без описания")}</small></span><span class="status-badge ${item.published ? "published" : ""}">${item.published ? "Опубликовано" : "Черновик"}</span></button>`).join("") : '<p class="empty-state">Изображений пока нет.</p>';
  }

  function resetGalleryForm() {
    byId("gallery-form").reset(); byId("gallery-id").value = ""; byId("gallery-form-title").textContent = "Новое изображение"; byId("current-gallery-image").innerHTML = ""; byId("delete-gallery-button").classList.add("hidden"); setMessage("gallery-message", "");
  }

  function editGallery(id) {
    const item = galleryItems.find(entry => entry.id === id); if (!item) return;
    byId("gallery-id").value = item.id; byId("gallery-title").value = item.title; byId("gallery-description").value = item.description || ""; byId("gallery-published").checked = Boolean(item.published); byId("current-gallery-image").innerHTML = `<img src="${escapeHtml(item.image_url)}" alt="Текущее изображение">`; byId("gallery-form-title").textContent = "Редактирование изображения"; byId("delete-gallery-button").classList.remove("hidden");
  }

  byId("admin-gallery-list").addEventListener("click", event => { const button = event.target.closest("[data-gallery-id]"); if (button) editGallery(button.dataset.galleryId); });
  byId("new-gallery-button").addEventListener("click", resetGalleryForm);
  byId("gallery-form").addEventListener("submit", async event => {
    event.preventDefault(); setMessage("gallery-message", "Сохраняем…");
    try {
      const id = byId("gallery-id").value; const old = galleryItems.find(item => item.id === id); let imageUrl = old?.image_url || null; const file = byId("gallery-file").files[0]; if (file) imageUrl = await uploadImage(file, "gallery"); if (!imageUrl) throw new Error("Выберите изображение.");
      const payload = { title: byId("gallery-title").value.trim(), description: byId("gallery-description").value.trim() || null, image_url: imageUrl, published: byId("gallery-published").checked };
      const query = id ? client.from("gallery").update(payload).eq("id", id) : client.from("gallery").insert(payload);
      const { error } = await query; if (error) throw error;
      await loadGallery(); resetGalleryForm(); setMessage("gallery-message", "Сохранено.", "success"); showToast("Изображение сохранено");
    } catch (error) { setMessage("gallery-message", error.message, "error"); }
  });
  byId("delete-gallery-button").addEventListener("click", async () => {
    const id = byId("gallery-id").value; if (!id || !confirm("Удалить изображение из галереи?")) return;
    const { error } = await client.from("gallery").delete().eq("id", id); if (error) return setMessage("gallery-message", error.message, "error");
    await loadGallery(); resetGalleryForm(); showToast("Изображение удалено");
  });

  checkSession();
});
