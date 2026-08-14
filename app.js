"use strict";

const CONFIG = {
  gridUrl: "https://api.weather.gov/gridpoints/SGF/17,28",
  alertsUrl: "https://api.weather.gov/alerts/active?point=37.071827,-94.704617",
  timeZone: "America/Chicago",
  hours: [16, 17, 18, 19, 20],
  cacheKey: "riverton-wbgt-v2"
};

const state = { report: null, loading: false };
const $ = (id) => document.getElementById(id);

function chicagoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CONFIG.timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return { year: get("year"), month: get("month"), day: get("day"), hour: Number(get("hour")) };
}

function localDateKey(parts) { return `${parts.year}-${parts.month}-${parts.day}`; }
function localDateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.timeZone, weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}

function chicagoOffset(parts) {
  const probe = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 18));
  const zone = new Intl.DateTimeFormat("en-US", { timeZone: CONFIG.timeZone, timeZoneName: "longOffset" }).formatToParts(probe).find((part) => part.type === "timeZoneName")?.value || "GMT-06:00";
  return zone.replace("GMT", "");
}

function targetDate(parts, hour) {
  return new Date(`${localDateKey(parts)}T${String(hour).padStart(2, "0")}:00:00${chicagoOffset(parts)}`);
}

function durationMs(value) {
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(value || "");
  if (!match) return 0;
  return ((Number(match[1] || 0) * 24 + Number(match[2] || 0)) * 60 * 60 + Number(match[3] || 0) * 60 + Number(match[4] || 0)) * 1000;
}

function valueAt(series, target) {
  if (!series?.values) return null;
  const targetMs = target.getTime();
  const item = series.values.find((entry) => {
    const [startText, span] = entry.validTime.split("/");
    const start = new Date(startText).getTime();
    const end = span?.startsWith("P") ? start + durationMs(span) : new Date(span).getTime();
    return targetMs >= start && targetMs < end;
  });
  if (item?.value === null || item?.value === undefined) return null;
  const value = Number(item.value);
  if (!Number.isFinite(value)) return null;
  return String(series.uom || "").includes("degC") ? value * 9 / 5 + 32 : value;
}

function tierFor(wbgt) {
  if (wbgt === null) return { short: "WAITING", decision: "Forecast unavailable", detail: "No NWS WBGT grid value is available for this hour yet.", color: "#8297ad", className: "waiting", range: "Waiting for NWS data", zone: "", rules: [] };
  if (wbgt >= 89.8) return {
    short: "CANCEL", decision: "No outdoor activity", detail: "Delay practice until a cooler WBGT is reached.", color: "#ff4054", className: "extreme", range: "89.8°F or higher", zone: "BLACK ZONE",
    rules: ["No outdoor activity.", "Delay practice or competition until a cooler WBGT is reached.", "All participants must have unrestricted access to water.", "A field reading taken 30–60 minutes before activity overrides this forecast."]
  };
  if (wbgt >= 87.8) return {
    short: "DELAY", decision: "Delay or reschedule", detail: "KSHSAA recommends waiting until a cooler WBGT is reached.", color: "#ff7a3d", className: "high", range: "87.8–89.7°F", zone: "RED ZONE",
    rules: ["Delay or reschedule until a cooler WBGT is reached.", "If activity takes place: 1 hour maximum, excluding rest breaks.", "Provide at least 20 total minutes of rest distributed throughout that hour.", "Have a cold-water immersion tub or other rapid-cooling method ready.", "Football: no protective equipment and no conditioning activities.", "All participants must have unrestricted access to water."]
  };
  if (wbgt >= 84.7) return {
    short: "MODIFY", decision: "Modify equipment and practice", detail: "Helmet and shoulder pads only; remove them for conditioning.", color: "#f4c348", className: "elevated", range: "84.7–87.7°F", zone: "ORANGE ZONE",
    rules: ["2 hours maximum, excluding rest breaks.", "Provide at least four separate 4-minute rest breaks each hour.", "Have a cold-water immersion tub or other rapid-cooling method ready.", "Football: limit equipment to helmets and shoulder pads; remove them for conditioning.", "If practice began in green or yellow and rises to orange, players may continue in full protective gear.", "All participants must have unrestricted access to water."]
  };
  if (wbgt >= 80) return {
    short: "CAUTION", decision: "Increase water and rest breaks", detail: "Use longer scheduled breaks and have rapid cooling ready.", color: "#d9d25e", className: "caution", range: "80.0–84.6°F", zone: "YELLOW ZONE",
    rules: ["Provide at least three separate 4-minute rest breaks each hour.", "Have a cold-water immersion tub or other rapid-cooling method ready.", "All participants must have unrestricted access to water.", "Monitor at-risk athletes more closely."]
  };
  return {
    short: "NORMAL", decision: "Normal practice precautions", detail: "Continue scheduled hydration and rest breaks.", color: "#4acb8a", className: "normal", range: "79.9°F or lower", zone: "GREEN ZONE",
    rules: ["Normal activities are permitted.", "Provide at least three separate rest breaks each hour, at least 3 minutes each.", "All participants must have unrestricted access to water.", "Continue monitoring athletes for heat-illness symptoms."]
  };
}

