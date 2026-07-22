const fs = require("fs");
const path = require("path");

const SRC = path.join(
 __dirname,
 "..",
 "DATASET devpost",
 "indian-cities-and-villages",
 "data.json"
);
const DEST = path.join(__dirname, "frontend", "data", "places_index.json");

console.log(" Reading source dataset:", SRC);
const raw = JSON.parse(fs.readFileSync(SRC, "utf-8"));

const states = [];
const entries = []; // { name, si, type }

for (const stateObj of raw) {
 const stateName = stateObj.state;
 const si = states.length;
 states.push(stateName);

 // 1. State / UT
 entries.push({ name: stateName, si, type: "S" });

 for (const dist of stateObj.districts || []) {
 // 2. District
 if (dist.district && dist.district.trim()) {
 entries.push({ name: dist.district.trim(), si, type: "D" });
 }

 for (const sub of dist.subDistricts || []) {
 // 3. Taluk / Sub-District / Town / City (NO VILLAGES)
 if (sub.subDistrict && sub.subDistrict.trim()) {
 entries.push({ name: sub.subDistrict.trim(), si, type: "T" });
 }
 }
 }
}

// Add Union Territories / Special Major Territories if not already present
const extraStates = [
 "Ladakh",
 "Jammu & Kashmir",
 "Delhi",
 "Chandigarh",
 "Puducherry"
];

for (const extra of extraStates) {
 if (!states.includes(extra)) {
 const si = states.length;
 states.push(extra);
 entries.push({ name: extra, si, type: "S" });
 }
}

// Special major cities / district additions if needed
const extraMajorCities = [
 { name: "Leh", state: "Ladakh", type: "D" },
 { name: "Kargil", state: "Ladakh", type: "D" },
 { name: "Hubli", state: "Karnataka", type: "T" },
 { name: "Bangalore", state: "Karnataka", type: "T" },
 { name: "Bombay", state: "Maharashtra", type: "T" },
 { name: "Calcutta", state: "West Bengal", type: "T" },
 { name: "Madras", state: "Tamil Nadu", type: "T" },
 { name: "Cochin", state: "Kerala", type: "T" },
 { name: "Trivandrum", state: "Kerala", type: "T" },
 { name: "Gulbarga", state: "Karnataka", type: "D" },
 { name: "Belgaum", state: "Karnataka", type: "D" },
 { name: "Mangalore", state: "Karnataka", type: "D" },
 { name: "Mysore", state: "Karnataka", type: "D" },
 { name: "Shimoga", state: "Karnataka", type: "D" },
 { name: "Bijapur", state: "Karnataka", type: "D" },
 { name: "Bellary", state: "Karnataka", type: "D" },
 { name: "Pondicherry", state: "Puducherry", type: "S" },
 { name: "Gurgaon", state: "Haryana", type: "D" },
 { name: "Allahabad", state: "Uttar Pradesh", type: "D" }
];

for (const mc of extraMajorCities) {
 let si = states.indexOf(mc.state);
 if (si === -1) {
 si = states.length;
 states.push(mc.state);
 }
 entries.push({ name: mc.name, si, type: mc.type });
}

// Deduplicate
const seen = new Set();
const deduped = [];
for (const e of entries) {
 const key = `${e.name.toLowerCase()}|${e.si}|${e.type}`;
 if (!seen.has(key)) {
 seen.add(key);
 deduped.push(e);
 }
}

// Sort alphabetically
deduped.sort((a, b) =>
 a.name.localeCompare(b.name, "en", { sensitivity: "base" })
);

// TSV string format: Name \t StateIndex \t Type
const lines = deduped.map((e) => `${e.name}\t${e.si}\t${e.type}`);
const tsv = lines.join("\n");

const output = JSON.stringify({ s: states, p: tsv });

fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, output);

const sizeKB = (Buffer.byteLength(output) / 1024).toFixed(1);
console.log(` ${deduped.length.toLocaleString()} Towns, Taluks, Districts & States`);
console.log(` ${states.length} States & UTs`);
console.log(` File size: ${sizeKB} KB → ${DEST}`);
