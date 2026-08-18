"use strict";

const CONFIG = {
  gridUrl: "https://api.weather.gov/gridpoints/SGF/17,28",
  alertsUrl: "https://api.weather.gov/alerts/active?point=37.071827,-94.704617",
  timeZone: "America/Chicago",
  hours: [16, 17, 18, 19, 20],
  cacheKey: "riverton-football-hub-v2-5"
};

const VENUES = {
  riverton: { name: "Riverton Football Field", address: "7120 SE 70th St, Riverton, KS 66770", lat: 37.0718, lon: -94.7046, destinationType: "Official high-school campus", sourceLabel: "Riverton USD 404", sourceUrl: "https://www.usd404.org/60163_2" },
  chelsea: { name: "Chelsea Football Field", address: "801 W 6th St, Chelsea, OK 74016", lat: 36.5356, lon: -95.4325, destinationType: "Published football-field listing", sourceLabel: "MapQuest field listing", sourceUrl: "https://www.mapquest.com/us/oklahoma/chelsea-high-school-449523714" },
  westville: { name: "Akin-Langley Field", address: "120 W Cherry St, Westville, OK 74965", lat: 35.9956, lon: -94.5688, destinationType: "Official field address; confirm preferred entrance", sourceLabel: "Westville Public Schools event listing", sourceUrl: "https://www.westville.k12.ok.us/events?id=55911144" },
  wyandotte: { name: "Wyandotte Football Field", address: "5 S 1st St, Wyandotte, OK 74370", lat: 36.7942, lon: -94.7252, destinationType: "Official school campus", sourceLabel: "Wyandotte Public Schools", sourceUrl: "https://www.wyandotte.k12.ok.us/" },
  fairland: { name: "Fairland Football Field", address: "202 W Washington Ave, Fairland, OK 74343", lat: 36.7512, lon: -94.8483, destinationType: "Official school campus", sourceLabel: "Fairland Public Schools", sourceUrl: "https://www.fpsowls.com/" },
  quapaw: { name: "Quapaw Football Field", address: "305 W 1st St, Quapaw, OK 74363", lat: 36.9540, lon: -94.7890, destinationType: "Official school campus", sourceLabel: "Quapaw Public Schools", sourceUrl: "https://www.qpswildcats.com/apps/contact/" },
  commerce: { name: "Commerce High School Stadium", address: "420 Doug Furnas Blvd, Commerce, OK 74339", lat: 36.9340, lon: -94.8727, destinationType: "Official high-school campus", sourceLabel: "Commerce High School", sourceUrl: "https://www.commercetigers.net/o/chs" },
  baxter: { name: "Baxter Springs Youth Football Field", address: "17th St & Lions Rd, Baxter Springs, KS 66713", lat: 37.0197, lon: -94.7391, destinationType: "Field-specific public map; confirm preferred entrance", sourceLabel: "Mapped football field near Central Elementary", sourceUrl: "https://mapcarta.com/W280873748" },
  galena: { name: "Galena High School", address: "702 E 7th St, Galena, KS 66739", lat: 37.0759, lon: -94.6397, destinationType: "Official district campus", sourceLabel: "Galena USD 499", sourceUrl: "https://usd499.socs.net/vnews/display.v/ContactUs" }
};

const GAMES = [
  { id: "wk1", week: "Week 1", date: "2026-09-12", time: "18:00", timeAssumed: true, opponent: "Chelsea", side: "away", venue: "chelsea" },
  { id: "wk2", week: "Week 2", date: "2026-09-19", time: "18:00", timeAssumed: true, opponent: "Westville", side: "away", venue: "westville" },
  { id: "wk3", week: "Week 3", date: "2026-09-26", time: "18:00", timeAssumed: true, opponent: "Wyandotte", side: "home", venue: "riverton" },
  { id: "wk4", week: "Week 4", date: "2026-10-03", time: "18:00", timeAssumed: true, opponent: "Fairland", side: "home", venue: "riverton", conference: true },
  { id: "wk5", week: "Week 5", date: "2026-10-10", time: "18:00", timeAssumed: true, opponent: "Quapaw", side: "away", venue: "quapaw", conference: true },
  { id: "wk6", week: "Week 6", date: "2026-10-17", time: "18:00", timeAssumed: true, opponent: "Commerce", side: "home", venue: "riverton", conference: true },
  { id: "wk7", week: "Week 7", date: "2026-10-24", time: "18:00", timeAssumed: true, opponent: "Baxter", side: "away", venue: "baxter", conference: true },
  { id: "wk8", week: "Week 8", date: "2026-10-31", time: null, opponent: "Galena", side: "home", venue: "riverton", conference: true },
  { id: "wk9", week: "Week 9", date: "2026-11-07", time: null, opponent: "Playoffs", side: "tbd", venue: null, postseason: true },
  { id: "wk10", week: "Week 10", date: "2026-11-14", time: null, opponent: "Super Bowl", side: "tbd", venue: "commerce", postseason: true }
];