function formatTemp(value) { return value === null ? "—" : `${Math.round(value)}°`; }

async function fetchJson(url, timeout = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { headers: { Accept: "application/geo+json" }, cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`NWS returned ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

function buildHours(properties, parts) {
  return CONFIG.hours.map((hour) => {
    const target = targetDate(parts, hour);
    const heatIndex = valueAt(properties.heatIndex, target);
    return {
      label: `${hour - 12} PM`,
      temperature: valueAt(properties.temperature, target),
      heatIndex: heatIndex ?? valueAt(properties.apparentTemperature, target),
      wbgt: valueAt(properties.wetBulbGlobeTemperature, target)
    };
  });
}

function readCache(dateKey) {
  try { const cached = JSON.parse(localStorage.getItem(CONFIG.cacheKey) || "null"); return cached?.dateKey === dateKey ? cached : null; }
  catch { return null; }
}

function saveCache(report) {
  try { localStorage.setItem(CONFIG.cacheKey, JSON.stringify(report)); } catch { /* storage is optional */ }
}

function renderRows(hours) {
  $("hourRows").innerHTML = hours.map((hour) => {
    const tier = tierFor(hour.wbgt);
    return `<div class="hour-row"><strong>${hour.label}</strong><span>${formatTemp(hour.temperature)}</span><span>${formatTemp(hour.heatIndex)}</span><b class="row-${tier.className}">${formatTemp(hour.wbgt)}</b><em class="row-${tier.className}">${tier.short}</em></div>`;
  }).join("");
}

function renderAlerts(alerts) {
  const heatAlerts = (alerts || []).filter((feature) => /heat/i.test(feature.properties?.event || "")).slice(0, 1);
  $("alertArea").innerHTML = heatAlerts.map((feature) => `<div class="alert-card"><span class="alert-icon">!</span><div><strong>${feature.properties.event}</strong><p>${feature.properties.headline || "A National Weather Service heat alert is in effect."}</p></div></div>`).join("");
}

function renderReport(report, fromCache = false) {
  state.report = report;
  const validHours = report.hours.filter((hour) => hour.wbgt !== null);
  const governing = validHours.reduce((current, hour) => !current || hour.wbgt > current.wbgt ? hour : current, null);
  const tier = tierFor(governing?.wbgt ?? null);
  const card = $("decisionCard"); card.className = `decision-card ${tier.className}`;
  $("decisionTitle").textContent = tier.decision;
  $("decisionDetail").textContent = tier.detail;
  $("dateLabel").textContent = `${report.dateLabel} · Ages 8U`;
  if (governing) {
    $("zoneBlock").className = "zone-block";
    $("zoneBlock").innerHTML = `<span>Governing KSHSAA range</span><strong style="color:${tier.color}">${tier.zone} · ${tier.range}</strong>`;
    $("ruleRange").textContent = `${tier.zone} · ${tier.range}`;
    $("ruleTitle").textContent = tier.decision;
    $("ruleList").innerHTML = tier.rules.map((rule) => `<li>${rule}</li>`).join("");
    $("shareButton").disabled = false;
  } else {
    const ended = chicagoParts().hour >= 21;
    $("decisionTitle").textContent = ended ? "Today’s window has ended" : "NWS data temporarily unavailable";
    $("decisionDetail").textContent = ended ? "The NWS grid no longer includes the completed 4–8 PM hours. Check again tomorrow before practice." : "Tap refresh in a moment. The page will never stay stuck loading.";
    $("zoneBlock").className = "zone-block skeleton-line";
    $("zoneBlock").textContent = ended ? "No current 4–8 PM grid values" : "Tap Refresh forecast to retry";
    $("ruleRange").textContent = "No applicable range available";
    $("ruleTitle").textContent = "Practice modifications";
    $("ruleList").innerHTML = "";
    $("shareButton").disabled = true;
  }
  renderRows(report.hours);
  $("updatedLine").textContent = `${fromCache ? "Saved forecast" : `Updated ${new Date(report.updatedAt).toLocaleTimeString("en-US", { timeZone: CONFIG.timeZone, hour: "numeric", minute: "2-digit" })}`} · Forecast only · Not a field measurement`;
}

function renderLoading() {
  state.loading = true;
  $("refreshTop").classList.add("loading");
  $("refreshButton").textContent = "Refreshing…";
  $("refreshButton").disabled = true;
  $("decisionCard").className = "decision-card waiting";
  $("decisionTitle").textContent = "Checking the NWS forecast";
  $("decisionDetail").textContent = "Pulling the latest forecast grid for the Riverton athletic field.";
  $("zoneBlock").className = "zone-block skeleton-line";
  $("zoneBlock").textContent = "Loading NWS WBGT grid…";
}

function renderDone() {
  state.loading = false;
  $("refreshTop").classList.remove("loading");
  $("refreshButton").textContent = "Refresh forecast";
  $("refreshButton").disabled = false;
}

async function loadForecast() {
  if (state.loading) return;
  renderLoading(); $("notice").textContent = "";
  const parts = chicagoParts(), dateKey = localDateKey(parts), cached = readCache(dateKey);
  try {
    const [gridResult, alertsResult] = await Promise.allSettled([fetchJson(CONFIG.gridUrl), fetchJson(CONFIG.alertsUrl, 8000)]);
    if (gridResult.status !== "fulfilled") throw gridResult.reason;
    const report = { dateKey, dateLabel: localDateLabel(), updatedAt: new Date().toISOString(), hours: buildHours(gridResult.value.properties, parts) };
    if (report.hours.some((hour) => hour.wbgt !== null)) saveCache(report);
    renderReport(report);
    if (alertsResult.status === "fulfilled") renderAlerts(alertsResult.value.features);
  } catch (error) {
    if (cached) { renderReport(cached, true); $("notice").textContent = "Showing the last saved forecast because the NWS feed did not respond."; }
    else {
      const empty = CONFIG.hours.map((hour) => ({ label: `${hour - 12} PM`, temperature: null, heatIndex: null, wbgt: null }));
      renderReport({ dateKey, dateLabel: localDateLabel(), updatedAt: new Date().toISOString(), hours: empty });
      $("notice").textContent = error?.name === "AbortError" ? "The NWS request timed out. Tap refresh to try again." : "The NWS feed did not respond. Tap refresh to try again.";
    }
  } finally { renderDone(); }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  let line = "";
  for (const word of text.split(" ")) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) { ctx.fillText(line, x, y); line = `${word} `; y += lineHeight; }
    else line = test;
  }
  ctx.fillText(line, x, y); return y;
}

function fittedFont(ctx, text, weight, startSize, minSize, maxWidth) {
  let size = startSize;
  do { ctx.font = `${weight} ${size}px Arial`; size -= 2; } while (ctx.measureText(text).width > maxWidth && size >= minSize);
}

async function shareReport() {
  if (!state.report) return;
  const validHours = state.report.hours.filter((hour) => hour.wbgt !== null);
  const governing = validHours.reduce((current, hour) => !current || hour.wbgt > current.wbgt ? hour : current, null);
  if (!governing) return;
  const tier = tierFor(governing.wbgt), canvas = document.createElement("canvas"), scale = 2;
  canvas.width = 1080 * scale; canvas.height = 1500 * scale;
  const ctx = canvas.getContext("2d"); ctx.scale(scale, scale);
  ctx.fillStyle = "#061522"; ctx.fillRect(0, 0, 1080, 1500);
  ctx.fillStyle = "#003d7a"; ctx.fillRect(0, 0, 1080, 170);
  ctx.fillStyle = "#cac46b"; ctx.font = "900 39px Arial"; ctx.fillText("RIVERTON RAMS", 60, 72);
  ctx.fillStyle = "#ffffff"; ctx.font = "900 51px Arial"; ctx.fillText("PRACTICE CONDITIONS", 60, 133);
  ctx.fillStyle = tier.color; ctx.fillRect(0, 170, 18, 240);
  ctx.fillStyle = "#122b43"; ctx.fillRect(18, 170, 1062, 240);
  ctx.fillStyle = "#a9bbca"; ctx.font = "800 25px Arial"; ctx.fillText("PRACTICE GUIDANCE · 4–8 PM", 64, 226);
  ctx.fillStyle = "#ffffff"; fittedFont(ctx, tier.decision.toUpperCase(), 900, 58, 38, 940); ctx.fillText(tier.decision.toUpperCase(), 64, 310);
  ctx.fillStyle = tier.color; ctx.font = "900 31px Arial"; ctx.fillText(`${tier.zone} · ${tier.range}`, 64, 370);
  const xs = [62, 270, 465, 680, 850];
  ctx.fillStyle = "#7f94aa"; ctx.font = "800 22px Arial"; ["TIME", "AIR", "HEAT", "WBGT", "ACTION"].forEach((label, i) => ctx.fillText(label, xs[i], 480));
  state.report.hours.forEach((hour, index) => {
    const y = 558 + index * 108, rowTier = tierFor(hour.wbgt);
    ctx.strokeStyle = "#223c55"; ctx.beginPath(); ctx.moveTo(58, y + 34); ctx.lineTo(1022, y + 34); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.font = "800 32px Arial"; ctx.fillText(hour.label, xs[0], y); ctx.font = "600 32px Arial"; ctx.fillText(formatTemp(hour.temperature), xs[1], y); ctx.fillText(formatTemp(hour.heatIndex), xs[2], y);
    ctx.fillStyle = rowTier.color; ctx.font = "900 36px Arial"; ctx.fillText(formatTemp(hour.wbgt), xs[3], y); ctx.font = "900 24px Arial"; ctx.fillText(rowTier.short, xs[4], y);
  });
  ctx.fillStyle = "#112a41"; ctx.fillRect(48, 1120, 984, 285);
  ctx.fillStyle = "#cac46b"; ctx.font = "900 25px Arial"; ctx.fillText(`KSHSAA · ${tier.zone}`, 76, 1163);
  ctx.fillStyle = "#e4edf5"; ctx.font = "500 21px Arial";
  let ruleY = 1205;
  tier.rules.slice(0, 4).forEach((rule) => { ctx.fillStyle = tier.color; ctx.fillText("•", 76, ruleY); ctx.fillStyle = "#e4edf5"; ruleY = wrapText(ctx, rule, 103, ruleY, 880, 28) + 34; });
  ctx.fillStyle = "#8195a9"; ctx.font = "500 17px Arial"; ctx.fillText("Field WBGT reading 30–60 minutes before practice overrides this forecast.", 60, 1460);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const file = new File([blob], "riverton-rams-practice-conditions.png", { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: "Riverton Rams Practice Conditions", files: [file] });
    else { const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); $("notice").textContent = "Report image downloaded."; }
  } catch (error) { if (error?.name !== "AbortError") $("notice").textContent = "The image could not be shared. Try again."; }
}

$("refreshTop").addEventListener("click", loadForecast);
$("refreshButton").addEventListener("click", loadForecast);
$("shareButton").addEventListener("click", shareReport);
renderRows(CONFIG.hours.map((hour) => ({ label: `${hour - 12} PM`, temperature: null, heatIndex: null, wbgt: null })));
loadForecast();

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
