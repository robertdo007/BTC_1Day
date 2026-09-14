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



  // ========================= LỆNH 2: TỰ NHẬP PATTERN (check1d) =========================
  if (message.startsWith("check1d ")) {
    const patternStr = message.replace("check1d ", "").trim();
    
    // Tách chuỗi thành mảng và lọc các giá trị hợp lệ (chỉ nhận up, down, flat)
    const fullPatternArray = patternStr.split(/\s+/).filter(p => ["up", "down", "flat"].includes(p));

    if (fullPatternArray.length === 0) {
      return ctx.reply("❌ Cú pháp sai.\n\nHãy nhập ví dụ:\n`check1d up down up up down down up up`", { parse_mode: "Markdown" });
    }

    let responseCustom = `📊 *KẾT QUẢ PATTERN (TỪ DÀI ĐẾN NGẮN)*\n\n`;

    // Lặp để cắt dần chuỗi từ trái sang phải
    for (let i = 0; i < fullPatternArray.length; i++) {
      const subPattern = fullPatternArray.slice(i);
      const result = analyzePattern1d(subPattern);

      if (result.error) {
        responseCustom += `❌ Lỗi ở chuỗi \`${subPattern.join(" ")}\`: ${result.error}\n\n`;
        continue;
      }

      if (result.total === 0) {
        responseCustom += `*Length ${subPattern.length}:* \`${subPattern.join(" ")}\`\n❌ KHÔNG tìm thấy trong lịch sử.\n\n`;
        continue;
      }

      const score = result.stats.countUp - result.stats.countDown;
      // Tính phần trăm hiệu chia tổng
      const scorePercent = ((score / result.total) * 100).toFixed(2);
      responseCustom += `*Length ${subPattern.length}:*\n`;
      responseCustom += `Pattern: \`${result.pattern}\`\n`;
      responseCustom += `Xuất hiện: ${result.total} lần\n`;
      responseCustom += `📈 Up: ${result.stats.up}% (${result.stats.countUp}) | Down: ${result.stats.down}% (${result.stats.countDown})\n`;
      // Cập nhật dòng Score hiển thị thêm Hiệu/Tổng và %
      responseCustom += `📊 Score: ${score}/${result.total} (${scorePercent}%)\n\n`;
    }

    // Nếu tin nhắn quá dài so với giới hạn của Telegram (4096 ký tự), cắt nhỏ ra để gửi
    if (responseCustom.length > 4096) {
      const chunks = responseCustom.match(/[\s\S]{1,4096}/g);
      for (const chunk of chunks) {
        await ctx.replyWithMarkdown(chunk);
      }
    } else {
      await ctx.replyWithMarkdown(responseCustom);
    }
    return;
  }
});

bot.launch();
console.log("🤖 Bot 1d đã khởi động.");
console.log("👉 Gõ 'find1d' để tự động quét pattern.");
console.log("👉 Gõ 'check1d up down up...' để kiểm tra pattern thủ công.");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
