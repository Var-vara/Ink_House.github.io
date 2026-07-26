document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("featured-works");
  try {
    const works = await AuthorSite.getPublishedWorks();
    const featured = works.filter(work => work.featured).slice(0, 3);
    const selected = featured.length ? featured : works.slice(0, 3);
    root.innerHTML = selected.length ? selected.map(AuthorSite.renderWorkCard).join("") : '<p class="empty-state">Пока нет опубликованных произведений.</p>';
  } catch (error) {
    console.error(error);
    root.innerHTML = '<p class="empty-state">Не удалось загрузить произведения. Проверьте настройки Supabase.</p>';
  }
});
