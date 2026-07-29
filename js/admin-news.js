(function () {
  "use strict";

  let works = [];

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

    if (!config || !window.supabase) {
      throw new Error(
        "Не удалось подключиться к Supabase"
      );
    }

    return window.supabase.createClient(
      config.supabaseUrl,
      config.supabasePublishableKey
    );
  }

  function showMessage(text, isError = false) {
    const message =
      document.querySelector("#news-admin-message");

    if (!message) {
      return;
    }

    message.textContent = text;
    message.style.color = isError
      ? "#b42318"
      : "#26734d";
  }

  function selectedWork() {
    const select =
      document.querySelector("#news-work-select");

    return works.find(
      work => String(work.id) === String(select.value)
    );
  }

  function fillFields() {
    const work = selectedWork();

    const textInput =
      document.querySelector("#news-text-input");

    const visibleInput =
      document.querySelector("#news-visible-input");

    if (!work) {
      textInput.value = "";
      visibleInput.checked = false;
      return;
    }

    textInput.value = work.news_text || "";
    visibleInput.checked =
      Boolean(work.show_in_news);
  }

  async function loadWorks() {
    const select =
      document.querySelector("#news-work-select");

    if (!select) {
      return;
    }

    try {
      const client = getSupabaseClient();

      const { data, error } = await client
        .from("works")
        .select(`
          id,
          title,
          type,
          status,
          news_text,
          show_in_news
        `)
        .order("title", { ascending: true });

      if (error) {
        throw error;
      }

      works = Array.isArray(data) ? data : [];

      if (!works.length) {
        select.innerHTML = `
          <option value="">
            Сначала добавьте произведение
          </option>
        `;

        return;
      }

      select.innerHTML = works
        .map(work => `
          <option value="${work.id}">
            ${work.title}${
              work.status !== "published"
                ? " — черновик"
                : ""
            }
          </option>
        `)
        .join("");

      const activeWork =
        works.find(work => work.show_in_news);

      if (activeWork) {
        select.value = activeWork.id;
      }

      fillFields();
    } catch (error) {
      console.error(error);

      select.innerHTML = `
        <option value="">
          Ошибка загрузки
        </option>
      `;

      showMessage(
        "Не удалось загрузить произведения.",
        true
      );
    }
  }

  async function saveNews() {
    const select =
      document.querySelector("#news-work-select");

    const textInput =
      document.querySelector("#news-text-input");

    const visibleInput =
      document.querySelector("#news-visible-input");

    const button =
      document.querySelector("#news-save-button");

    if (!select.value) {
      showMessage(
        "Сначала выбери произведение.",
        true
      );

      return;
    }

    button.disabled = true;
    button.textContent = "Сохранение…";

    try {
      const client = getSupabaseClient();

      const {
        data: { session }
      } = await client.auth.getSession();

      if (!session) {
        throw new Error(
          "Сначала войдите в панель администратора"
        );
      }

      const { error } = await client
        .from("works")
        .update({
          news_text:
            textInput.value.trim() || null,

          show_in_news:
            visibleInput.checked
        })
        .eq("id", select.value);

      if (error) {
        throw error;
      }

      showMessage("Новость сохранена.");

      await loadWorks();
    } catch (error) {
      console.error(error);

      showMessage(
        error.message ||
          "Не удалось сохранить новость.",
        true
      );
    } finally {
      button.disabled = false;
      button.textContent = "Сохранить новость";
    }
  }

  function start() {
    const select =
      document.querySelector("#news-work-select");

    const button =
      document.querySelector("#news-save-button");

    if (!select || !button) {
      return;
    }

    select.addEventListener(
      "change",
      fillFields
    );

    button.addEventListener(
      "click",
      saveNews
    );

    loadWorks();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      start
    );
  } else {
    start();
  }
})();