const state = { report: null, reportFromCache: false, alerts: [], alertsAvailable: null, gameWeatherAvailable: null, loading: false, selectedHour: null, activeView: "home", nextGame: null };
const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function cleanAlertText(value) {
  return String(value ?? "").replace(/(\d)([AP]M)\b/g, "$1 $2");
}

function chicagoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return { year: get("year"), month: get("month"), day: get("day"), hour: Number(get("hour")) };
}

function localDateKey(parts = chicagoParts()) { return `${parts.year}-${parts.month}-${parts.day}`; }
function localDateLabel(date = new Date()) { return new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.timeZone, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date); }
function partsForKey(key) { const [year, month, day] = key.split("-"); return { year, month, day, hour: 12 }; }
function hourLabel(hour) { const normalized = ((Number(hour) % 24) + 24) % 24; return `${normalized % 12 || 12} ${normalized < 12 ? "AM" : "PM"}`; }

function chicagoOffset(parts) {
  const probe = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 18));
  const zone = new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.timeZone, timeZoneName: "longOffset" }).formatToParts(probe).find((part) => part.type === "timeZoneName")?.value || "GMT-06:00";
  return zone.replace("GMT", "");
}

function dateAt(key, time = "12:00") { return new Date(`${key}T${time}:00${chicagoOffset(partsForKey(key))}`); }
function targetDate(parts, hour) { return dateAt(localDateKey(parts), `${String(hour).padStart(2, "0")}:00`); }
function gameStart(game) { return dateAt(game.date, game.time || "12:00"); }
function gameEnd(game) { return game.time ? new Date(gameStart(game).getTime() + 2 * 60 * 60 * 1000) : dateAt(game.date, "23:59"); }
function gameVenue(game) { return game.venue ? VENUES[game.venue] : null; }

function calendarDayNumber(date = new Date()) {
  const parts = chicagoParts(date);
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) / 86400000;
}

function formatGameDate(game) {
  const date = dateAt(game.date, "12:00");
  const day = new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.timeZone, weekday: "short", month: "short", day: "numeric" }).format(date);
  const baseTime = game.time ? new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.timeZone, hour: "numeric", minute: "2-digit" }).format(gameStart(game)) : "TIME TBD";
  const time = game.timeAssumed ? `${baseTime}*` : baseTime;
  return { day, time };
}

function nextGame(now = new Date()) { return GAMES.find((game) => gameEnd(game) > now) || null; }

function nextTeamEvent(now = new Date()) {
  const game = nextGame(now);
  return game ? { title: game.opponent === "Playoffs" || game.opponent === "Super Bowl" ? game.opponent : `${game.side === "away" ? "at" : "vs"} ${game.opponent}`, start: gameStart(game), end: gameEnd(game), game } : null;
}

function relativeEventText(event, now = new Date()) {
  if (!event) return "Season complete";
  if (event.start <= now && event.end > now) return "Game day";
  const eventKey = localDateKey(chicagoParts(event.start)), todayKey = localDateKey(chicagoParts(now));
  if (eventKey === todayKey) return "Today";
  const days = calendarDayNumber(event.start) - calendarDayNumber(now);
  if (days === 1) return "Tomorrow";
  return `${days} days away`;
}

function renderNextEvent() {
  const event = nextTeamEvent();
  $("nextEventCard").classList.remove("loading-card");
  if (!event) {
    $("nextEventTitle").textContent = "Season Complete";
    $("nextEventMeta").textContent = "Thanks for a great season. Go Rams!";
    $("nextEventCountdown").textContent = "2026";
    $("nextEventSource").textContent = "Team schedule · Confirm changes with the team";
    return;
  }
  $("nextEventSource").textContent = "Team schedule · Confirm changes with the team";
  $("nextEventTitle").textContent = event.title;
  const formatted = formatGameDate(event.game), venue = gameVenue(event.game);
  $("nextEventMeta").textContent = `${formatted.day} · ${formatted.time}${venue ? ` · ${venue.name}` : " · Location TBD"}`;
  $("nextEventCountdown").textContent = relativeEventText(event);
}

