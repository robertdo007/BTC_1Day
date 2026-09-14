const { getPatternString1d } = require("./patternAnalyzer1d.js");
const { analyzePattern1d } = require("./analyzer1d.js");

async function findLongestPattern1d() {
  let a = 1;
  let statsHistory = [];

  while (true) {
    console.log(`\n⏳ Đang lấy pattern 1d với length = ${a}...`);
    const pattern = await getPatternString1d(a);
    console.log(`📊 Pattern 1d: ${pattern}`);

    const patternArray = pattern.split(" ");
    const result = analyzePattern1d(patternArray);

    if (result.total === 0) {
      console.log(`❌ Pattern 1d này KHÔNG tìm thấy trong lịch sử`);
      break;
    } else {
      console.log(`✅ Pattern 1d tìm thấy ${result.total} lần`);

      statsHistory.push({
        length: a,
        pattern: pattern,
        up: result.stats.up,
        down: result.stats.down,
        countUp: result.stats.countUp,
        countDown: result.stats.countDown,
        total: result.total
      });

      a++;
    }
  }

  return statsHistory;
}

module.exports = { findLongestPattern1d };

if (require.main === module) {
  findLongestPattern1d()
    .then((statsHistory) => {
      console.log("\n=== KẾT QUẢ ===");
      console.log(JSON.stringify(statsHistory, null, 2));
    })
    .catch((err) => console.error("Lỗi:", err.message));
}
