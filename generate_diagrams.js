const fs = require('fs');
const path = require('path');
const https = require('https');

const diagrams = {
 orchestration: `
sequenceDiagram
 participant Client as Frontend (app.js)
 participant Server as Node.js Backend (server.js)
 participant OSRM as OSRM Routing API
 participant Overpass as Overpass API
 participant News as NewsAPI & SauravTech
 participant Weather as WeatherAPI
 participant NASA as NASA EONET
 participant HotelsDB as India Hotels DB
 
 Client->>Server: POST /api/plan (Start, End)
 Server->>OSRM: Fetch Route Geometry & Coordinates
 OSRM-->>Server: Route Coordinates
 Server->>Overpass: Fetch Bounding Box Cities/Towns
 Overpass-->>Server: Intermediate Places Data
 Server->>Server: Segment Route & Inject Synthetic Checkpoints
 
 par Data Aggregation per Segment
 Server->>Weather: Fetch Current & Upcoming Weather
 Server->>News: Fetch Live Hazard News (20s Cache TTL)
 Server->>NASA: Fetch Global Natural Events
 end
 
 Weather-->>Server: Precipitation & Visibility Data
 News-->>Server: Disaster Alerts
 NASA-->>Server: Live Geo-Events
 
 Server->>Server: Calculate Danger Colors
 
 alt Load Hotels Along Route
 Server->>HotelsDB: findIndiaDBHotelsForRoute (Strict Route Filter)
 HotelsDB-->>Server: Unique Hotels
 end
 
 Server-->>Client: Final TripState JSON
 `,
 frontend: `
flowchart TD
 Init[Initialize MapLibre GL] --> UIListeners[Bind UI Click Listeners]
 UIListeners --> Sub[User Submits Start/End Location]
 Sub --> ShowStopBtn[Show Stop Searching Button & AbortController]
 ShowStopBtn --> PollStart[Start Polling: fetchTripState]
 
 PollStart --> IsAborted{User clicked<br>Stop Searching?}
 IsAborted -- Yes --> AbortReq[Abort plan request & Reset UI]
 IsAborted -- No --> ParseJSON[Parse TripState JSON]
 
 ParseJSON --> RenderLayers{Route Coordinates Changed?}
 RenderLayers -- Yes --> Rebuild[Rebuild Map Sources & GeoJSON]
 RenderLayers -- No --> SyncColors[Dynamically Sync Sync Segment Colors]
 
 SyncColors --> HUD[Update HUD: Speed, ETA, Weather]
 HUD --> Timeline[Render Upcoming Places Timeline]
 Timeline --> Hotels{Are there Hotels?}
 
 Hotels -- Yes --> RenderHotels[Render Unique Hotel Cards]
 Hotels -- No --> Wait[Wait for next poll...]
 RenderHotels --> Wait
 `,
 backend: `
flowchart TD
 Req([Receive Client GET /api/trip-state]) --> CheckCache{Route in Cache?}
 
 CheckCache -- No --> FetchGeocode[Geocode Start & End Points]
 FetchGeocode -->|Geocode Failed| CacheFail[Cache Failure in routeCache]
 CacheFail --> ErrRes([Send 200 OK with Routing Failed])
 
 FetchGeocode --> OSRM[Fetch OSRM Route Data]
 OSRM --> Overpass[Fetch Cities within Bounding Box]
 Overpass --> SegmentLogic[Segment Route: Max 50km apart]
 SegmentLogic --> AssignSegments[Map Places to Segments]
 
 CheckCache -- Yes --> UseCache[Load Cached Segments]
 AssignSegments --> UseCache
 
 UseCache --> AsyncPoll[Trigger Async API Fetches]
 
 subgraph Parallel API Promises
 AsyncPoll --> GetWeather[Fetch WeatherAPI]
 AsyncPoll --> GetNews[Fetch NewsAPI & SauravTech]
 AsyncPoll --> GetNASA[Fetch NASA EONET Cache]
 end
 
 GetWeather --> Assemble[Assemble Final Payload]
 GetNews --> Assemble
 GetNASA --> Assemble
 
 Assemble --> ColorEval[Evaluate Hazard Risks per Segment]
 ColorEval --> HotelEval[findIndiaDBHotelsForRoute: Route Cities Only]
 
 HotelEval --> BuildRes[Construct JSON]
 BuildRes --> Res([Send 200 OK to Client])
 `,
 hazard: `
flowchart TD
 Start([Receive Segment Data]) --> IsNewsActive{Does News Alert<br>Match City Name?}
 
 IsNewsActive -- Yes --> AlertRed[Flag as ACTIVE DANGER: RED]
 IsNewsActive -- No --> CheckNDVI{NDVI >= 0.72 <br>AND Heavy Rain?}
 
 CheckNDVI -- Yes --> AlertRed
 CheckNDVI -- No --> CheckCSV{Is City in Historic<br>Disaster CSV?}
 
 CheckCSV -- Yes --> AlertAmber[Flag as CAUTION: AMBER]
 CheckCSV -- No --> IsStorm{Is NASA Storm<br>Polygon Intersecting?}
 
 IsStorm -- Yes --> AlertAmber
 IsStorm -- No --> AlertGreen[Flag as SAFE: GREEN]
 `,
 trip_planner: `
flowchart TD
 User([User Clicks Plan a Trip]) --> InputForm[Enter From, To, Days, Budget]
 InputForm --> Submit[POST /api/ai-trip-plan]
 Submit --> Geocode[Geocode Origin & Destination]
 Geocode --> Route[Fetch Highway Driving Route via OSRM]
 Route --> ViaStops[Extract Via-Place Highway Stops]
 ViaStops --> GeocodeStops[Reverse Geocode Via-Places]
 GeocodeStops --> AttrGen[Build Attractions for Each Via-Place]
 AttrGen --> Resp[Return JSON: Start, End, Via Places, Attractions, Hotels, Itinerary]
 Resp --> RenderUI[Render Modal UI & Draw Glowing Route Polyline on MapLibre Canvas]
 RenderUI --> FlyCam[Fly Camera & Highlight Markers]
 `
};

const outputDirs = [
 path.join(__dirname, 'public', 'diagrams'),
 path.join(__dirname, 'frontend', 'diagrams')
];
outputDirs.forEach(dir => {
 if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function downloadImage(name, mcode) {
 return new Promise((resolve, reject) => {
 // base64 encode the mermaid code
 const base64 = Buffer.from(mcode.trim()).toString('base64url');
 const url = `https://mermaid.ink/img/${base64}`;
 
 https.get(url, (response) => {
 if (response.statusCode !== 200) {
 reject(new Error(`Failed to download ${name}: HTTP ${response.statusCode}`));
 return;
 }
 
 const chunks = [];
 response.on('data', chunk => chunks.push(chunk));
 response.on('end', () => {
 const buffer = Buffer.concat(chunks);
 outputDirs.forEach(dir => {
 fs.writeFileSync(path.join(dir, `${name}.png`), buffer);
 });
 console.log(`[Success] Saved diagram: ${name}.png`);
 resolve();
 });
 }).on('error', (err) => {
 reject(err);
 });
 });
}

async function run() {
 console.log("Generating diagrams via Mermaid.ink...");
 for (const [name, code] of Object.entries(diagrams)) {
 try {
 await downloadImage(name, code);
 } catch (err) {
 console.error(`[Error] Failed to generate ${name}:`, err.message);
 }
 }
 console.log("Done!");
}

run();
