document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("catalog-grid");
  const count = document.getElementById("catalog-count");
  const search = document.getElementById("search-input");
  const filters = document.getElementById("type-filters");
  let works = [];
  let activeType = "all";

  function render() {
    const phrase = search.value.trim().toLowerCase();
    const filtered = works.filter(work => {
      const typeMatches = activeType === "all" || work.type === activeType;
      const haystack = `${work.title} ${work.genre || ""} ${work.description || ""}`.toLowerCase();
      return typeMatches && haystack.includes(phrase);
    });
    count.textContent = `Найдено: ${filtered.length}`;
    grid.innerHTML = filtered.length ? filtered.map(AuthorSite.renderWorkCard).join("") : '<p class="empty-state">Ничего не найдено. Попробуйте изменить поиск или фильтр.</p>';
  }

  search.addEventListener("input", render);
  filters.addEventListener("click", event => {
    const button = event.target.closest("[data-type]");
    if (!button) return;
    activeType = button.dataset.type;
    filters.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
    render();
  });

  try {
    works = await AuthorSite.getPublishedWorks();
    render();
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="empty-state">Не удалось загрузить каталог. Проверьте настройки Supabase.</p>';
  }
});
