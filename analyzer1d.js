const fs = require("fs");

function analyzePattern1d(patternArray) {
  const inputFile = "btc_analysis.csv";

  if (!fs.existsSync(inputFile)) {
    return { error: "Không tìm thấy file dữ liệu btc_analysis.csv" };
  }

  const raw = fs.readFileSync(inputFile, "utf8").trim();
  const lines = raw.split("\n");
  const data = lines.slice(1).map(line => {
    const [date, close, change, changePercent, direction] = line.split(",");
    return { date, close, direction, change: parseFloat(change), changePercent: parseFloat(changePercent) };
  });

  let total = 0, up = 0, down = 0, flat = 0;

  for (let i = 0; i <= data.length - patternArray.length - 1; i++) {
    let match = true;
    for (let j = 0; j < patternArray.length; j++) {
      if (data[i + j].direction !== patternArray[j]) {
        match = false;
        break;
      }
    }

    if (match) {
      const nextDay = data[i + patternArray.length];
      total++;
      if (nextDay.direction === "up") up++;
      else if (nextDay.direction === "down") down++;
      else flat++;
    }
  }

  return {
    pattern: patternArray.join(" "),
    total,
    stats: total > 0 ? {
      up: ((up / total) * 100).toFixed(2),
      down: ((down / total) * 100).toFixed(2),
      flat: ((flat / total) * 100).toFixed(2),
      countUp: up,
      countDown: down,
      countFlat: flat
    } : null
  };
}

module.exports = { analyzePattern1d };

// Cho phép chạy trực tiếp để test nhanh:
//   node analyzePattern1d.js up up down
if (require.main === module) {
  const patternArray = process.argv.slice(2);
  if (patternArray.length === 0) {
    console.error("Cách dùng: node analyzePattern1d.js up up down ...");
    process.exit(1);
  }
  const result = analyzePattern1d(patternArray);
  console.log(JSON.stringify(result, null, 2));
}
