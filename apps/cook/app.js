const collection = document.querySelector('#collection');
const focus = document.querySelector('#focus');
const recipesEl = document.querySelector('#recipes');
const tagsEl = document.querySelector('#tags');
const search = document.querySelector('#search');
const count = document.querySelector('#count');
let recipes = [];
const filterMode = document.querySelector('#filter-mode');
const tagFilters = document.querySelector('#tag-filters');
const matchMode = document.querySelector('#match-mode');
const selectedTags = new Set();

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const plural = (number, singular, pluralForm) => `${number} ${number === 1 ? singular : pluralForm}`;

function renderTags() {
  const tags = [...new Set(recipes.flatMap(recipe => recipe.tags || []))].sort((a, b) => a.localeCompare(b, 'es'));
  tagsEl.innerHTML = '<legend>Elige las etiquetas</legend>' + tags.map(tag => `<label class="tag-option"><input type="checkbox" value="${escapeHTML(tag)}" ${selectedTags.has(tag) ? 'checked' : ''}><span>${escapeHTML(tag)}</span></label>`).join('');
}
function renderRecipes() {
  const query = normalize(search.value.trim());
  const filtered = recipes.filter(recipe => {
    const matchesName = normalize(recipe.nombre).includes(query);
    const tags = [...selectedTags];
    const matchesTags = !filterMode.checked || tags.length === 0 || (matchMode.value === 'or' ? tags.some(tag => (recipe.tags || []).includes(tag)) : tags.every(tag => (recipe.tags || []).includes(tag)));
    return matchesName && matchesTags;
  });
  count.textContent = plural(filtered.length, 'receta', 'recetas');
  recipesEl.innerHTML = filtered.length ? filtered.map(recipe => {
    const index = recipes.indexOf(recipe);
    return `<article class="recipe-card"><div class="card-body"><h3>${escapeHTML(recipe.nombre)}</h3><div class="card-tags">${(recipe.tags || []).map(tag => `<span class="card-tag">${escapeHTML(tag)}</span>`).join('')}</div><button class="focus-button" type="button" data-focus="${index}" aria-label="Ver receta: ${escapeHTML(recipe.nombre)}">Ver receta <span aria-hidden="true">→</span></button></div></article>`;
  }).join('') : '<p class="empty">No hay recetas con esos filtros.<br>Prueba con otra búsqueda o etiqueta.</p>';
}
function amount(ingredient) {
  const quantity = ingredient.cantidad != null ? ingredient.cantidad : ingredient.cantidad_min != null && ingredient.cantidad_max != null ? `${ingredient.cantidad_min}–${ingredient.cantidad_max}` : ingredient.cantidad_min ?? ingredient.cantidad_max ?? '';
  return [quantity, ingredient.unidad].filter(value => value != null && value !== '').join(' ');
}
function openFocus(index) {
  const recipe = recipes[index];
  if (!recipe) return;
  focus.innerHTML = `<div class="focus-header"><button type="button" class="back-button">← &nbsp; Volver al recetario</button><p class="eyebrow"><span></span> MODO COCINA</p><h1>${escapeHTML(recipe.nombre)}</h1><div class="card-tags">${(recipe.tags || []).map(tag => `<span class="card-tag">${escapeHTML(tag)}</span>`).join('')}</div></div><div class="focus-layout"><div class="focus-note ingredients-note"><p class="eyebrow">ANTES DE EMPEZAR</p><h2>Ingredientes</h2><p class="focus-subtitle">Todo lo que necesitas tener a mano.</p><ul class="ingredients">${(recipe.ingredientes || []).map(ingredient => `<li><span>${escapeHTML(ingredient.nombre)}</span><span>${escapeHTML(amount(ingredient))}</span></li>`).join('')}</ul></div><div class="focus-note steps-note"><p class="eyebrow">MANOS A LA OBRA</p><h2>Preparación</h2><p class="focus-subtitle">Ve marcando los pasos a medida que cocinas.</p><p class="progress" aria-live="polite">0 de ${(recipe.preparacion || []).length} pasos completados</p><ol class="steps">${(recipe.preparacion || []).map((step, i) => `<li class="step"><label><input type="checkbox"><span class="step-number">${String(i + 1).padStart(2, '0')}</span><span>${escapeHTML(step)}</span></label></li>`).join('')}</ol></div></div>`;
  collection.hidden = true;
  document.querySelector('.apps-link').hidden = true;
  focus.hidden = false;
  window.scrollTo(0, 0);
  focus.querySelector('.back-button').focus();
}
filterMode.addEventListener('change', () => {
  tagFilters.hidden = !filterMode.checked;
  renderRecipes();
});
matchMode.addEventListener('change', renderRecipes);
tagsEl.addEventListener('change', event => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  if (event.target.checked) selectedTags.add(event.target.value);
  else selectedTags.delete(event.target.value);
  renderRecipes();
});
search.addEventListener('input', renderRecipes);
recipesEl.addEventListener('click', event => {
  const button = event.target.closest('[data-focus]');
  if (button) openFocus(Number(button.dataset.focus));
});
focus.addEventListener('click', event => {
  if (!event.target.closest('.back-button')) return;
  focus.hidden = true;
  collection.hidden = false;
  document.querySelector('.apps-link').hidden = false;
  focus.innerHTML = '';
  window.scrollTo(0, 0);
});
focus.addEventListener('change', event => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  const inputs = focus.querySelectorAll('.steps input');
  focus.querySelector('.progress').textContent = `${focus.querySelectorAll('.steps input:checked').length} de ${inputs.length} pasos completados`;
});
fetch('recipes.json').then(response => {
  if (!response.ok) throw new Error('No se pudo cargar el archivo de recetas.');
  return response.json();
}).then(data => {
  if (!Array.isArray(data.recetas)) throw new Error('El archivo de recetas no tiene el formato esperado.');
  recipes = data.recetas;
  renderTags();
  renderRecipes();
}).catch(() => {
  recipesEl.innerHTML = '<p class="empty">No se han podido cargar las recetas. Comprueba que recipes.json esté disponible y vuelve a intentarlo.</p>';
});
