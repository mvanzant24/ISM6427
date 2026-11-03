const DEFAULT = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

const CODES = {
  0: ["Clear", "☀️", "🌙"], 1: ["Mostly Clear", "🌤️", "🌙"], 2: ["Partly Cloudy", "⛅", "☁️"],
  3: ["Cloudy", "☁️", "☁️"], 45: ["Fog", "🌫️", "🌫️"], 48: ["Fog", "🌫️", "🌫️"],
  51: ["Drizzle", "🌦️", "🌧️"], 53: ["Drizzle", "🌦️", "🌧️"], 55: ["Drizzle", "🌧️", "🌧️"],
  61: ["Light Rain", "🌦️", "🌧️"], 63: ["Rain", "🌧️", "🌧️"], 65: ["Heavy Rain", "🌧️", "🌧️"],
  71: ["Light Snow", "🌨️", "🌨️"], 73: ["Snow", "🌨️", "🌨️"], 75: ["Heavy Snow", "❄️", "❄️"],
  80: ["Showers", "🌦️", "🌧️"], 81: ["Showers", "🌧️", "🌧️"], 82: ["Heavy Showers", "⛈️", "⛈️"],
  95: ["Thunderstorm", "⛈️", "⛈️"], 96: ["Thunderstorm", "⛈️", "⛈️"], 99: ["Thunderstorm", "⛈️", "⛈️"],
};
const info = (code, day = 1) => {
  const c = CODES[code] || ["—", "🌡️", "🌡️"];
  return { text: c[0], icon: day ? c[1] : c[2] };
};

const $ = (id) => document.getElementById(id);
const r = Math.round;

async function load({ name, lat, lon }) {
  $("desc").textContent = "Loading…";
  const url = "https://api.open-meteo.com/v1/forecast?" + new URLSearchParams({
    latitude: lat, longitude: lon, timezone: "auto", forecast_days: 7,
    temperature_unit: "fahrenheit", wind_speed_unit: "mph",
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day",
    hourly: "temperature_2m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,uv_index_max",
  });

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    render(name, await res.json());
  } catch {
    $("desc").textContent = "Couldn't load weather.";
  }
}

function render(name, d) {
  const c = d.current, day = d.daily;
  const now = info(c.weather_code, c.is_day);

  $("city").textContent = name;
  $("temp").textContent = `${r(c.temperature_2m)}°`;
  $("desc").textContent = now.text;
  $("hilo").textContent = `H:${r(day.temperature_2m_max[0])}°  L:${r(day.temperature_2m_min[0])}°`;
  $("feels").textContent = `${r(c.apparent_temperature)}°`;
  $("humidity").textContent = `${c.relative_humidity_2m}%`;
  $("wind").textContent = `${r(c.wind_speed_10m)} mph`;
  $("uv").textContent = r(day.uv_index_max[0]);

  // Next 24 hours, starting at the current hour
  const start = d.hourly.time.findIndex((t) => t >= c.time.slice(0, 13));
  $("hourly").innerHTML = d.hourly.time.slice(start, start + 24).map((t, i) => {
    const j = start + i;
    const h = new Date(t).getHours();
    const label = i === 0 ? "Now" : `${h % 12 || 12}${h < 12 ? "AM" : "PM"}`;
    return `<div class="hour"><span>${label}</span>
      <span class="icon">${info(d.hourly.weather_code[j], d.hourly.is_day[j]).icon}</span>
      <span>${r(d.hourly.temperature_2m[j])}°</span></div>`;
  }).join("");

  // 7-day with range bars scaled to the week's min/max
  const lo = Math.min(...day.temperature_2m_min), hi = Math.max(...day.temperature_2m_max);
  const pct = (v) => ((v - lo) / (hi - lo || 1)) * 100;
  $("daily").innerHTML = day.time.map((t, i) => {
    const label = i === 0 ? "Today" : new Date(t + "T12:00").toLocaleDateString("en-US", { weekday: "short" });
    const mn = day.temperature_2m_min[i], mx = day.temperature_2m_max[i];
    return `<div class="day"><span>${label}</span><span>${info(day.weather_code[i]).icon}</span>
      <div class="range"><span class="lo">${r(mn)}°</span>
      <div class="bar"><span style="left:${pct(mn)}%;right:${100 - pct(mx)}%"></span></div>
      <span class="hi">${r(mx)}°</span></div></div>`;
  }).join("");
}

$("search").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("query").value.trim();
  if (!q) return;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(q)}`);
    const place = (await res.json()).results?.[0];
    if (!place) return ($("desc").textContent = "City not found.");
    $("query").value = "";
    load({ name: place.name, lat: place.latitude, lon: place.longitude });
  } catch {
    $("desc").textContent = "Search failed.";
  }
});

// Greeting
const hr = new Date().getHours();
const part = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
$("greeting").textContent = `${part}, Michelle`;

// Theme: light / dark / system, remembered per browser
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelectorAll(".themes button").forEach((b) =>
    b.classList.toggle("active", b.dataset.theme === t));
  try { localStorage.setItem("theme", t); } catch {}
}
document.querySelectorAll(".themes button").forEach((b) =>
  b.addEventListener("click", () => setTheme(b.dataset.theme)));
let saved = "system";
try { saved = localStorage.getItem("theme") || "system"; } catch {}
setTheme(saved);

load(DEFAULT);
