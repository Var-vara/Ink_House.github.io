(function () {
  "use strict";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function findSupabaseConfig() {
    const knownConfigs = [
      window.SITE_CONFIG,
      window.APP_CONFIG,
      window.AUTHOR_SITE_CONFIG,
      window.AuthorSiteConfig,
      window.siteConfig
    ];

    const knownConfig = knownConfigs.find(config =>
      config &&
      typeof config.supabaseUrl === "string" &&
      typeof config.supabasePublishableKey === "string"
    );

    if (knownConfig) {
      return knownConfig;
    }

    return Object.values(window).find(value =>
      value &&
      typeof value === "object" &&
      typeof value.supabaseUrl === "string" &&
      typeof value.supabasePublishableKey === "string"
    );
  }

  function getSupabaseClient() {
    if (
      window.AuthorSite &&
      window.AuthorSite.supabase &&
      typeof window.AuthorSite.supabase.from === "function"
    ) {
      return window.AuthorSite.supabase;
    }

    if (
      window.supabaseClient &&
      typeof window.supabaseClient.from === "function"
    ) {
      return window.supabaseClient;
    }

    const config = findSupabaseConfig();

    if (!config) {
      throw new Error(
        "Не найдены настройки Supabase в js/config.js"
      );
    }

    if (!window.supabase) {
      throw new Error(
        "Не подключена библиотека Supabase"
      );
    }

    return window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey
    );
  }

  function typeLabel(type) {
    return {
      book: "Новая книга",
      story: "Новый рассказ",
      illustrated: "Иллюстрированная история",
      comic: "Новый комикс"
    }[type] || "Новое произведение";
  }

  async function renderHomeNews() {
    const container =
      document.querySelector("#home-news");

    if (!container) {
      return;
    }

    try {
      const client = getSupabaseClient();

      const { data: work, error } = await client
        .from("works")
        .select(`
          id,
          slug,
          title,
          type,
          cover_url,
          news_text,
          show_in_news,
          status
        `)
        .eq("show_in_news", true)
        .eq("status", "published")
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!work) {
        container.innerHTML = `
          <div class="home-news-empty">
            <div>
              <strong>Новости скоро появятся</strong>
              <p>
                Автор пока не выбрал произведение
                для главной страницы.
              </p>
            </div>
          </div>
        `;

        return;
      }

      const detailsUrl = work.slug
        ? `reader.html?slug=${encodeURIComponent(work.slug)}`
        : `reader.html?id=${encodeURIComponent(work.id)}`;

      const coverUrl =
        work.cover_url || "images/cover-book.svg";

      const newsText =
        work.news_text ||
        "Совсем скоро появятся новые подробности. Следите за обновлениями.";

      container.innerHTML = `
        <div class="home-news-heading">
          <h2>Новости</h2>
          <span>Новинка</span>
        </div>

        <div class="home-news-body">

          <div class="home-news-cover-side">

            <div class="home-news-cover">
              <img
                src="${escapeHtml(coverUrl)}"
                alt="Обложка ${escapeHtml(work.title)}"
              >
            </div>

            <a
              class="home-news-button"
              href="${escapeHtml(detailsUrl)}"
            >
              Подробности
            </a>

          </div>

          <div class="home-news-copy">

            <p class="home-news-type">
              ${escapeHtml(typeLabel(work.type))}
            </p>

            <h2 class="home-news-title">
              ${escapeHtml(work.title)}
            </h2>

            <p class="home-news-text">${escapeHtml(newsText)}</p>

          </div>

        </div>
      `;
    } catch (error) {
      console.error("Ошибка загрузки новости:", error);

      container.innerHTML = `
        <div class="home-news-empty">
          Не удалось загрузить новость.
        </div>
      `;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      renderHomeNews
    );
  } else {
    renderHomeNews();
  }
})();