function renderDayContext() {
  const currentLabel = state.report?.currentHour?.label || hourLabel(chicagoParts().hour);
  $("homeConditionsKicker").textContent = "Today’s conditions";
  $("homeConditionsTitle").textContent = `Current WBGT · ${currentLabel}`;
  $("conditionsTitle").textContent = "Today’s Conditions";
  $("conditionsIntro").textContent = "Tap an hour to view its exact KSHSAA guidance.";
  $("fieldNoteTitle").textContent = "Field Reading Wins";
}

function durationMs(value) {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value || "");
  if (!match) return 0;
  return ((Number(match[1] || 0) * 24 + Number(match[2] || 0)) * 3600 + Number(match[3] || 0) * 60 + Number(match[4] || 0)) * 1000;
}

function valueAt(series, target) {
  if (!series?.values) return null;
  const targetMs = target.getTime();
  const item = series.values.find((entry) => {
    const [startText, span] = entry.validTime.split("/"), start = new Date(startText).getTime();
    const end = span?.startsWith("P") ? start + durationMs(span) : new Date(span).getTime();
    return targetMs >= start && targetMs < end;
  });
  if (item?.value === null || item?.value === undefined) return null;
  const value = Number(item.value);
  if (!Number.isFinite(value)) return null;
  return String(series.uom || "").includes("degC") ? value * 9 / 5 + 32 : value;
}

function tierFor(wbgt) {
  if (wbgt === null) return { short: "WAITING", decision: "Forecast Unavailable", detail: "No NWS WBGT grid value is available for this hour yet.", color: "#8297ad", className: "waiting", range: "Waiting for NWS data", zone: "", rules: [] };
  const value = Math.round((Number(wbgt) + Number.EPSILON) * 10) / 10;
  if (value >= 89.8) return { short: "CANCEL", decision: "No Outdoor Activity", detail: "Delay activity until a cooler WBGT is reached.", color: "#ff4054", className: "extreme", range: "89.8°F or higher", zone: "BLACK ZONE", rules: ["No outdoor activity.", "Delay activity or competition until a cooler WBGT is reached.", "All participants must have unrestricted access to water.", "A field reading taken 30–60 minutes before activity overrides this forecast."] };
  if (value >= 87.8) return { short: "DELAY", decision: "Delay or Reschedule", detail: "KSHSAA recommends waiting until a cooler WBGT is reached.", color: "#ff7a3d", className: "high", range: "87.8–89.7°F", zone: "RED ZONE", rules: ["Delay or reschedule until a cooler WBGT is reached.", "If activity takes place: 1 hour maximum, excluding rest breaks.", "Provide at least 20 total minutes of rest distributed throughout that hour.", "Have a cold-water immersion tub or other rapid-cooling method ready.", "Football: no protective equipment and no conditioning activities.", "All participants must have unrestricted access to water."] };
  if (value >= 84.7) return { short: "MODIFY", decision: "Modify Equipment and Activity", detail: "Helmet and shoulder pads only; remove them for conditioning.", color: "#f4c348", className: "elevated", range: "84.7–87.7°F", zone: "ORANGE ZONE", rules: ["2 hours maximum, excluding rest breaks.", "Provide at least four separate 4-minute rest breaks each hour.", "Have a cold-water immersion tub or other rapid-cooling method ready.", "Football: limit equipment to helmets and shoulder pads; remove them for conditioning.", "If activity began in green or yellow and rises to orange, players may continue in full protective gear.", "All participants must have unrestricted access to water."] };
  if (value >= 80) return { short: "CAUTION", decision: "Increase Water and Rest Breaks", detail: "Use longer scheduled breaks and have rapid cooling ready.", color: "#d9d25e", className: "caution", range: "80.0–84.6°F", zone: "YELLOW ZONE", rules: ["Provide at least three separate 4-minute rest breaks each hour.", "Have a cold-water immersion tub or other rapid-cooling method ready.", "All participants must have unrestricted access to water.", "Monitor at-risk athletes more closely."] };
  return { short: "NORMAL", decision: "Normal Precautions", detail: "Continue scheduled hydration and rest breaks.", color: "#4acb8a", className: "normal", range: "79.9°F or lower", zone: "GREEN ZONE", rules: ["Normal activities are permitted.", "Provide at least three separate rest breaks each hour, at least 3 minutes each.", "All participants must have unrestricted access to water.", "Continue monitoring athletes for heat-illness symptoms."] };
}

function formatTemp(value) { return value === null ? "—" : `${Math.round(value)}°`; }
function formatWbgt(value) { return value === null ? "—" : `${(Math.round((Number(value) + Number.EPSILON) * 10) / 10).toFixed(1)}°`; }

