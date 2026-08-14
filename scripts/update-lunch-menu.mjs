import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ORGANIZATION = 1681;
const SITE = 11709;
const API = `https://menus.healthepro.com/api/organizations/${ORGANIZATION}`;
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "lunch-menu.json");
const DAY = 86400000;

function dateKey(date) { return date.toISOString().slice(0, 10); }
function dateFromKey(key) { return new Date(`${key}T12:00:00Z`); }

function upcomingMonday() {
  if (process.env.MENU_START_DATE) return dateFromKey(process.env.MENU_START_DATE);
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const today = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12));
  const weekday = today.getUTCDay();
  const offset = weekday === 0 ? 1 : weekday >= 4 ? 8 - weekday : 1 - weekday;
  return new Date(today.getTime() + offset * DAY);
}

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Riverton-Football-Hub/1.0" } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function cleanName(value) {
  return String(value || "")
    .replace(/^\s*[•·-]\s*/, "")
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDay(entry, date) {
  if (!entry) return { date, closed: false, description: "", entrees: [], sides: [] };
  let setting;
  try { setting = typeof entry.setting === "string" ? JSON.parse(entry.setting) : entry.setting; }
  catch { setting = {}; }
  const dayOff = Array.isArray(setting?.days_off) ? setting.days_off[0] : setting?.days_off;
  if (dayOff?.status || dayOff?.description) return { date, closed: true, description: dayOff.description || "No school", entrees: [], sides: [] };
  const entrees = [], sides = [];
  let category = "";
  for (const item of setting?.current_display || []) {
    if (item.type === "category") { category = cleanName(item.name); continue; }
    if (item.type !== "recipe") continue;
    const isChoice = /^\s*[•·]/.test(String(item.name || ""));
    const name = cleanName(item.name);
    if (!name) continue;
    if (/lunch entree/i.test(category) && isChoice) entrees.push(name);
    else if (/lunch entree/i.test(category)) sides.push(name);
    else if (/vegetable|fruit|grain|misc/i.test(category)) sides.push(name);
  }
  return { date, closed: false, description: "", entrees: [...new Set(entrees)], sides: [...new Set(sides)] };
}

async function buildGrade(grade, menus, dates, months) {
  const pattern = grade === "3" ? /K-3 Lunch/i : /4-5 Lunch/i;
  const menu = menus.find((item) => pattern.test(item.public_name || item.name || "") && months.some((month) => item.published_months?.includes(month))) || menus.find((item) => pattern.test(item.public_name || item.name || ""));
  if (!menu) return { label: `${grade}${grade === "3" ? "rd" : "th"} grade`, sourceMenuName: "Not published", days: dates.map((date) => parseDay(null, date)) };
  const responses = await Promise.all(months.map((month) => {
    const [year, number] = month.split("-");
    return getJson(`${API}/menus/${menu.id}/year/${year}/month/${Number(number)}/date_overwrites`);
  }));
  const entries = responses.flatMap((response) => response.data || []), byDate = new Map(entries.map((entry) => [entry.day, entry]));
  return { label: `${grade}${grade === "3" ? "rd" : "th"} grade`, sourceMenuName: menu.public_name || menu.name, days: dates.map((date) => parseDay(byDate.get(date), date)) };
}

const monday = upcomingMonday();
const dates = Array.from({ length: 5 }, (_, index) => dateKey(new Date(monday.getTime() + index * DAY)));
const months = [...new Set(dates.map((date) => `${date.slice(0, 7)}-01`))];
const menuResponse = await getJson(`${API}/sites/${SITE}/menus/`);
const menus = menuResponse.data || [];
const [third, fourth] = await Promise.all([buildGrade("3", menus, dates, months), buildGrade("4", menus, dates, months)]);
const output = {
  source: "Health-e Pro / Riverton USD 404",
  sourceUrl: `https://menus.healthepro.com/organizations/${ORGANIZATION}`,
  generatedAt: new Date().toISOString(),
  weekStart: dates[0],
  weekEnd: dates[4],
  menus: { "3": third, "4": fourth }
};

await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Updated ${OUTPUT} for ${output.weekStart} through ${output.weekEnd}`);
