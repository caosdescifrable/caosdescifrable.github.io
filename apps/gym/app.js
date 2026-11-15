const $ = selector => document.querySelector(selector);
const catalog = $('#catalog'), session = $('#session'), setsSection = $('#sets'), detail = $('#detail');
const catalogButton = $('#catalog-mode'), sessionButton = $('#session-mode'), setButton = $('#set-mode');
const setSelect = $('#set-select');
const search = $('#search'), exercisesEl = $('#exercises'), tagGroups = $('#tag-groups');
const filterMode = $('#filter-mode'), matchMode = $('#match-mode'), megasetSelect = $('#megaset');
const selected = new Set();
const categories = [
  ['zonas', 'Zona corporal', ['superior', 'inferior', 'core', 'espalda', 'brazos', 'piernas']],
  ['musculos', 'Músculo', []],
  ['lugares', 'Lugar', ['casa', 'gym']],
  ['material', 'Material', ['mancuernas', 'cintas', 'mochilas', 'peso corporal']]
];
let data = { ejercicios: [], sets: [], megasets: [] }, currentMode = 'session', storageAvailable = true;
const transientProgress = {};
const checkedExercises = new Map();
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const allTags = exercise => categories.flatMap(([key]) => exercise[key] || []);
const exerciseById = id => data.ejercicios.find(exercise => exercise.id === id);
const tagsHTML = exercise => `<div class="tags">${allTags(exercise).map(tag => `<span class="tag">${esc(tag)}</span>`).join('')}</div>`;
function prescription(exercise) {
  const parts = [];
  if (exercise.repeticiones != null && exercise.repeticiones !== '') parts.push(`${esc(exercise.repeticiones)} repeticiones`);
  if (exercise.series != null && exercise.series !== '') parts.push(`${esc(exercise.series)} series`);
  if (exercise.peso != null && exercise.peso !== '') parts.push(`peso: ${esc(exercise.peso)}`);
  return parts.length ? `<p class="prescription">${parts.join(' × ')}</p>` : '';
}
function exerciseContent(exercise) {
  return `${tagsHTML(exercise)}${prescription(exercise)}${exercise.gif ? `<img class="exercise-gif" src="${esc(exercise.gif)}" alt="Movimiento: ${esc(exercise.nombre)}" loading="lazy">` : ''}<p class="description">${esc(exercise.descripcion)}</p>${exercise.errores ? `<div class="error-box"><strong>Ten en cuenta</strong>${esc(exercise.errores)}</div>` : ''}`;
}
function renderTags() {
  tagGroups.innerHTML = categories.map(([key, label, fixed]) => {
    const tags = [...new Set([...fixed, ...data.ejercicios.flatMap(exercise => exercise[key] || [])])];
    return `<fieldset class="tag-group"><legend>${label}</legend>${tags.map(tag => `<label class="tag-option"><input type="checkbox" data-key="${esc(key)}" value="${esc(tag)}"><span>${esc(tag)}</span></label>`).join('')}</fieldset>`;
  }).join('');
}
function renderExercises() {
  const query = normalize(search.value.trim());
  const found = data.ejercicios.filter(exercise => {
    const matchesName = normalize(exercise.nombre).includes(query);
    const checks = [...selected].map(item => { const [key, tag] = JSON.parse(item); return (exercise[key] || []).includes(tag); });
    return matchesName && (!filterMode.checked || !checks.length || (matchMode.value === 'or' ? checks.some(Boolean) : checks.every(Boolean)));
  });
  $('#count').textContent = `${found.length} ${found.length === 1 ? 'ejercicio' : 'ejercicios'}`;
  exercisesEl.innerHTML = found.length ? found.map(exercise => `<article class="card"><h2>${esc(exercise.nombre)}</h2>${tagsHTML(exercise)}${prescription(exercise)}<button type="button" class="primary" data-detail="${esc(exercise.id)}">Ver ejercicio <span aria-hidden="true">→</span></button></article>`).join('') : '<p class="empty">No hay ejercicios con esos filtros. Prueba otra búsqueda o cambia las etiquetas.</p>';
}
function setMode(mode) {
  currentMode = mode;
  document.querySelector('.apps-link').hidden = false;
  catalog.hidden = mode !== 'catalog'; session.hidden = mode !== 'session'; setsSection.hidden = mode !== 'sets'; detail.hidden = true;
  catalogButton.classList.toggle('active', mode === 'catalog'); sessionButton.classList.toggle('active', mode === 'session');
  catalogButton.setAttribute('aria-pressed', String(mode === 'catalog')); sessionButton.setAttribute('aria-pressed', String(mode === 'session'));
  setButton.classList.toggle('active', mode === 'sets');
  setButton.setAttribute('aria-pressed', String(mode === 'sets'));
  if (mode === 'session') renderSession();
  if (mode === 'sets') renderSet();
}
function showDetail(id) {
  const exercise = exerciseById(id); if (!exercise) return;
  document.querySelector('.apps-link').hidden = true;
  catalog.hidden = true; session.hidden = true; setsSection.hidden = true; detail.hidden = false;
  detail.innerHTML = `<div class="detail-header"><button class="back" type="button">← &nbsp; Volver a ejercicios</button><p class="eyebrow">EJERCICIO</p><h1>${esc(exercise.nombre)}</h1></div><div class="detail-content">${exerciseContent(exercise)}</div>`;
  window.scrollTo(0, 0); detail.querySelector('.back').focus();
}
function readNext(id) {
  try { return localStorage.getItem(`gym.megaset.${id}.next`) || transientProgress[id]; }
  catch { storageAvailable = false; return transientProgress[id]; }
}
function saveNext(id, next) {
  transientProgress[id] = next;
  try { localStorage.setItem(`gym.megaset.${id}.next`, next); }
  catch { storageAvailable = false; }
}
function renderSession() {
  const megaset = data.megasets.find(item => item.id === megasetSelect.value);
  const container = $('#session-content');
  if (!megaset) { container.innerHTML = '<p class="empty">No hay megasets disponibles.</p>'; return; }
  const items = megaset.sets.flatMap(id => data.sets.find(set => set.id === id)?.ejercicios || []).map(exerciseById).filter(Boolean);
  if (!items.length) { container.innerHTML = '<p class="empty">Este megaset no tiene ejercicios disponibles.</p>'; return; }
  const saved = readNext(megaset.id);
  const index = Math.max(0, items.findIndex(exercise => exercise.id === saved));
  const ordered = [...items.slice(index), ...items.slice(0, index)];
  const current = ordered[0];
  container.innerHTML = `<div class="session-heading"><div><p class="eyebrow">TU SIGUIENTE EJERCICIO</p><h1 class="session-title">${esc(megaset.nombre)}</h1><p class="muted">${esc(megaset.descripcion || '')}</p></div><p class="muted">${items.length} ejercicios en rotación</p></div><article class="session-current"><p class="eyebrow">AHORA</p><h2>${esc(current.nombre)}</h2>${exerciseContent(current)}<button type="button" class="primary" id="complete">Completado · siguiente ejercicio <span aria-hidden="true">→</span></button>${storageAvailable ? '' : '<p class="storage-warning" role="status">No se puede guardar el progreso en este navegador. Se mantendrá mientras la página siga abierta.</p>'}</article><div class="queue"><h2>Después</h2><ol>${ordered.slice(1).map((exercise, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span>${esc(exercise.nombre)}</li>`).join('')}<li><span>↻</span>${esc(current.nombre)}</li></ol></div>`;
  $('#complete').addEventListener('click', () => {
    saveNext(megaset.id, items[(index + 1) % items.length].id);
    renderSession();
    const currentCard = container.querySelector('.session-current');
    currentCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#complete').focus({ preventScroll: true });
  });
}
function renderSet() {
  const set = data.sets.find(item => item.id === setSelect.value);
  const container = $('#set-content');
  if (!set) { container.innerHTML = '<p class="empty">No hay sets disponibles.</p>'; return; }
  const checks = checkedExercises.get(set.id) || new Set();
  checkedExercises.set(set.id, checks);
  const items = set.ejercicios.map(exerciseById).filter(Boolean);
  container.innerHTML = `<div class="session-heading"><div><p class="eyebrow">SET</p><h1 class="session-title">${esc(set.nombre)}</h1><p class="muted">${esc(set.descripcion || '')}</p></div></div>${items.length ? `<div class="set-list">${items.map(exercise => `<article class="session-current set-exercise"><h2>${esc(exercise.nombre)}</h2>${exerciseContent(exercise)}<label class="set-check"><input type="checkbox" data-exercise="${esc(exercise.id)}" ${checks.has(exercise.id) ? 'checked' : ''}><span>Completado</span></label></article>`).join('')}</div>` : '<p class="empty">Este set no tiene ejercicios disponibles.</p>'}`;
}
$('#set-content').addEventListener('change', event => {
  const input = event.target.closest('input[data-exercise]');
  if (!input) return;
  const checks = checkedExercises.get(setSelect.value);
  if (input.checked) checks.add(input.dataset.exercise); else checks.delete(input.dataset.exercise);
});
catalogButton.addEventListener('click', () => setMode('catalog'));
sessionButton.addEventListener('click', () => setMode('session'));
setButton.addEventListener('click', () => setMode('sets'));
setSelect.addEventListener('change', renderSet);
search.addEventListener('input', renderExercises);
filterMode.addEventListener('change', () => { $('#tag-f-filters').hidden = !filterMode.checked; renderExercises(); });
matchMode.addEventListener('change', renderExercises);
tagGroups.addEventListener('change', event => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  const key = JSON.stringify([event.target.dataset.key, event.target.value]);
  if (event.target.checked) selected.add(key); else selected.delete(key);
  renderExercises();
});
exercisesEl.addEventListener('click', event => { const button = event.target.closest('[data-detail]'); if (button) showDetail(button.dataset.detail); });
detail.addEventListener('click', event => { if (event.target.closest('.back')) { setMode(currentMode); window.scrollTo(0, 0); } });
megasetSelect.addEventListener('change', renderSession);
fetch('exercises.json').then(response => { if (!response.ok) throw Error('No se pudo cargar'); return response.json(); }).then(result => {
  if (!Array.isArray(result.ejercicios) || !Array.isArray(result.sets) || !Array.isArray(result.megasets)) throw Error('Formato incorrecto');
  data = result; renderTags(); renderExercises();
  megasetSelect.innerHTML = data.megasets.map(item => `<option value="${esc(item.id)}">${esc(item.nombre)}</option>`).join('');
  setSelect.innerHTML = data.sets.map(item => `<option value="${esc(item.id)}">${esc(item.nombre)}</option>`).join('');
  if (currentMode === 'session') renderSession();
  if (currentMode === 'sets') renderSet();
}).catch(() => { exercisesEl.innerHTML = '<p class="empty">No se han podido cargar los ejercicios. Comprueba que exercises.json esté disponible.</p>'; $('#session-content').innerHTML = '<p class="empty">No se han podido cargar los megasets.</p>'; $('#set-content').innerHTML = '<p class="empty">No se han podido cargar los sets.</p>'; });
