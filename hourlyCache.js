const fs = require("fs");

const BASE_URL = "https://data-api.binance.vision/api/v3/klines";
const SYMBOL = "BTCUSDT";
const INTERVAL = "1h";

const CACHE_FILE = "hourly_cache.json";
const MAX_DAYS = 400; // fetch sẵn 400 ngày, đủ dùng cho hầu hết độ dài pattern thực tế

const nyDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function todayNY() {
  return nyDateFormatter.format(new Date());
}

async function fetchHourlyKlinesRaw(startTime, endTime) {
  let candles = [];
  let cursor = startTime;

  while (cursor < endTime) {
    const url =
      `${BASE_URL}?symbol=${SYMBOL}&interval=${INTERVAL}&limit=1000&startTime=${cursor}&endTime=${endTime}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    const data = await res.json();
    if (data.length === 0) break;

    candles = candles.concat(data);
    cursor = data[data.length - 1][0] + 60 * 60 * 1000;

    if (data.length < 1000) break;
  }

  return candles;
}

/**
 * Lấy toàn bộ nến giờ MAX_DAYS ngày gần nhất, có cache theo ngày NY.
 * - Nếu cache tồn tại và được fetch TRONG NGÀY HÔM NAY (giờ NY) -> dùng lại, không gọi Binance.
 * - Nếu cache của ngày cũ (hoặc chưa có) -> xoá cache cũ, fetch mới, lưu lại.
 */
async function getHourlyCandles() {
  const today = todayNY();

  if (fs.existsSync(CACHE_FILE)) {
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (cache.cachedDateNY === today) {
      console.log(`📦 Dùng cache (đã fetch trong ngày ${today} giờ NY), không gọi lại Binance.`);
      return cache.candles;
    }
    console.log(`🗑️  Cache thuộc ngày ${cache.cachedDateNY}, đã cũ -> xoá và fetch lại cho ngày ${today}.`);
    fs.unlinkSync(CACHE_FILE);
  }

  console.log(`⏳ Fetch dữ liệu mới từ Binance (${MAX_DAYS} ngày gần nhất)...`);
  const now = Date.now();
  const startTime = now - MAX_DAYS * 24 * 60 * 60 * 1000;
  const candles = await fetchHourlyKlinesRaw(startTime, now);

  fs.writeFileSync(
    CACHE_FILE,
    JSON.stringify({ cachedDateNY: today, candles }),
    "utf8"
  );
  console.log(`✅ Đã fetch và lưu cache ${candles.length} cây nến giờ (ngày ${today}).`);

  return candles;
}

module.exports = { getHourlyCandles, MAX_DAYS };
