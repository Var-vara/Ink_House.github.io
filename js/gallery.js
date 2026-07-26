document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("gallery-grid");
  const dialog = document.getElementById("lightbox");
  const image = document.getElementById("lightbox-image");
  const title = document.getElementById("lightbox-title");
  const description = document.getElementById("lightbox-description");

  try {
    const items = await AuthorSite.getPublishedGallery();
    grid.innerHTML = items.length ? items.map(item => `
      <button class="gallery-card" type="button" data-image="${AuthorSite.escapeHtml(item.image_url)}" data-title="${AuthorSite.escapeHtml(item.title)}" data-description="${AuthorSite.escapeHtml(item.description || "")}">
        <img src="${AuthorSite.escapeHtml(item.image_url)}" alt="${AuthorSite.escapeHtml(item.title)}" loading="lazy"><div><h2>${AuthorSite.escapeHtml(item.title)}</h2>${item.description ? `<p>${AuthorSite.escapeHtml(item.description)}</p>` : ""}</div>
      </button>`).join("") : '<p class="empty-state">Галерея пока пуста.</p>';
  } catch (error) {
    console.error(error);
    grid.innerHTML = '<p class="empty-state">Не удалось загрузить галерею.</p>';
  }

  grid.addEventListener("click", event => {
    const card = event.target.closest(".gallery-card");
    if (!card) return;
    image.src = card.dataset.image;
    image.alt = card.dataset.title;
    title.textContent = card.dataset.title;
    description.textContent = card.dataset.description;
    dialog.showModal();
  });
  document.getElementById("lightbox-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
});