async function fetchJson(url, timeout = 12000) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { headers: { Accept: "application/geo+json" }, cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`NWS returned ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

function buildHours(properties, parts) {
  return CONFIG.hours.map((hour) => {
    const target = targetDate(parts, hour);
    return { hour, label: hourLabel(hour), temperature: valueAt(properties.temperature, target), heatIndex: valueAt(properties.heatIndex, target), wbgt: valueAt(properties.wetBulbGlobeTemperature, target) };
  });
}

function buildCurrentHour(properties, parts) {
  const hour = parts.hour, target = targetDate(parts, hour);
  return { hour, label: hourLabel(hour), temperature: valueAt(properties.temperature, target), heatIndex: valueAt(properties.heatIndex, target), wbgt: valueAt(properties.wetBulbGlobeTemperature, target) };
}

function readCache(dateKey) {
  try { const cached = JSON.parse(localStorage.getItem(CONFIG.cacheKey) || "null"); return cached?.dateKey === dateKey ? cached : null; }
  catch { return null; }
}
function saveCache(report) { try { localStorage.setItem(CONFIG.cacheKey, JSON.stringify(report)); } catch { /* optional */ } }

function renderRows(hours) {
  $("hourRows").innerHTML = hours.map((hour, index) => {
    const tier = tierFor(hour.wbgt), hourValue = hour.hour ?? CONFIG.hours[index], slotEnd = hourValue + 1;
    const endLabel = slotEnd > 12 ? `${slotEnd - 12} PM` : `${slotEnd} AM`, slotLabel = hourValue === CONFIG.hours.at(-1) ? `${hour.label} conditions` : `${hour.label}–${endLabel}`;
    const selected = state.selectedHour === hourValue;
    return `<div class="hour-item">
      <button class="hour-row" type="button" data-hour="${hourValue}" aria-expanded="${selected}" aria-controls="guidance-${hourValue}">
        <strong>${hour.label}</strong><span>${formatTemp(hour.temperature)}</span><span>${formatTemp(hour.heatIndex)}</span><b class="row-${tier.className}">${formatWbgt(hour.wbgt)}</b><em class="row-${tier.className}">${tier.short}</em>
      </button>
      <div id="guidance-${hourValue}" class="hour-guidance" ${selected ? "" : "hidden"}>
        <div class="hour-guidance-head"><h3>${slotLabel}: ${tier.decision}</h3><span class="hour-guidance-zone" style="color:${tier.color}">${tier.zone}<br>${tier.range}</span></div>
        <p class="hour-guidance-detail">${tier.detail}</p>
        ${tier.rules.length ? `<ul>${tier.rules.map((rule) => `<li>${rule}</li>`).join("")}</ul>` : ""}
        <p class="rule-source"><a href="https://www.kshsaa.org/Public/pdf/HeatInfoCurrent.pdf" target="_blank" rel="noopener">View the Official KSHSAA Policy</a> · Updated April 2026</p>
      </div>
    </div>`;
  }).join("");
}

function renderHomeConditions(report) {
  const hour = report?.currentHour;
  if (!hour || hour.wbgt === null) { $("homeConditions").innerHTML = '<p class="empty-state">The current-hour NWS WBGT value is not available yet. Open Conditions for the 4–8 PM outlook.</p>'; return; }
  const tier = tierFor(hour.wbgt);
  $("homeConditions").innerHTML = `<div class="current-wbgt"><div><strong>${escapeHtml(hour.label)}</strong><span>Direct-sun NWS grid</span></div><b style="color:${tier.color}">${formatWbgt(hour.wbgt)}</b><em style="color:${tier.color}">${escapeHtml(tier.short)}</em></div>`;
}

function formatSourceTime(value) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date);
}

function formatAlertUpdate(value) {
  const formatted = formatSourceTime(value);
  return formatted === "Unavailable" ? "NWS alert issue time unavailable" : `NWS alert issued ${formatted.replace(", ", " at ")}`;
}

function relativeAge(value) {
  if (!value) return "age unavailable";
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  if (!Number.isFinite(elapsed)) return "age unavailable";
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "less than 1 minute ago";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60), remaining = minutes % 60;
  if (hours < 24) return `${hours}h${remaining ? ` ${remaining}m` : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function updateFreshnessUI() {
  const report = state.report;
  const retrievedAt = report?.retrievedAt || report?.updatedAt || null;
  const issuedAt = report?.issuedAt || null;
  $("freshnessBadge").textContent = state.reportFromCache ? "SAVED" : report ? "LIVE" : "CHECKING";
  $("freshnessBadge").classList.toggle("cached", state.reportFromCache);
  $("forecastIssued").textContent = issuedAt ? `NWS grid updated ${formatSourceTime(issuedAt)} · ${relativeAge(issuedAt)}` : "NWS grid update time unavailable";
  $("forecastRetrieved").textContent = retrievedAt ? `Retrieved ${formatSourceTime(retrievedAt)} · ${relativeAge(retrievedAt)}` : "Retrieval time unavailable";
  $("homeFreshness").textContent = report ? `${state.reportFromCache ? "SAVED" : "NWS"} · ${issuedAt ? `Grid updated ${relativeAge(issuedAt)}` : "Grid update time unavailable"} · ${retrievedAt ? `Retrieved ${relativeAge(retrievedAt)}` : "Retrieval time unavailable"}` : "Checking NWS grid update time…";
  const showWarning = state.reportFromCache && (state.activeView === "home" || state.activeView === "conditions");
  $("freshnessWarning").hidden = !showWarning;
  if (showWarning) $("freshnessWarningText").textContent = `The NWS request failed. This forecast was retrieved ${relativeAge(retrievedAt)}. Do not use saved data for an activity decision—refresh or use the on-field meter.`;
}

function updateFooter() {
  const retrievedAt = state.report?.retrievedAt || state.report?.updatedAt;
  if (state.activeView === "schedule") {
    $("updatedLine").textContent = "Verify schedule changes with the team.";
    $("footerNote").textContent = "Times and locations can change.";
    return;
  }
  if (state.activeView === "policy") {
    $("updatedLine").textContent = "Policy and venue sources reviewed August 18, 2026.";
    $("footerNote").textContent = "Forecast plans. The on-field WBGT meter decides.";
    return;
  }
  $("updatedLine").textContent = state.report ? `${state.reportFromCache ? "Saved NWS forecast" : "Live NWS forecast"} · Retrieved ${relativeAge(retrievedAt)}` : "Checking the live NWS forecast…";
  $("footerNote").textContent = "Forecast only · Not a field measurement.";
}

function renderAlerts(alerts = state.alerts) {
  state.alerts = alerts || [];
  const visible = state.activeView === "home" || state.activeView === "conditions";
  $("alertArea").hidden = !visible;
  if (!visible) return;
  if (state.alertsAvailable === false) {
    $("alertArea").innerHTML = `<article class="alert-card alert-unavailable"><span class="alert-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.2v.1"/></svg></span><div><strong>NWS alert status unavailable</strong><p>The alert feed did not respond. <a href="${CONFIG.alertsUrl}" target="_blank" rel="noopener">Check the official NWS alert page</a> before activity.</p></div></article>`;
    return;
  }
  $("alertArea").innerHTML = state.alerts.map((feature) => {
    const properties = feature.properties || {};
    const issued = properties.sent || properties.effective;
    const timing = formatAlertUpdate(issued);
    return `<article class="alert-card"><span class="alert-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17.2v.1"/></svg></span><div><strong>${escapeHtml(properties.event || "NWS weather alert")}</strong><p>${escapeHtml(cleanAlertText(properties.headline || "A National Weather Service alert is in effect."))}</p><small>${escapeHtml(timing)}</small></div></article>`;
  }).join("");
}

function renderReport(report, fromCache = false) {
  state.report = report;
  state.reportFromCache = fromCache;
  $("dateLabel").textContent = `${report.dateLabel} · Grades 3–4`;
  renderDayContext();
  renderRows(report.hours);
  renderHomeConditions(report);
  updateFreshnessUI();
  updateFooter();
}

async function loadForecast() {
  const parts = chicagoParts(), dateKey = localDateKey(parts), cached = readCache(dateKey);
  state.alertsAvailable = null;
  renderAlerts([]);
  try {
    const [gridResult, alertsResult] = await Promise.allSettled([fetchJson(CONFIG.gridUrl), fetchJson(CONFIG.alertsUrl, 8000)]);
    state.alertsAvailable = alertsResult.status === "fulfilled";
    renderAlerts(alertsResult.status === "fulfilled" ? alertsResult.value.features : []);
    if (gridResult.status !== "fulfilled") throw gridResult.reason;
    const properties = gridResult.value.properties || {};
    const retrievedAt = new Date().toISOString();
    const report = { dateKey, dateLabel: localDateLabel(), retrievedAt, issuedAt: properties.updateTime || properties.updated || null, updatedAt: retrievedAt, currentHour: buildCurrentHour(properties, parts), hours: buildHours(properties, parts) };
    if (report.hours.some((hour) => hour.wbgt !== null)) saveCache(report);
    renderReport(report);
  } catch (error) {
    if (cached) { renderReport(cached, true); $("notice").textContent = "Showing the last saved forecast because the NWS feed did not respond."; }
    else {
      const empty = CONFIG.hours.map((hour) => ({ hour, label: hourLabel(hour), temperature: null, heatIndex: null, wbgt: null }));
      const retrievedAt = new Date().toISOString();
      renderReport({ dateKey, dateLabel: localDateLabel(), retrievedAt, issuedAt: null, updatedAt: retrievedAt, currentHour: { hour: parts.hour, label: hourLabel(parts.hour), temperature: null, heatIndex: null, wbgt: null }, hours: empty });
      $("notice").textContent = error?.name === "AbortError" ? "The NWS request timed out. Tap refresh to try again." : "The NWS feed did not respond. Tap refresh to try again.";
    }
  }
}

function renderNextGame(game) {
  state.nextGame = game;
  if (!game) {
    $("nextGameTitle").textContent = "Season Complete";
    $("nextGameBadge").textContent = "Go Rams";
    $("nextGameMeta").textContent = "The 2026 Pee Wee schedule is complete.";
    $("gameWeather").innerHTML = '<p class="empty-state">Thanks for a great season.</p>';
    $("nextGameActions").innerHTML = '<button type="button" data-open-view="schedule">View Season</button>';
    return;
  }
  const formatted = formatGameDate(game), venue = gameVenue(game);
  const opponentText = game.opponent === "Playoffs" || game.opponent === "Super Bowl" ? game.opponent : `${game.side === "away" ? "@" : "vs"} ${game.opponent}`;
  $("nextGameTitle").textContent = opponentText;
  $("nextGameBadge").textContent = game.side === "home" ? "Home" : game.side === "away" ? "Away" : "Postseason";
  $("nextGameMeta").textContent = `${formatted.day} · ${formatted.time}${game.timeAssumed ? " · Time unconfirmed" : ""}${venue ? ` · ${venue.name}` : " · Location TBD"}`;
  $("nextGameActions").innerHTML = `${venue ? `<a class="gold-action" href="${mapsUrl(venue)}" target="_blank" rel="noopener">Directions</a>` : ""}<button type="button" data-calendar-game="${game.id}">Add to Calendar</button><button type="button" data-open-view="schedule">Full Schedule</button>`;
}

async function loadGameWeather(game) {
  state.gameWeatherAvailable = null;
  if (!game) return;
  if (!game.time) { $("gameWeather").innerHTML = '<p class="empty-state">Game-day weather will appear after the kickoff time is announced.</p>'; return; }
  const venue = gameVenue(game);
  if (!venue) { $("gameWeather").innerHTML = '<p class="empty-state">Game-day weather will appear after the location is announced.</p>'; return; }
  const start = gameStart(game), diffDays = (start.getTime() - Date.now()) / 86400000;
  if (diffDays > 7.5) {
    const opens = new Date(start.getTime() - 7 * 86400000);
    const label = new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.timeZone, month: "short", day: "numeric" }).format(opens);
    $("gameWeather").innerHTML = `<p class="empty-state">Game-day forecast becomes available around ${label}. The card will update automatically.</p>`;
    return;
  }
  if (diffDays < -1) return;
  $("gameWeather").innerHTML = '<p class="empty-state">Loading game-day weather…</p>';
  try {
    const point = await fetchJson(`https://api.weather.gov/points/${venue.lat},${venue.lon}`);
    const [hourly, grid] = await Promise.all([fetchJson(point.properties.forecastHourly), fetchJson(point.properties.forecastGridData)]);
    const period = hourly.properties.periods.find((item) => start >= new Date(item.startTime) && start < new Date(item.endTime)) || hourly.properties.periods.find((item) => Math.abs(new Date(item.startTime).getTime() - start.getTime()) < 3600000);
    if (!period) throw new Error("No game-hour forecast");
    const wbgt = valueAt(grid.properties.wetBulbGlobeTemperature, start), rain = period.probabilityOfPrecipitation?.value;
    const issuedAt = grid.properties.updateTime || hourly.properties.updateTime || hourly.properties.generatedAt || null;
    const retrievedAt = new Date().toISOString();
    state.gameWeatherAvailable = true;
    $("gameWeather").innerHTML = `<div class="weather-grid">
      <div><small>Temperature</small><strong>${period.temperature}°</strong></div>
      <div><small>Rain</small><strong>${rain === null || rain === undefined ? "—" : `${rain}%`}</strong></div>
      <div><small>${wbgt === null ? "Wind" : "WBGT"}</small><strong>${wbgt === null ? escapeHtml(period.windSpeed) : formatWbgt(wbgt)}</strong></div>
    </div><p class="weather-summary">${escapeHtml(period.shortForecast)} · Wind ${escapeHtml(period.windSpeed)} ${escapeHtml(period.windDirection)}</p><p class="weather-freshness">${issuedAt ? `NWS grid updated ${escapeHtml(formatSourceTime(issuedAt))} · ` : ""}Retrieved ${escapeHtml(formatSourceTime(retrievedAt))}</p>`;
  } catch {
    state.gameWeatherAvailable = false;
    $("gameWeather").innerHTML = '<p class="empty-state">The NWS game-day forecast is temporarily unavailable. Tap refresh to try again.</p>';
  }
}

