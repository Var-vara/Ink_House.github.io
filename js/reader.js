document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("reader-root");
  const slug = new URLSearchParams(location.search).get("slug");
  if (!slug) {
    root.innerHTML = '<div class="center-page"><div><h1>Произведение не выбрано</h1><a class="button primary" href="catalog.html">Открыть каталог</a></div></div>';
    return;
  }

  function renderBlock(block) {
    const safeText = AuthorSite.escapeHtml(block.text || "");
    if (block.type === "heading") return `<h3 class="reading-block reading-heading">${safeText}</h3>`;
    if (block.type === "quote") return `<blockquote class="reading-block reading-quote">${safeText}</blockquote>`;
    if (block.type === "image") return `<figure class="reading-block reading-image"><img src="${AuthorSite.escapeHtml(block.url || "")}" alt="${AuthorSite.escapeHtml(block.caption || "Иллюстрация")}" loading="lazy">${block.caption ? `<figcaption>${AuthorSite.escapeHtml(block.caption)}</figcaption>` : ""}</figure>`;
    return `<p class="reading-block reading-text">${safeText}</p>`;
  }

  function showChapter(chapterId) {
    const chapter = currentWork.chapters.find(item => String(item.id) === String(chapterId));
    if (!chapter) return;
    document.getElementById("chapter-content").innerHTML = `<h2>${AuthorSite.escapeHtml(chapter.title)}</h2>${(chapter.content_json || []).map(renderBlock).join("") || '<p class="empty-state">В этой главе пока нет текста.</p>'}`;
    document.querySelectorAll(".chapter-nav button").forEach(button => button.classList.toggle("active", String(button.dataset.chapter) === String(chapterId)));
    window.scrollTo({ top: document.querySelector(".reader-layout").offsetTop - 30, behavior: "smooth" });
  }

  let currentWork;
  try {
    currentWork = await AuthorSite.getWorkBySlug(slug);
    if (!currentWork) {
      root.innerHTML = '<div class="center-page"><div><p class="eyebrow">Не найдено</p><h1>Такого произведения нет</h1><a class="button primary" href="catalog.html">Вернуться в каталог</a></div></div>';
      return;
    }
    document.title = `${currentWork.title} — ${AuthorSite.config.siteName || "Чернильный дом"}`;
    const chapters = currentWork.chapters || [];
    root.innerHTML = `
      <section class="reader-hero"><div class="reader-hero-inner">
        <img class="reader-cover" src="${AuthorSite.escapeHtml(currentWork.cover_url || "images/cover-placeholder.svg")}" alt="Обложка: ${AuthorSite.escapeHtml(currentWork.title)}">
        <div><p class="eyebrow">${AuthorSite.escapeHtml(AuthorSite.typeLabel(currentWork.type))}${currentWork.genre ? ` · ${AuthorSite.escapeHtml(currentWork.genre)}` : ""}</p><h1>${AuthorSite.escapeHtml(currentWork.title)}</h1><p class="reader-description">${AuthorSite.escapeHtml(currentWork.description || "")}</p></div>
        ${currentWork.store_url ? `
  <div class="external-purchase">

    <p class="external-purchase-text">
      Купить полную версию книги
      ${currentWork.store_name
        ? `на площадке ${AuthorSite.escapeHtml(currentWork.store_name)}`
        : "на книжной площадке"}
    </p>

    <a
      class="button primary external-purchase-button"
      href="${AuthorSite.escapeHtml(currentWork.store_url)}"
      target="_blank"
      rel="noopener noreferrer"
    >
      Купить книгу
    </a>

    <small>
      Вы перейдёте на внешний сайт, где сможете оформить покупку.
    </small>

  </div>
` : ""}
      </div></section>
      <section class="reader-layout">
        <aside class="chapter-nav"><h2>Оглавление</h2>${chapters.map((chapter, index) => `<button class="${index === 0 ? "active" : ""}" data-chapter="${chapter.id}" type="button">${chapter.chapter_number}. ${AuthorSite.escapeHtml(chapter.title)}</button>`).join("") || '<p>Опубликованных глав пока нет.</p>'}</aside>
        <article id="chapter-content" class="chapter-content"></article>
      </section>`;
    document.querySelector(".chapter-nav")?.addEventListener("click", event => {
      const button = event.target.closest("[data-chapter]");
      if (button) showChapter(button.dataset.chapter);
    });
    if (chapters[0]) showChapter(chapters[0].id);
    else document.getElementById("chapter-content").innerHTML = '<p class="empty-state">Автор ещё не опубликовал главы.</p>';
  } catch (error) {
    console.error(error);
    root.innerHTML = '<div class="center-page"><div><h1>Не удалось открыть произведение</h1><p>Проверьте подключение и настройки Supabase.</p></div></div>';
  }
});
