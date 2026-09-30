(function () {
 "use strict";

 /* ──────── SVG ICON TEMPLATES ──────── */
 const ICONS = {
 map: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
 close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
 send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>`,
 attraction: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
 nearby: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
 hotel: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7v14M21 7v14M6 7V4a1 1 0 011-1h10a1 1 0 011 1v3M9 21v-4h6v4"/></svg>`,
 restaurant: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
 calendar: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
 weather: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>`,
 expense: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
 safety: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
 transport: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
 pin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
 star: `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
 globe: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`,
 error: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>`,
 route: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="10" r="3"/></svg>`
 };

 let tripMap = null;
 let tripMarkers = [];
 let tripModal = null;
 let currentTripData = null;

 /* ──────── CREATE MODAL DOM ──────── */
 function createModal() {
 if (tripModal) return tripModal;

 const overlay = document.createElement("div");
 overlay.className = "trip-modal-overlay";
 overlay.id = "tripModalOverlay";
 overlay.innerHTML = `
 <div class="trip-modal-container" id="tripModalContainer">
 <!-- Header -->
 <div class="trip-modal-header">
 <div class="trip-modal-title">
 ${ICONS.map}
 <span>AI Trip Planner — E-Horizon System</span>
 </div>
 <button class="trip-modal-close" id="tripModalClose" title="Close">${ICONS.close}</button>
 </div>

 <!-- Form Section -->
 <div class="trip-form-section" id="tripFormSection">
 <div class="trip-form-grid">
 <div class="trip-form-group">
 <label for="tripFromInput">From (Origin)</label>
 <input type="text" id="tripFromInput" autocomplete="off" placeholder="Enter origin city..." />
 </div>
 <div class="trip-form-group">
 <label for="tripToInput">To (Destination)</label>
 <input type="text" id="tripToInput" autocomplete="off" placeholder="Enter destination city..." />
 </div>
 </div>
 <div class="trip-form-row" style="margin-bottom: 20px;">
 <div class="trip-form-group">
 <label for="tripDays">Trip Duration</label>
 <select id="tripDays">
 <option value="1">1 Day</option>
 <option value="2">2 Days</option>
 <option value="3" selected>3 Days</option>
 <option value="4">4 Days</option>
 <option value="5">5 Days</option>
 <option value="7">7 Days</option>
 </select>
 </div>
 <div class="trip-form-group">
 <label for="tripBudget">Budget Level</label>
 <select id="tripBudget">
 <option value="budget">Budget-Friendly</option>
 <option value="mid-range" selected>Mid-Range</option>
 <option value="luxury">Luxury</option>
 </select>
 </div>
 </div>
 <button class="trip-generate-btn" id="tripGenerateBtn">
 ${ICONS.send}
 <span>Generate My Trip Plan</span>
 </button>
 </div>

 <!-- Dynamic Content Area -->
 <div id="tripDynamicContent"></div>
 </div>
 `;

 document.body.appendChild(overlay);
 tripModal = overlay;

 // Event listeners
 overlay.querySelector("#tripModalClose").addEventListener("click", closeModal);
 overlay.addEventListener("click", (e) => {
 if (e.target === overlay) closeModal();
 });
 document.addEventListener("keydown", (e) => {
 if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
 });
 overlay.querySelector("#tripGenerateBtn").addEventListener("click", handleGenerate);

 // Init autocomplete on modal inputs
 if (window.PlacesAutocomplete) {
 const tripFrom = overlay.querySelector("#tripFromInput");
 const tripTo = overlay.querySelector("#tripToInput");
 if (tripFrom) new window.PlacesAutocomplete(tripFrom);
 if (tripTo) new window.PlacesAutocomplete(tripTo);
 } else {
 setTimeout(() => {
 if (window.PlacesAutocomplete) {
 const tripFrom = overlay.querySelector("#tripFromInput");
 const tripTo = overlay.querySelector("#tripToInput");
 if (tripFrom) new window.PlacesAutocomplete(tripFrom);
 if (tripTo) new window.PlacesAutocomplete(tripTo);
 }
 }, 500);
 }

 // Pre-fill from sidebar inputs if available
 const sidebarFrom = document.getElementById("fromInput");
 const sidebarTo = document.getElementById("toInput");
 if (sidebarFrom && sidebarFrom.value) {
 overlay.querySelector("#tripFromInput").value = sidebarFrom.value;
 }
 if (sidebarTo && sidebarTo.value) {
 overlay.querySelector("#tripToInput").value = sidebarTo.value;
 }

 return overlay;
 }

 /* ──────── OPEN / CLOSE ──────── */
 function openModal() {
 const modal = createModal();
 const sidebarFrom = document.getElementById("fromInput");
 const sidebarTo = document.getElementById("toInput");
 if (sidebarFrom && sidebarFrom.value) {
 modal.querySelector("#tripFromInput").value = sidebarFrom.value;
 }
 if (sidebarTo && sidebarTo.value) {
 modal.querySelector("#tripToInput").value = sidebarTo.value;
 }
 requestAnimationFrame(() => {
 modal.classList.add("is-open");
 if (tripMap) tripMap.resize();
 });
 }

 function closeModal() {
 if (tripModal) {
 tripModal.classList.remove("is-open");
 if (tripMap) {
 tripMap.remove();
 tripMap = null;
 }
 tripMarkers.forEach(m => { try { m.remove(); } catch(e) {} });
 tripMarkers = [];
 }
 }

 /* ──────── GENERATE HANDLER ──────── */
 async function handleGenerate() {
 const from = document.getElementById("tripFromInput").value.trim();
 const to = document.getElementById("tripToInput").value.trim();
 const days = document.getElementById("tripDays").value;
 const budget = document.getElementById("tripBudget").value;

 if (!from || !to) {
 alert("Please enter both origin and destination!");
 return;
 }

 const btn = document.getElementById("tripGenerateBtn");
 const content = document.getElementById("tripDynamicContent");

 // Show loading
 btn.disabled = true;
 btn.innerHTML = `<div class="btn-spinner"></div><span>AI is planning your trip...</span>`;

 content.innerHTML = `
 <div class="trip-loading-section">
 <div class="trip-loading-spinner"></div>
 <div class="trip-loading-text">
 <strong>AI Trip Planner</strong> is crafting your journey path<br/>
 from <strong>${escHtml(from)}</strong> to <strong>${escHtml(to)}</strong>...<br/>
 <span style="font-size:0.8rem;margin-top:8px;display:block;color:#64748b;">Calculating intermediate via-places & route polyline</span>
 </div>
 </div>
 `;

 try {
 const res = await fetch("/api/ai-trip-plan", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ from, to, days: Number(days), budget }),
 });

 if (!res.ok) {
 const err = await res.json().catch(() => ({ message: "Server error" }));
 throw new Error(err.message || `HTTP ${res.status}`);
 }

 const data = await res.json();
 currentTripData = data;
 renderTripOutput(data, from, to);
 } catch (err) {
 console.error("[TripPlanner] Error:", err);
 content.innerHTML = `
 <div class="trip-error-section">
 <div class="error-icon">${ICONS.error}</div>
 <div class="error-msg">${escHtml(err.message)}</div>
 <button class="retry-btn" onclick="document.getElementById('tripGenerateBtn').click()">Try Again</button>
 </div>
 `;
 } finally {
 btn.disabled = false;
 btn.innerHTML = `${ICONS.send}<span>Generate My Trip Plan</span>`;
 }
 }

 /* ──────── RENDER TRIP OUTPUT ──────── */
 function renderTripOutput(data, from, to) {
 const content = document.getElementById("tripDynamicContent");

 const attractions = data.tourist_attractions || [];
 const nearby = data.nearby_attractions || [];
 const hotels = data.hotels || [];
 const restaurants = data.restaurants || [];
 const weather = data.weather || {};
 const expenses = data.expenses || {};
 const itinerary = data.itinerary || [];
 const safetyTips = data.safety_tips || [];
 const transport = data.local_transport || [];
 const viaPlaces = data.via_places || [];
 const startPlace = data.start_place || { name: from };
 const endPlace = data.end_place || { name: to };

 const totalBudget = expenses.total_estimate || "N/A";

 let html = `<div class="trip-output-body">`;

 // ── View All on Map Button ──
 html += `
 <button class="trip-view-all-map-btn" id="tripScrollToMap">
 ${ICONS.globe}
 <span>View Full Journey Route on E-Horizon Map</span>
 </button>
 `;

 // ── Summary Dashboard ──
 html += `
 <div class="trip-summary-row">
 <div class="trip-summary-card">
 <div class="trip-summary-icon attractions">${ICONS.attraction}</div>
 <div class="trip-summary-info">
 <span class="label">Attractions</span>
 <span class="value">${attractions.length}</span>
 </div>
 </div>
 <div class="trip-summary-card">
 <div class="trip-summary-icon hotels">${ICONS.hotel}</div>
 <div class="trip-summary-info">
 <span class="label">Via Places</span>
 <span class="value">${viaPlaces.length}</span>
 </div>
 </div>
 <div class="trip-summary-card">
 <div class="trip-summary-icon restaurants">${ICONS.restaurant}</div>
 <div class="trip-summary-info">
 <span class="label">Hotels / Stays</span>
 <span class="value">${hotels.length}</span>
 </div>
 </div>
 <div class="trip-summary-card">
 <div class="trip-summary-icon budget">${ICONS.expense}</div>
 <div class="trip-summary-info">
 <span class="label">Est. Budget</span>
 <span class="value">${typeof totalBudget === "number" ? "₹" + totalBudget.toLocaleString("en-IN") : escHtml(String(totalBudget))}</span>
 </div>
 </div>
 </div>
 `;

 // ── 1. VIA PLACES JOURNEY PATH ──
 if (viaPlaces.length || startPlace.name) {
 html += sectionHeader("Journey Path (Intermediate Via Places)", "sec-nearby", ICONS.route);
 html += `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(0,245,212,0.15);border-radius:14px;padding:20px;margin-bottom:32px;">`;
 html += `<div style="font-size:0.85rem;color:#94a3b8;margin-bottom:16px;">Sequential highway path from <strong>${escHtml(startPlace.name)}</strong> to <strong>${escHtml(endPlace.name)}</strong>:</div>`;
 
 html += `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">`;
 
 // Start node
 html += `<div class="trip-via-node start" style="background:rgba(16,185,129,0.15);border:1px solid #10b981;color:#10b981;padding:8px 14px;border-radius:20px;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:6px;cursor:pointer;" data-lat="${startPlace.lat}" data-lng="${startPlace.lng}" data-name="${escAttr(startPlace.name)}"> ${escHtml(startPlace.name)} (Start)</div>`;
 
 viaPlaces.forEach((vp, idx) => {
 html += `<span style="color:#64748b;font-weight:700;"></span>`;
 html += `<div class="trip-via-node" style="background:rgba(167,139,250,0.12);border:1px solid rgba(167,139,250,0.3);color:#a78bfa;padding:8px 14px;border-radius:20px;font-size:0.82rem;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;" data-lat="${vp.lat}" data-lng="${vp.lng}" data-name="${escAttr(vp.name)}"> ${escHtml(vp.name)} ${vp.distance ? `<span style="font-size:0.7rem;opacity:0.8;">(${vp.distance})</span>` : ""}</div>`;
 });
 
 // End node
 html += `<span style="color:#64748b;font-weight:700;"></span>`;
 html += `<div class="trip-via-node end" style="background:rgba(0,245,212,0.15);border:1px solid #00f5d4;color:#00f5d4;padding:8px 14px;border-radius:20px;font-size:0.85rem;font-weight:700;display:flex;align-items:center;gap:6px;cursor:pointer;" data-lat="${endPlace.lat}" data-lng="${endPlace.lng}" data-name="${escAttr(endPlace.name)}"> ${escHtml(endPlace.name)} (Destination)</div>`;
 
 html += `</div></div></div>`; // close journey section
 }

 // ── 2. TOURIST ATTRACTIONS ──
 if (attractions.length) {
 html += sectionHeader("Tourist Attractions (Listed Along Via Places)", "sec-attractions", ICONS.attraction);
 html += `<div class="trip-card-grid">`;
 attractions.forEach((a) => {
 html += `
 <div class="trip-place-card">
 <div class="card-name">
 <span class="pin-icon">${ICONS.pin}</span>
 ${escHtml(a.name || "Unknown")}
 </div>
 ${a.via_place ? `<div style="font-size:0.75rem;color:#a78bfa;font-weight:600;"> Via: ${escHtml(a.via_place)}</div>` : ""}
 <div class="card-desc">${escHtml(a.description || "")}</div>
 <div class="card-meta">
 ${a.best_time ? `<span class="card-tag green"> ${escHtml(a.best_time)}</span>` : ""}
 ${a.entry_fee ? `<span class="card-tag amber"> ${escHtml(a.entry_fee)}</span>` : ""}
 ${a.time_needed ? `<span class="card-tag blue">⏱ ${escHtml(a.time_needed)}</span>` : ""}
 </div>
 ${a.lat && a.lng ? `<button class="trip-view-map-btn" data-lat="${a.lat}" data-lng="${a.lng}" data-name="${escAttr(a.name)}">${ICONS.pin} Highlight on E-Horizon Map</button>` : ""}
 </div>
 `;
 });
 html += `</div></div>`;
 }

 // ── 3. HOTELS ──
 if (hotels.length) {
 html += sectionHeader("Recommended Hotels Along Route", "sec-hotels", ICONS.hotel);
 html += `<div class="trip-card-grid">`;
 hotels.forEach((h) => {
 const stars = h.rating ? "".repeat(Math.min(Math.round(Number(h.rating)), 5)) : "";
 html += `
 <div class="trip-place-card">
 <div class="card-name">
 <span class="pin-icon" style="color:#60a5fa">${ICONS.hotel}</span>
 ${escHtml(h.name || "")}
 </div>
 ${stars ? `<div style="font-size:0.8rem;color:#fbbf24;">${stars} <span style="color:#94a3b8;font-size:0.75rem;">(${h.rating})</span></div>` : ""}
 <div class="card-meta">
 ${h.price_range ? `<span class="card-tag green"> ${escHtml(h.price_range)}</span>` : ""}
 ${(h.amenities || []).slice(0, 3).map((a) => `<span class="card-tag">${escHtml(a)}</span>`).join("")}
 </div>
 ${h.lat && h.lng ? `<button class="trip-view-map-btn" data-lat="${h.lat}" data-lng="${h.lng}" data-name="${escAttr(h.name)}" style="border-color:rgba(96,165,250,0.2);color:#60a5fa;background:rgba(96,165,250,0.06);">${ICONS.pin} Highlight on E-Horizon Map</button>` : ""}
 </div>
 `;
 });
 html += `</div></div>`;
 }

 // ── 4. RESTAURANTS ──
 if (restaurants.length) {
 html += sectionHeader("Must-Try Restaurants", "sec-restaurants", ICONS.restaurant);
 html += `<div class="trip-card-grid">`;
 restaurants.forEach((r) => {
 html += `
 <div class="trip-place-card">
 <div class="card-name">
 <span class="pin-icon" style="color:#fbbf24">${ICONS.restaurant}</span>
 ${escHtml(r.name || "")}
 </div>
 ${r.must_try ? `<div class="card-desc"> Must try: ${escHtml(r.must_try)}</div>` : ""}
 <div class="card-meta">
 ${r.cuisine ? `<span class="card-tag amber"> ${escHtml(r.cuisine)}</span>` : ""}
 ${r.price_range ? `<span class="card-tag green"> ${escHtml(r.price_range)}</span>` : ""}
 </div>
 ${r.lat && r.lng ? `<button class="trip-view-map-btn" data-lat="${r.lat}" data-lng="${r.lng}" data-name="${escAttr(r.name)}" style="border-color:rgba(251,191,36,0.2);color:#fbbf24;background:rgba(251,191,36,0.06);">${ICONS.pin} Highlight on E-Horizon Map</button>` : ""}
 </div>
 `;
 });
 html += `</div></div>`;
 }

 // ── 5. DAY-BY-DAY ITINERARY ──
 if (itinerary.length) {
 html += sectionHeader("Day-by-Day Itinerary", "sec-itinerary", ICONS.calendar);
 html += `<div class="trip-itinerary-timeline">`;
 itinerary.forEach((day, i) => {
 html += `
 <div class="trip-day-block">
 <div class="trip-day-header">
 ${ICONS.calendar}
 Day ${i + 1}${day.title ? " — " + escHtml(day.title) : ""}
 </div>
 <div class="trip-day-slots">
 ${day.morning ? `<div class="trip-time-slot"><span class="trip-time-label morning">Morning</span><div class="trip-time-content">${escHtml(day.morning)}</div></div>` : ""}
 ${day.afternoon ? `<div class="trip-time-slot"><span class="trip-time-label afternoon">Afternoon</span><div class="trip-time-content">${escHtml(day.afternoon)}</div></div>` : ""}
 ${day.evening ? `<div class="trip-time-slot"><span class="trip-time-label evening">Evening</span><div class="trip-time-content">${escHtml(day.evening)}</div></div>` : ""}
 </div>
 </div>
 `;
 });
 html += `</div></div>`;
 }

 // ── 6. WEATHER & PACKING ──
 if (weather && (weather.summary || weather.temperature_range)) {
 html += sectionHeader("Weather & Packing", "sec-weather", ICONS.weather);
 html += `
 <div class="trip-weather-card">
 <div class="trip-weather-main">
 ${weather.temperature_range ? `<div class="temp">${escHtml(weather.temperature_range)}</div>` : ""}
 ${weather.summary ? `<div class="desc">${escHtml(weather.summary)}</div>` : ""}
 </div>
 </div>
 ${(weather.packing_suggestions || []).length ? `
 <div class="trip-packing-list" style="margin-top:14px;">
 ${weather.packing_suggestions.map((p) => `<span class="trip-packing-item"> ${escHtml(p)}</span>`).join("")}
 </div>
 ` : ""}
 </div>`;
 }

 // ── 7. EXPENSE BREAKDOWN ──
 if (expenses && Object.keys(expenses).length > 1) {
 html += sectionHeader("Expense Breakdown", "sec-expenses", ICONS.expense);
 html += `<table class="trip-expense-table"><thead><tr><th>Category</th><th>Estimated Cost</th></tr></thead><tbody>`;
 const cats = ["transport", "food", "accommodation", "activities"];
 cats.forEach((cat) => {
 if (expenses[cat]) {
 html += `<tr><td style="text-transform:capitalize;">${escHtml(cat)}</td><td>${typeof expenses[cat] === "number" ? "₹" + expenses[cat].toLocaleString("en-IN") : escHtml(String(expenses[cat]))}</td></tr>`;
 }
 });
 html += `<tr><td>Total Estimate</td><td>${typeof expenses.total_estimate === "number" ? "₹" + expenses.total_estimate.toLocaleString("en-IN") : escHtml(String(expenses.total_estimate || "N/A"))}</td></tr>`;
 html += `</tbody></table></div>`;
 }

 // ── 8. SAFETY TIPS ──
 if (safetyTips.length) {
 html += sectionHeader("Safety Tips", "sec-safety", ICONS.safety);
 html += `<div class="trip-safety-list">`;
 safetyTips.forEach((tip) => {
 const tipText = typeof tip === "string" ? tip : tip.text || tip.tip || JSON.stringify(tip);
 html += `
 <div class="trip-safety-item">
 <span class="safety-icon">${ICONS.safety}</span>
 <span>${escHtml(tipText)}</span>
 </div>
 `;
 });
 html += `</div></div>`;
 }

 // ── 9. INTERACTIVE E-HORIZON MAP ──
 html += sectionHeader("E-Horizon 3D Interactive Journey Map", "sec-map", ICONS.globe);
 html += `<div class="trip-map-container" id="tripMapContainer"></div></div>`;

 html += `</div>`; // close output-body

 content.innerHTML = html;

 // Bind events
 bindMapButtons();
 initTripMap(data);

 // Scroll to top of output
 document.getElementById("tripModalContainer").scrollTop = 0;
 }

 /* ──────── SECTION HEADER HELPER ──────── */
 function sectionHeader(title, iconClass, icon) {
 return `
 <div class="trip-section">
 <div class="trip-section-header">
 <div class="trip-section-icon ${iconClass}">${icon}</div>
 <div class="trip-section-title">${escHtml(title)}</div>
 </div>
 `;
 }

 /* ──────── MAP BUTTONS ──────── */
 function bindMapButtons() {
 // "View on Map" buttons & via nodes
 document.querySelectorAll(".trip-view-map-btn[data-lat], .trip-via-node[data-lat]").forEach((btn) => {
 btn.addEventListener("click", () => {
 const lat = parseFloat(btn.dataset.lat);
 const lng = parseFloat(btn.dataset.lng);
 const name = btn.dataset.name || "";
 if (tripMap && !isNaN(lat) && !isNaN(lng)) {
 tripMap.flyTo({ center: [lng, lat], zoom: 13, pitch: 45, duration: 1500 });
 new maplibregl.Popup({ offset: 12, className: "trip-map-popup" })
 .setLngLat([lng, lat])
 .setHTML(`<div class="popup-name">${escHtml(name)}</div><div class="popup-type">Highlighted Location</div>`)
 .addTo(tripMap);
 }
 const mapEl = document.getElementById("tripMapContainer");
 if (mapEl) mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
 });
 });

 // "View Full Journey Route on E-Horizon Map"
 const scrollBtn = document.getElementById("tripScrollToMap");
 if (scrollBtn) {
 scrollBtn.addEventListener("click", () => {
 const mapEl = document.getElementById("tripMapContainer");
 if (mapEl) mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
 });
 }
 }

 /* ──────── INITIALIZE TRIP MAP (E-Horizon Map Engine) ──────── */
 function initTripMap(data) {
 const container = document.getElementById("tripMapContainer");
 if (!container || typeof maplibregl === "undefined") return;

 const pois = [];

 // 1. Origin & Destination
 if (data.start_place && data.start_place.lat) {
 pois.push({ lat: data.start_place.lat, lng: data.start_place.lng, name: ` ${data.start_place.name} (Origin)`, type: "Origin", color: "#10b981" });
 }
 if (data.end_place && data.end_place.lat) {
 pois.push({ lat: data.end_place.lat, lng: data.end_place.lng, name: ` ${data.end_place.name} (Destination)`, type: "Destination", color: "#00f5d4" });
 }

 // 2. Via Places
 (data.via_places || []).forEach((vp) => {
 if (vp.lat && vp.lng) pois.push({ lat: vp.lat, lng: vp.lng, name: ` ${vp.name}`, type: "Via Place", desc: vp.distance, color: "#a78bfa" });
 });

 // 3. Attractions
 (data.tourist_attractions || []).forEach((a) => {
 if (a.lat && a.lng) pois.push({ lat: a.lat, lng: a.lng, name: ` ${a.name}`, type: "Attraction", desc: a.description, color: "#00f5d4" });
 });

 // 4. Hotels
 (data.hotels || []).forEach((h) => {
 if (h.lat && h.lng) pois.push({ lat: h.lat, lng: h.lng, name: ` ${h.name}`, type: "Hotel", desc: h.price_range, color: "#60a5fa" });
 });

 // 5. Restaurants
 (data.restaurants || []).forEach((r) => {
 if (r.lat && r.lng) pois.push({ lat: r.lat, lng: r.lng, name: ` ${r.name}`, type: "Restaurant", desc: r.cuisine, color: "#fbbf24" });
 });

 if (pois.length === 0) {
 container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:0.9rem;">No coordinates available for map display</div>`;
 return;
 }

 if (tripMap) {
 tripMap.remove();
 tripMap = null;
 }

 // Create E-Horizon MapLibre Instance
 tripMap = new maplibregl.Map({
 container: container,
 style: {
 version: 8,
 sources: {
 "dark-tiles": {
 type: "raster",
 tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
 tileSize: 256,
 attribution: "&copy; CartoDB &copy; E-Horizon System",
 },
 },
 layers: [
 { id: "dark-base", type: "raster", source: "dark-tiles" },
 ],
 },
 center: [pois[0].lng, pois[0].lat],
 zoom: 8,
 pitch: 35,
 attributionControl: false,
 });

 tripMap.addControl(new maplibregl.NavigationControl(), "top-right");
 setTimeout(() => {
 if (tripMap) tripMap.resize();
 }, 500);
 tripMarkers = [];

 tripMap.on("load", () => {
 // Draw OSRM route line polyline if available!
 if (data.route_geometry && Array.isArray(data.route_geometry) && data.route_geometry.length > 1) {
 tripMap.addSource("trip-route-src", {
 type: "geojson",
 data: {
 type: "Feature",
 geometry: {
 type: "LineString",
 coordinates: data.route_geometry
 }
 }
 });

 // Glowing blue casing
 tripMap.addLayer({
 id: "trip-route-glow",
 type: "line",
 source: "trip-route-src",
 layout: { "line-cap": "round", "line-join": "round" },
 paint: {
 "line-color": "#7b61ff",
 "line-width": 8,
 "line-opacity": 0.5,
 "line-blur": 4
 }
 });

 // Main cyan route line
 tripMap.addLayer({
 id: "trip-route-line",
 type: "line",
 source: "trip-route-src",
 layout: { "line-cap": "round", "line-join": "round" },
 paint: {
 "line-color": "#00f5d4",
 "line-width": 4,
 "line-opacity": 0.95
 }
 });
 }

 // Add custom glowing pins for ALL mentioned places
 pois.forEach((poi) => {
 const el = document.createElement("div");
 el.style.cssText = `width:26px;height:26px;border-radius:50%;background:${poi.color};border:2px solid rgba(255,255,255,0.9);box-shadow:0 0 12px ${poi.color};cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform 0.2s;`;

 const inner = document.createElement("div");
 inner.style.cssText = `width:8px;height:8px;border-radius:50%;background:white;`;
 el.appendChild(inner);

 el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.3)"; });
 el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });

 const marker = new maplibregl.Marker({ element: el })
 .setLngLat([poi.lng, poi.lat])
 .setPopup(
 new maplibregl.Popup({ offset: 18, className: "trip-map-popup" })
 .setHTML(`
 <div class="popup-name">${escHtml(poi.name || "")}</div>
 <div class="popup-type">${escHtml(poi.type)}</div>
 ${poi.desc ? `<div class="popup-desc">${escHtml(poi.desc)}</div>` : ""}
 `)
 )
 .addTo(tripMap);

 tripMarkers.push(marker);
 });

 // Fit bounds to display full route line and all markers
 if (pois.length > 1) {
 const bounds = new maplibregl.LngLatBounds();
 pois.forEach((p) => bounds.extend([p.lng, p.lat]));
 if (data.route_geometry && Array.isArray(data.route_geometry)) {
 data.route_geometry.forEach((c) => bounds.extend(c));
 }
 tripMap.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 1000 });
 }
 });
 }

 /* ──────── UTILITIES ──────── */
 function escHtml(str) {
 const d = document.createElement("div");
 d.textContent = str || "";
 return d.innerHTML;
 }

 function escAttr(str) {
 return (str || "").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
 }

 /* ──────── PUBLIC API ──────── */
 window.TripPlanner = { open: openModal, close: closeModal };

})();
