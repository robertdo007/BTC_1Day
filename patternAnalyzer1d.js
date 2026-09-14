const { getHourlyCandles, MAX_DAYS } = require("./hourlyCache.js");

const nyDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toNYDateString(ms) {
  return nyDateFormatter.format(new Date(ms));
}

/**
 * Lấy pattern up/down của N ngày gần nhất, cắt ngày theo giờ New York.
 * Data nến giờ lấy từ cache (getHourlyCandles) — chỉ thật sự gọi Binance
 * 1 LẦN MỖI NGÀY, các lần gọi sau trong ngày dùng lại cache, không tốn API call.
 *
 * direction mỗi ngày = so open vs close CỦA CHÍNH NGÀY ĐÓ.
 */
async function getPatternString1d(a) {
  if (a > MAX_DAYS - 2) {
    throw new Error(
      `a=${a} vượt quá giới hạn cache (MAX_DAYS=${MAX_DAYS}). Tăng MAX_DAYS trong hourlyCache.js nếu cần pattern dài hơn.`
    );
  }

  const hourly = await getHourlyCandles();

  // Gộp theo ngày NY: open = open giờ đầu ngày gặp, close = close giờ cuối ngày gặp
  const dayMap = new Map();
  for (const candle of hourly) {
    const openTime = candle[0];
    const open = parseFloat(candle[1]);
    const close = parseFloat(candle[4]);
    const key = toNYDateString(openTime);

    if (!dayMap.has(key)) {
      dayMap.set(key, { open, close, count: 1 });
    } else {
      const d = dayMap.get(key);
      d.close = close;
      d.count += 1;
    }
  }

  // Chỉ giữ ngày đủ >=23 giờ (loại ngày hôm nay chưa xong + ngày đầu bị cắt dở)
  const days = Array.from(dayMap.entries())
    .filter(([, d]) => d.count >= 23)
    .sort((x, y) => (x[0] < y[0] ? -1 : 1));

  const directions = days.map(([, d]) => {
    const { open, close } = d;
    return open > close ? "down" : open < close ? "up" : "flat";
  });

  const lastN = directions.slice(-a);
  return lastN.join(" ");
}

module.exports = { getPatternString1d };

if (require.main === module) {
  const days = parseInt(process.argv[2] || "10", 10);
  getPatternString1d(days)
    .then((result) => console.log(`Pattern ${days} ngày (giờ NY):`, result))
    .catch((err) => console.error("Lỗi:", err.message));
}
