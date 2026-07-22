(function () {
 "use strict";

 // ─── Configuration ───────────────────────────────────────────
 const DATA_URL = "data/places_index.json";
 const MAX_RESULTS = 10;
 const DEBOUNCE_MS = 0; // Instant evaluation
 const MIN_CHARS = 1; // High sensitivity starting from 1st character

 // Type metadata & styling (Towns, Cities, Districts & States ONLY)
 const TYPE_META = {
 S: {
 label: "State / UT",
 icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>`,
 priority: 0,
 color: "var(--neon-cyan, #00f5d4)",
 },
 D: {
 label: "District",
 icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>`,
 priority: 1,
 color: "var(--neon-purple, #bf5af2)",
 },
 T: {
 label: "Town / City / Taluk",
 icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 21h18M5 21V7l8-4 8 4v14M9 21v-6h6v6"/></svg>`,
 priority: 2,
 color: "var(--neon-green, #34d399)",
 },
 };

 // ─── State ───────────────────────────────────────────────────
 let statesArr = null;
 let placesArr = null; // Array of [name, stateIdx, typeChar]
 let namesLower = null; // Parallel array of lowercase names for fast search
 let loadPromise = null;

 // ─── Load & Parse Data ───────────────────────────────────────
 function loadPlaces() {
 if (placesArr) return Promise.resolve();
 if (loadPromise) return loadPromise;

 loadPromise = fetch(DATA_URL)
 .then((r) => {
 if (!r.ok) throw new Error(`Failed to load places data: ${r.status}`);
 return r.json();
 })
 .then((data) => {
 statesArr = data.s;

 // Parse TSV string into arrays
 const lines = data.p.split("\n");
 placesArr = new Array(lines.length);
 namesLower = new Array(lines.length);

 for (let i = 0; i < lines.length; i++) {
 const parts = lines[i].split("\t");
 placesArr[i] = [parts[0], parseInt(parts[1], 10), parts[2]];
 namesLower[i] = parts[0].toLowerCase();
 }

 console.log(
 ` Places autocomplete ready: ${placesArr.length.toLocaleString()} Towns, Cities, Districts & States`
 );
 })
 .catch((err) => {
 console.error(" Failed to load places index:", err);
 });

 return loadPromise;
 }

 // ─── Search Function ─────────────────────────────────────────
 function searchPlaces(query) {
 if (!placesArr || !query) return [];

 let q = query.toLowerCase().trim();
 let stateFilter = "";

 // Parse comma input e.g. "Dharwad, Karnataka"
 if (q.includes(",")) {
 const parts = q.split(",");
 q = parts[0].trim();
 stateFilter = parts[1].trim();
 }

 if (!q || q.length < MIN_CHARS) return [];

 const exact = [];
 const prefix = [];
 const wordStart = [];
 const contains = [];

 for (let i = 0; i < namesLower.length; i++) {
 const name = namesLower[i];
 const state = statesArr[placesArr[i][1]] ? statesArr[placesArr[i][1]].toLowerCase() : "";

 if (stateFilter && !state.includes(stateFilter)) {
 continue;
 }

 if (name === q) {
 exact.push(i);
 } else if (name.startsWith(q)) {
 prefix.push(i);
 } else if (name.split(/[\s\-_]+/).some((w) => w.startsWith(q))) {
 wordStart.push(i);
 } else if (name.includes(q)) {
 contains.push(i);
 }

 if (exact.length + prefix.length + wordStart.length >= MAX_RESULTS * 4) {
 break;
 }
 }

 // Sort by type priority: State > District > Town / City
 const sortFn = (a, b) => {
 const pa = TYPE_META[placesArr[a][2]]?.priority ?? 99;
 const pb = TYPE_META[placesArr[b][2]]?.priority ?? 99;
 return pa - pb;
 };

 exact.sort(sortFn);
 prefix.sort(sortFn);
 wordStart.sort(sortFn);
 contains.sort(sortFn);

 const combined = [...exact, ...prefix, ...wordStart, ...contains];
 const results = [];
 const seen = new Set();

 for (const idx of combined) {
 if (results.length >= MAX_RESULTS) break;
 const [name, si, type] = placesArr[idx];
 const state = statesArr[si] || "India";
 const key = `${name}|${state}|${type}`;
 if (seen.has(key)) continue;
 seen.add(key);
 results.push({ name, state, type });
 }

 return results;
 }

 // ─── Highlight matched text ──────────────────────────────────
 function highlightMatch(text, query) {
 let q = query.trim();
 if (q.includes(",")) q = q.split(",")[0].trim();
 if (!q) return escapeHtml(text);

 const idx = text.toLowerCase().indexOf(q.toLowerCase());
 if (idx === -1) return escapeHtml(text);
 const before = text.slice(0, idx);
 const match = text.slice(idx, idx + q.length);
 const after = text.slice(idx + q.length);
 return `${escapeHtml(before)}<mark>${escapeHtml(match)}</mark>${escapeHtml(after)}`;
 }

 function escapeHtml(str) {
 return str
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;");
 }

 // ─── Dropdown Class (Body Floating Panel) ────────────────────
 class PlacesAutocomplete {
 constructor(inputEl) {
 this.input = inputEl;
 this.activeIndex = -1;
 this.results = [];
 this.debounceTimer = null;
 this.isOpen = false;
 this.currentQuery = "";

 this._createDropdown();
 this._bindEvents();
 }

 _createDropdown() {
 // Body-attached floating card to prevent any card/sidebar overflow clipping
 this.dropdown = document.createElement("div");
 this.dropdown.className = "places-ac-floating-card";
 this.dropdown.setAttribute("role", "listbox");
 this.dropdown.id = `ac-dropdown-${this.input.id || Math.random().toString(36).substr(2, 6)}`;
 document.body.appendChild(this.dropdown);

 // Accessibility
 this.input.setAttribute("role", "combobox");
 this.input.setAttribute("aria-autocomplete", "list");
 this.input.setAttribute("aria-controls", this.dropdown.id);
 this.input.setAttribute("aria-expanded", "false");
 }

 _updatePosition() {
 if (!this.input) return;
 const rect = this.input.getBoundingClientRect();
 let top = rect.bottom + window.scrollY + 6;
 let left = rect.left + window.scrollX;

 const modalContainer = this.input.closest(".trip-modal-container");
 if (modalContainer) {
 // Account for scroll offset of scrollable parent container
 }

 const width = Math.max(rect.width, 320);

 this.dropdown.style.top = `${top}px`;
 this.dropdown.style.left = `${left}px`;
 this.dropdown.style.width = `${width}px`;
 }

 _bindEvents() {
 const triggerLoad = () => loadPlaces();
 this.input.addEventListener("focus", triggerLoad, { once: true });

 this.input.addEventListener("input", () => this._onInput());
 this.input.addEventListener("keydown", (e) => this._onKeyDown(e));
 
 this.input.addEventListener("focus", () => {
 loadPlaces();
 if (this.input.value.trim().length >= MIN_CHARS) {
 this.results = searchPlaces(this.input.value);
 if (this.results.length) this._show();
 }
 });

 // Smooth collapse when clicking or tapping anywhere outside
 const handleOutsideClick = (e) => {
 if (this.isOpen && !this.dropdown.contains(e.target) && e.target !== this.input) {
 this._hide();
 }
 };

 document.addEventListener("mousedown", handleOutsideClick, true);
 document.addEventListener("touchstart", handleOutsideClick, true);

 // Reposition on window scroll or resize
 window.addEventListener("scroll", () => {
 if (this.isOpen) this._updatePosition();
 }, { passive: true, capture: true });

 window.addEventListener("resize", () => {
 if (this.isOpen) this._updatePosition();
 }, { passive: true });

 const modalContainer = this.input.closest(".trip-modal-container") || document.querySelector(".trip-modal-container");
 if (modalContainer) {
 modalContainer.addEventListener("scroll", () => {
 if (this.isOpen) this._updatePosition();
 }, { passive: true });
 }
 }

 _onInput() {
 clearTimeout(this.debounceTimer);
 const query = this.input.value.trim();
 this.currentQuery = query;

 if (query.length < MIN_CHARS) {
 this._hide();
 return;
 }

 this.debounceTimer = setTimeout(async () => {
 await loadPlaces();
 if (query !== this.input.value.trim() || query !== this.currentQuery) return;
 this.results = searchPlaces(query);
 this._render(query);
 }, DEBOUNCE_MS);
 }

 _onKeyDown(e) {
 if (!this.isOpen) return;

 switch (e.key) {
 case "ArrowDown":
 e.preventDefault();
 this._navigate(1);
 break;
 case "ArrowUp":
 e.preventDefault();
 this._navigate(-1);
 break;
 case "Enter":
 if (this.activeIndex >= 0 && this.activeIndex < this.results.length) {
 e.preventDefault();
 this._select(this.results[this.activeIndex]);
 }
 break;
 case "Escape":
 this._hide();
 break;
 }
 }

 _navigate(dir) {
 const items = this.dropdown.querySelectorAll(".places-ac-item");
 if (!items.length) return;

 this.activeIndex += dir;
 if (this.activeIndex < 0) this.activeIndex = items.length - 1;
 if (this.activeIndex >= items.length) this.activeIndex = 0;

 items.forEach((el, i) =>
 el.classList.toggle("is-active", i === this.activeIndex)
 );
 items[this.activeIndex].scrollIntoView({ block: "nearest" });
 }

 _select(entry) {
 let displayText = entry.name;
 if (entry.type !== "S") {
 displayText = `${entry.name}, ${entry.state}`;
 }
 
 this.input.value = displayText;

 // Immediately collapse card smoothly
 this._hide();

 // Dispatch input & change events for form handlers
 this.input.dispatchEvent(new Event("input", { bubbles: true }));
 this.input.dispatchEvent(new Event("change", { bubbles: true }));
 }

 _render(query) {
 if (query !== this.input.value.trim() || query !== this.currentQuery) return;
 this.activeIndex = -1;

 if (!this.results.length) {
 if (query.length >= MIN_CHARS) {
 this.dropdown.innerHTML = `
 <div class="places-ac-header">
 <span class="places-ac-header-title">SUGGESTIONS</span>
 <span class="places-ac-count">0 found</span>
 </div>
 <div class="places-ac-empty">
 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
 <span>No places found for "<em>${escapeHtml(query)}</em>"</span>
 </div>`;
 this._show();
 } else {
 this._hide();
 }
 return;
 }

 let html = `
 <div class="places-ac-header">
 <span class="places-ac-header-title">MATCHING PLACES</span>
 <span class="places-ac-count">${this.results.length} found</span>
 </div>
 <div class="places-ac-list">`;

 for (let i = 0; i < this.results.length; i++) {
 const r = this.results[i];
 const meta = TYPE_META[r.type] || TYPE_META.T;
 const subtitle =
 r.type === "S" ? "State / UT of India" : `${meta.label} · ${r.state}`;

 html += `
 <div class="places-ac-item" role="option" data-index="${i}">
 <div class="places-ac-icon" style="color:${meta.color}">${meta.icon}</div>
 <div class="places-ac-text">
 <span class="places-ac-name">${highlightMatch(r.name, query)}</span>
 <span class="places-ac-sub">${escapeHtml(subtitle)}</span>
 </div>
 <span class="places-ac-badge" style="border-color:${meta.color};color:${meta.color}">${meta.label}</span>
 </div>`;
 }

 html += `</div>`;

 this.dropdown.innerHTML = html;

 // Click & Touch Event Handlers for instant selection & collapse
 this.dropdown.querySelectorAll(".places-ac-item").forEach((item) => {
 const onSelect = (e) => {
 e.preventDefault();
 e.stopPropagation();
 const idx = parseInt(item.dataset.index, 10);
 if (!isNaN(idx) && this.results[idx]) {
 this._select(this.results[idx]);
 }
 };

 item.addEventListener("mousedown", onSelect);
 item.addEventListener("touchstart", onSelect, { passive: false });

 item.addEventListener("mouseenter", () => {
 this.activeIndex = parseInt(item.dataset.index, 10);
 this.dropdown
 .querySelectorAll(".places-ac-item")
 .forEach((el, i) =>
 el.classList.toggle("is-active", i === this.activeIndex)
 );
 });
 });

 this._show();
 }

 _show() {
 this._updatePosition();
 this.isOpen = true;
 this.dropdown.classList.add("is-visible");
 this.input.setAttribute("aria-expanded", "true");
 }

 _hide() {
 if (!this.isOpen) return;
 this.isOpen = false;
 this.dropdown.classList.remove("is-visible");
 this.input.setAttribute("aria-expanded", "false");
 this.activeIndex = -1;
 }
 }

 // ─── "Plan a Trip" Button Handler ────────────────────────────
 function initPlanTripButton() {
 const btn = document.getElementById("planTripBtn");
 if (!btn) return;

 btn.addEventListener("click", () => {
 // Open the AI Trip Planner modal
 if (window.TripPlanner && window.TripPlanner.open) {
 window.TripPlanner.open();
 } else {
 // Fallback: scroll to trip planner card in sidebar
 const tripCard = document.getElementById("tripPlannerCard");
 const toInput = document.getElementById("toInput");
 if (tripCard) {
 tripCard.scrollIntoView({ behavior: "smooth", block: "center" });
 setTimeout(() => {
 if (toInput) toInput.focus();
 }, 500);
 }
 }
 });
 }

 // ─── Init ────────────────────────────────────────────────────
 function init() {
 const toInput = document.getElementById("toInput");
 const fromInput = document.getElementById("fromInput");

 if (toInput) new PlacesAutocomplete(toInput);
 if (fromInput) new PlacesAutocomplete(fromInput);

 initPlanTripButton();
 }

 // Expose PlacesAutocomplete on window for use in trip_planner.js modal
 window.PlacesAutocomplete = PlacesAutocomplete;

 if (document.readyState === "loading") {
 document.addEventListener("DOMContentLoaded", init);
 } else {
 init();
 }
})();