function mapsUrl(venue) { return `https://maps.apple.com/?daddr=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`; }

function renderVenueVerificationList() {
  $("venueVerificationList").innerHTML = Object.values(VENUES).map((venue) => `<article class="venue-verification">
    <div><strong>${escapeHtml(venue.name)}</strong><p>${escapeHtml(venue.address)}</p><small>${escapeHtml(venue.destinationType)} · Verified Aug. 18, 2026 · ${escapeHtml(venue.sourceLabel)}</small></div>
    <div class="venue-links"><a href="${escapeHtml(venue.sourceUrl)}" target="_blank" rel="noopener">Source</a><a href="${mapsUrl(venue)}" target="_blank" rel="noopener">Directions</a></div>
  </article>`).join("");
}

function renderSchedule() {
  $("scheduleRows").innerHTML = GAMES.map((game) => {
    const formatted = formatGameDate(game), venue = gameVenue(game), postseason = game.postseason ? " postseason" : "", side = game.side === "home" ? "home" : "away";
    const opponentText = game.opponent === "Playoffs" || game.opponent === "Super Bowl" ? game.opponent : `${game.side === "away" ? "@" : "vs"} ${game.opponent}`;
    return `<article class="schedule-card ${side}${postseason}">
      <div class="schedule-top"><div><span class="week-label">${game.week}${game.conference ? " · Conference" : game.postseason ? " · Postseason" : ""}</span><h3>${opponentText}</h3></div><div class="schedule-date">${formatted.day}<span>${formatted.time}</span></div></div>
      <div class="schedule-actions">${venue ? `<a class="gold-action" href="${mapsUrl(venue)}" target="_blank" rel="noopener">Directions</a>` : ""}<button type="button" data-calendar-game="${game.id}">Add to Calendar</button></div>
    </article>`;
  }).join("");
}

