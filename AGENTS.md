# Proyecto

- Web estática para GitHub Pages, sin compilación ni dependencias. Priorizar móvil y cambios sencillos.
- `index.html`: selector de apps y PWA única; `styles.css`: estilos compartidos.
- `apps/cook/`: recetas en `recipes.json`; los checks del modo cocina son temporales.
- `apps/gym/`: ejercicios y megasets en `exercises.json`; el siguiente ejercicio de cada megaset se guarda en `localStorage` mediante su ID. Mantener IDs estables.
- En gym, los sets son listas fijas con checks en memoria; los megasets agrupan sets en colas circulares. No inventar pesos, series ni cantidades personales.
- El usuario prefiere rutinas mínimas y sostenibles, controles grandes y explicaciones claras en español.
