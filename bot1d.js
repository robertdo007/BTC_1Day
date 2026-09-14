// Cần cài 2 package trước khi chạy:
//   npm install telegraf dotenv

require("dotenv").config();
const { Telegraf } = require("telegraf");
const { findLongestPattern1d } = require("./findLongestPattern1d.js");
const { analyzePattern1d } = require("./analyzer1d.js"); // Thêm import hàm phân tích thủ công

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ Thiếu TELEGRAM_BOT_TOKEN. Tạo file .env với dòng: TELEGRAM_BOT_TOKEN=xxx");
  process.exit(1);
}

const bot = new Telegraf(token);

bot.on("text", async (ctx) => {
  const message = ctx.message.text.toLowerCase().trim();

  // ========================= LỆNH 1: TỰ ĐỘNG TÌM PATTERN (find1d) =========================
  if (message === "find1d") {
    await ctx.reply("⏳ Đang tìm pattern 1d dài nhất... Vui lòng chờ");

    let statsHistory1d;
    try {
      statsHistory1d = await findLongestPattern1d();
    } catch (err) {
      console.error(err);
      return ctx.reply(`❌ Lỗi khi lấy dữ liệu: ${err.message}`);
    }

    if (statsHistory1d.length === 0) {
      return ctx.reply("❌ Không tìm thấy pattern nào");
    }

    let response1d = `📊 *LỊCH SỬ PATTERNS TÌM ĐƯỢC*\n\n`;

    statsHistory1d.forEach((item, index) => {
      const score = item.countUp - item.countDown;
      response1d += `*${index + 1}. Length ${item.length}:*\n`;
      response1d += `Pattern: \`${item.pattern}\`\n`;
      response1d += `Xuất hiện: ${item.total} lần\n`;
      response1d += `📈 Up: ${item.up}% (${item.countUp}) | Down: ${item.down}% (${item.countDown})\n`;
      response1d += `📊 Score: ${score}\n\n`;
    });

    if (response1d.length > 4096) {
      const chunks1d = response1d.match(/[\s\S]{1,4096}/g);
      for (const chunk1d of chunks1d) {
        await ctx.replyWithMarkdown(chunk1d);
      }
    } else {
      await ctx.replyWithMarkdown(response1d);
    }
    return; // Dừng xử lý sau khi phản hồi lệnh find1d
  }

  // ========================= LỆNH 2: TỰ NHẬP PATTERN (check1d) =========================
  if (message.startsWith("check1d ")) {
    const patternStr = message.replace("check1d ", "").trim();
    
    // Tách chuỗi thành mảng và lọc các giá trị hợp lệ (chỉ nhận up, down, flat)
    const patternArray = patternStr.split(/\s+/).filter(p => ["up", "down", "flat"].includes(p));

    if (patternArray.length === 0) {
      return ctx.reply("❌ Cú pháp sai.\n\nHãy nhập ví dụ:\n`check1d up down up up down down up up`", { parse_mode: "Markdown" });
    }

    // Gọi hàm analyze đã có sẵn để lấy số liệu từ file btc_analysis.csv
    const result = analyzePattern1d(patternArray);

    if (result.error) {
      return ctx.reply(`❌ Lỗi: ${result.error}`);
    }

    if (result.total === 0) {
      return ctx.reply(`❌ Pattern tự nhập (\`${patternArray.join(" ")}\`) KHÔNG tìm thấy trong lịch sử.`, { parse_mode: "Markdown" });
    }

    const score = result.stats.countUp - result.stats.countDown;
    let responseCustom = `📊 *KẾT QUẢ PATTERN TỰ NHẬP*\n\n`;
    responseCustom += `*Length ${patternArray.length}:*\n`;
    responseCustom += `Pattern: \`${result.pattern}\`\n`;
    responseCustom += `Xuất hiện: ${result.total} lần\n`;
    responseCustom += `📈 Up: ${result.stats.up}% (${result.stats.countUp}) | Down: ${result.stats.down}% (${result.stats.countDown})\n`;
    responseCustom += `📊 Score: ${score}\n`;

    return ctx.replyWithMarkdown(responseCustom);
  }
});

bot.launch();
console.log("🤖 Bot 1d đã khởi động.");
console.log("👉 Gõ 'find1d' để tự động quét pattern.");
console.log("👉 Gõ 'check1d up down up...' để kiểm tra pattern thủ công.");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