function icsEscape(value) { return String(value || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }
function icsDateTime(date) { return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
function compactDate(key) { return key.replace(/-/g, ""); }
function nextDateKey(key) { const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); }

function gameIcsBlock(game) {
  const venue = gameVenue(game), title = game.opponent === "Playoffs" || game.opponent === "Super Bowl" ? `Riverton Pee Wee ${game.opponent}` : `Riverton Rams ${game.side === "away" ? "at" : "vs"} ${game.opponent}`;
  const dates = game.time ? `DTSTART:${icsDateTime(gameStart(game))}\r\nDTEND:${icsDateTime(gameEnd(game))}` : `DTSTART;VALUE=DATE:${compactDate(game.date)}\r\nDTEND;VALUE=DATE:${compactDate(nextDateKey(game.date))}`;
  const description = game.timeAssumed ? "Riverton Pee Wee football. The 6 PM kickoff is assumed, not confirmed. Verify all schedule changes with the team." : "Riverton Pee Wee football. Verify schedule changes with the team.";
  return `BEGIN:VEVENT\r\nUID:${game.id}-2026@riverton-football-hub\r\nDTSTAMP:${icsDateTime(new Date())}\r\n${dates}\r\nSUMMARY:${icsEscape(title)}\r\nLOCATION:${icsEscape(venue ? `${venue.name}, ${venue.address}` : "TBD")}\r\nDESCRIPTION:${icsEscape(description)}\r\n${game.timeAssumed ? "STATUS:TENTATIVE\r\n" : ""}END:VEVENT`;
}

function downloadCalendar(games, fileName) {
  const body = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Riverton Football Hub//Pee Wee 2026//EN\r\nCALSCALE:GREGORIAN\r\n${games.map(gameIcsBlock).join("\r\n")}\r\nEND:VCALENDAR\r\n`;
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" })), link = document.createElement("a");
  link.href = url; link.download = fileName; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("notice").textContent = games.length > 1 ? "Season calendar downloaded. Open it to add the games." : "Game calendar file downloaded. Open it to add the event.";
}

function switchView(view) {
  state.activeView = view;
  document.querySelectorAll(".app-view").forEach((section) => { const active = section.id === `view-${view}`; section.hidden = !active; section.classList.toggle("active", active); });
  document.querySelectorAll(".bottom-nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("brandHeader").hidden = view !== "home";
  $("hubTitleRow").hidden = view !== "home";
  $("forceRefreshButton").hidden = view !== "home";
  renderAlerts();
  updateFreshnessUI();
  updateFooter();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function refreshHub() {
  if (state.loading) return;
  state.loading = true; $("refreshTop").classList.add("loading"); $("refreshButton").textContent = "Refreshing…"; $("refreshButton").disabled = true; $("notice").textContent = "Refreshing conditions and game-day weather…";
  const game = nextGame(); renderNextEvent(); renderNextGame(game);
  await Promise.allSettled([loadForecast(), loadGameWeather(game)]);
  state.loading = false; $("refreshTop").classList.remove("loading"); $("refreshButton").textContent = "Refresh Forecast"; $("refreshButton").disabled = false;
  if ($("notice").textContent === "Refreshing conditions and game-day weather…") $("notice").textContent = "";
}

async function forceRefreshAll() {
  const button = $("forceRefreshButton");
  if (button.disabled || state.loading) return;
  button.disabled = true;
  button.textContent = "Checking for Updates…";
  $("notice").textContent = "Checking the app and every live data source…";
  try {
    const appCheck = await fetch(`./manifest.webmanifest?force=${Date.now()}`, { cache: "no-store" });
    if (!appCheck.ok || appCheck.headers.get("X-Riverton-Cache") === "saved") throw new Error("App host unavailable");
    const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    if (registration) await registration.update();
    await refreshHub();
    const incomplete = state.reportFromCache || state.alertsAvailable === false || state.gameWeatherAvailable === false || !state.report;
    $("notice").textContent = incomplete ? "Reloading the app. One or more live sources remain unavailable, so saved-data warnings will stay visible." : "All live data refreshed. Reloading the latest app version…";
    button.textContent = "Reloading…";
    const url = new URL(window.location.href);
    url.searchParams.set("refresh", String(Date.now()));
    window.setTimeout(() => window.location.replace(url.toString()), 350);
  } catch {
    $("notice").textContent = "A full refresh could not reach the app server. Saved data was retained; try again when the connection improves.";
    button.disabled = false;
    button.textContent = "Force Refresh All Data";
  }
}

$("refreshTop").addEventListener("click", refreshHub);
$("refreshButton").addEventListener("click", refreshHub);
$("forceRefreshButton").addEventListener("click", forceRefreshAll);
$("addSeasonButton").addEventListener("click", () => downloadCalendar(GAMES, "riverton-pee-wee-2026.ics"));

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view], [data-open-view]");
  if (viewButton) { switchView(viewButton.dataset.view || viewButton.dataset.openView); return; }
  const calendarButton = event.target.closest("[data-calendar-game]");
  if (calendarButton) { const game = GAMES.find((item) => item.id === calendarButton.dataset.calendarGame); if (game) downloadCalendar([game], `riverton-${game.id}.ics`); return; }
  const hourJump = event.target.closest("[data-hour-jump]");
  if (hourJump) { state.selectedHour = Number(hourJump.dataset.hourJump); switchView("conditions"); renderRows(state.report?.hours || []); setTimeout(() => document.getElementById(`guidance-${state.selectedHour}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 220); }
});

$("hourRows").addEventListener("click", (event) => {
  const button = event.target.closest(".hour-row");
  if (!button) return;
  const hour = Number(button.dataset.hour); state.selectedHour = state.selectedHour === hour ? null : hour;
  renderRows(state.report?.hours || CONFIG.hours.map((item) => ({ hour: item, label: hourLabel(item), temperature: null, heatIndex: null, wbgt: null })));
  if (state.selectedHour !== null) document.getElementById(`guidance-${state.selectedHour}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

renderSchedule();
renderVenueVerificationList();
renderNextEvent();
renderDayContext();
renderNextGame(nextGame());
renderRows(CONFIG.hours.map((hour) => ({ hour, label: hourLabel(hour), temperature: null, heatIndex: null, wbgt: null })));
refreshHub();

setInterval(updateFreshnessUI, 60000);

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
