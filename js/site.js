(() => {
  "use strict";

  const config = window.SITE_CONFIG || {};
  const isConfigured = Boolean(
    config.supabaseUrl &&
    config.supabasePublishableKey &&
    !config.supabaseUrl.includes("PASTE_") &&
    !config.supabasePublishableKey.includes("PASTE_")
  );

  let client = null;
  if (isConfigured && window.supabase?.createClient) {
    client = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[character]));
  }

 function typeLabel(type) {
  return ({
    book: "Книга",
    story: "Рассказ",
    illustrated: "Иллюстрированная история",
    comic: "Комикс"
  })[type] || "Произведение";

  }

  function slugify(text = "") {
    return text.toLowerCase().trim()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 170);
  }

  function formatDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
  }

  function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = isError ? "#8f2727" : "#211b1a";
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3500);
  }

  function renderWorkCard(work) {
    const cover = work.cover_url || "images/cover-placeholder.svg";
    return `
      <article class="work-card">
        <div class="work-cover"><img src="${escapeHtml(cover)}" alt="Обложка: ${escapeHtml(work.title)}" loading="lazy"></div>
        <div class="work-card-body">
          <div class="work-meta"><span>${escapeHtml(typeLabel(work.type))}</span>${work.genre ? `<span>• ${escapeHtml(work.genre)}</span>` : ""}</div>
          <h3>${escapeHtml(work.title)}</h3>
          <p>${escapeHtml(work.description || "Описание появится позже.")}</p>
        </div>
        <a class="work-card-link" href="reader.html?slug=${encodeURIComponent(work.slug)}" aria-label="Читать ${escapeHtml(work.title)}"></a>
      </article>`;
  }

  async function getPublishedWorks() {
    if (!client) return [...window.DEMO_DATA.works];
    const { data, error } = await client.from("works").select("*").eq("status", "published").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function getWorkBySlug(slug) {
    if (!client) {
      const work = window.DEMO_DATA.works.find(item => item.slug === slug);
      if (!work) return null;
      return { ...work, chapters: window.DEMO_DATA.chapters[work.id] || [] };
    }
    const { data: work, error } = await client.from("works").select("*").eq("slug", slug).eq("status", "published").maybeSingle();
    if (error) throw error;
    if (!work) return null;
    const { data: chapters, error: chapterError } = await client.from("chapters").select("*").eq("work_id", work.id).eq("is_published", true).order("chapter_number");
    if (chapterError) throw chapterError;
    return { ...work, chapters: chapters || [] };
  }

  async function getPublishedGallery() {
    if (!client) return [...window.DEMO_DATA.gallery];
    const { data, error } = await client.from("gallery").select("*").eq("published", true).order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  function applySiteSettings() {
    document.querySelectorAll("[data-site-name]").forEach(node => node.textContent = config.siteName || "Чернильный дом");
    document.querySelectorAll("[data-author-name]").forEach(node => node.textContent = config.authorName || "Имя автора");
    document.querySelectorAll("[data-author-email]").forEach(node => {
      const email = config.authorEmail || "author@example.com";
      node.textContent = email;
      node.setAttribute("href", `mailto:${email}`);
    });
    document.querySelectorAll("[data-current-year]").forEach(node => node.textContent = new Date().getFullYear());
  }

  function setupMobileMenu() {
    const button = document.querySelector(".menu-button");
    const nav = document.getElementById("main-nav");
    if (!button || !nav) return;
    button.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      button.setAttribute("aria-expanded", String(open));
    });
  }

  applySiteSettings();
  setupMobileMenu();

  window.AuthorSite = {
    config, client, isConfigured, escapeHtml, typeLabel, slugify, formatDate,
    showToast, renderWorkCard, getPublishedWorks, getWorkBySlug, getPublishedGallery
  };
})();
