// Cần cài 2 package trước khi chạy:
//   npm install telegraf dotenv

require("dotenv").config();
const { Telegraf } = require("telegraf");
const { findLongestPattern1d } = require("./findLongestPattern1d.js");

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ Thiếu TELEGRAM_BOT_TOKEN. Tạo file .env với dòng: TELEGRAM_BOT_TOKEN=xxx");
  process.exit(1);
}

const bot = new Telegraf(token);

bot.on("text", async (ctx) => {
  const message = ctx.message.text.toLowerCase().trim();

  if (!message.startsWith("find1d")) return;

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

  // ========================= FORMAT TELEGRAM MESSAGE =========================
  let response1d = `📊 *LỊCH SỬ PATTERNS TÌM ĐƯỢC*\n\n`;

  statsHistory1d.forEach((item, index) => {
    const score = item.countUp - item.countDown;
    response1d += `*${index + 1}. Length ${item.length}:*\n`;
    response1d += `Pattern: \`${item.pattern}\`\n`;
    response1d += `Xuất hiện: ${item.total} lần\n`;
    response1d += `📈 Up: ${item.up}% (${item.countUp}) | Down: ${item.down}% (${item.countDown})\n`;
    response1d += `📊 Score: ${score}\n\n`;
  });

  // Lưu ý: phần "TÍN HIỆU DỰ ĐOÁN" (signalText/signalEmoji) trong bản gốc
  // dùng biến chưa từng được khai báo -> mình bỏ tạm phần này để bot không bị lỗi.
  // Báo lại nếu bạn muốn mình xây phần tổng hợp tín hiệu dự đoán từ statsHistory1d.

  // ========================= SEND TELEGRAM =========================
  if (response1d.length > 4096) {
    const chunks1d = response1d.match(/[\s\S]{1,4096}/g);
    for (const chunk1d of chunks1d) {
      await ctx.replyWithMarkdown(chunk1d);
    }
  } else {
    await ctx.replyWithMarkdown(response1d);
  }
});

bot.launch();
console.log("🤖 Bot 1d đã khởi động. Gõ 'find1d' trong Telegram để chạy.");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
