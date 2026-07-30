(function () {
  "use strict";

  let supabaseClient = null;
  let publishedWorks = [];
  let currentWorkId = null;

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

    if (
      window.randomWorkSupabase &&
      typeof window.randomWorkSupabase.from === "function"
    ) {
      return window.randomWorkSupabase;
    }

    const config = findSupabaseConfig();

    if (!config) {
      throw new Error(
        "Не найдены настройки Supabase в файле js/config.js"
      );
    }

    if (
      !window.supabase ||
      typeof window.supabase.createClient !== "function"
    ) {
      throw new Error(
        "На странице не подключена библиотека Supabase"
      );
    }

    window.randomWorkSupabase =
      window.supabase.createClient(
        config.supabaseUrl,
        config.supabasePublishableKey
      );

    return window.randomWorkSupabase;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function typeLabel(type) {
    const labels = {
      book: "Книга",
      story: "Рассказ",
      illustrated: "Иллюстрированная история",
      comic: "Комикс"
    };

    return labels[type] || "Произведение";
  }

  function createWorkUrl(work) {
    if (work.slug) {
      return (
        "reader.html?slug=" +
        encodeURIComponent(work.slug)
      );
    }

    return (
      "reader.html?id=" +
      encodeURIComponent(work.id)
    );
  }

  function getRandomWork() {
    if (!publishedWorks.length) {
      return null;
    }

    let availableWorks = publishedWorks;

    if (
      publishedWorks.length > 1 &&
      currentWorkId !== null
    ) {
      availableWorks =
        publishedWorks.filter(
          work =>
            String(work.id) !==
            String(currentWorkId)
        );
    }

    const randomIndex =
      Math.floor(
        Math.random() *
        availableWorks.length
      );

    return availableWorks[randomIndex];
  }

  function renderWork(work) {
    const container =
      document.querySelector("#random-work");

    if (!container || !work) {
      return;
    }

    currentWorkId = work.id;

    const workUrl =
      createWorkUrl(work);

    const coverUrl =
      work.cover_url ||
      "images/cover-book.svg";

    const description =
      work.description ||
      "Откройте произведение и погрузитесь в новую историю.";

    const genre =
      work.genre
        ? `<span class="random-work-genre">
            ${escapeHtml(work.genre)}
          </span>`
        : "";

    container.innerHTML = `
      <div class="random-work-decoration">
        Случайный выбор
      </div>

      <div class="random-work-grid">

        <div class="random-work-cover-column">

          <a
            class="random-work-cover"
            href="${escapeHtml(workUrl)}"
            aria-label="Открыть произведение ${escapeHtml(work.title)}"
          >
            <img
              src="${escapeHtml(coverUrl)}"
              alt="Обложка ${escapeHtml(work.title)}"
              loading="lazy"
            >
          </a>

        </div>

        <div class="random-work-content">

          <p class="random-work-kicker">
            Что почитать сегодня?
          </p>

          <div class="random-work-meta">
            <span class="random-work-type">
              ${escapeHtml(typeLabel(work.type))}
            </span>

            ${genre}
          </div>

          <h2 class="random-work-title">
            ${escapeHtml(work.title)}
          </h2>

          <p class="random-work-description">
            ${escapeHtml(description)}
          </p>

          <div class="random-work-actions">

            <a
              class="random-work-open-button"
              href="${escapeHtml(workUrl)}"
            >
              Открыть произведение
            </a>

            <button
              class="random-work-refresh-button"
              id="random-work-refresh"
              type="button"
            >
              Показать другое
            </button>

          </div>

        </div>

      </div>
    `;

    const refreshButton =
      document.querySelector(
        "#random-work-refresh"
      );

    if (refreshButton) {
      refreshButton.addEventListener(
        "click",
        showAnotherWork
      );
    }
  }

  function showAnotherWork() {
    const container =
      document.querySelector("#random-work");

    if (!container) {
      return;
    }

    const work =
      getRandomWork();

    if (!work) {
      return;
    }

    container.classList.add(
      "random-work-changing"
    );

    window.setTimeout(() => {
      renderWork(work);

      container.classList.remove(
        "random-work-changing"
      );
    }, 180);
  }

  function renderEmpty() {
    const container =
      document.querySelector("#random-work");

    if (!container) {
      return;
    }

    container.innerHTML = `
      <div class="random-work-empty">
        <strong>
          Случайное произведение пока не выбрано
        </strong>

        <p>
          Сначала опубликуйте книгу, рассказ
          или комикс в панели автора.
        </p>

        <a href="catalog.html">
          Перейти в каталог
        </a>
      </div>
    `;
  }

  function renderError(error) {
    console.error(
      "Ошибка загрузки случайного произведения:",
      error
    );

    const container =
      document.querySelector("#random-work");

    if (!container) {
      return;
    }

    container.innerHTML = `
      <div class="random-work-empty">
        <strong>
          Не удалось загрузить произведение
        </strong>

        <p>
          Проверьте подключение Supabase
          и обновите страницу.
        </p>
      </div>
    `;
  }

  async function loadWorks() {
    const container =
      document.querySelector("#random-work");

    if (!container) {
      return;
    }

    try {
      supabaseClient =
        getSupabaseClient();

      const { data, error } =
        await supabaseClient
          .from("works")
          .select(`
            id,
            slug,
            title,
            type,
            genre,
            description,
            cover_url,
            status
          `)
          .eq("status", "published")
          .order(
            "created_at",
            {
              ascending: false
            }
          );

      if (error) {
        throw error;
      }

      publishedWorks =
        Array.isArray(data)
          ? data
          : [];

      if (!publishedWorks.length) {
        renderEmpty();
        return;
      }

      const firstRandomWork =
        getRandomWork();

      renderWork(firstRandomWork);
    } catch (error) {
      renderError(error);
    }
  }

  function start() {
    loadWorks();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start
    );
  } else {
    start();
  }
})();
