const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { fontBase64, iconBase64 } = require('./assets');

const FONT = 'PoppinsExtraBold';
GlobalFonts.register(Buffer.from(fontBase64, 'base64'), FONT);

const WIDTH = 2000;
const HEIGHT = 600;

function getThemeColor(amount) {
  if (amount >= 10000) return '#ff0000';
  if (amount >= 1000) return '#ff2f8b';
  return '#d020f0';
}

async function getAvatarUrl(userId) {
  const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
  const data = await res.json();
  return data?.data?.[0]?.imageUrl || null;
}

function drawBackground(ctx, color) {
  // Solid white background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Gradient on top
  const gradient = ctx.createLinearGradient(0, HEIGHT, 0, 0);
  gradient.addColorStop(0, color + "CC");
  gradient.addColorStop(1, color + "00");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawCircleAvatar(ctx, img, cx, cy, r, color) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function drawOutlinedText(ctx, text, x, y, fillStyle, fontSize, align = 'center') {
  ctx.font = `${fontSize}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = fontSize * 0.14;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000000';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);
}

module.exports = async (req, res) => {
  try {
    const { donorId, donorName, recipientId, recipientName, amount } = req.query;
    if (!donorId || !recipientId) {
      res.status(400).send('Missing donorId or recipientId');
      return;
    }

    const amountNum = parseInt(amount, 10) || 0;
    const themeColor = getThemeColor(amountNum);
    const amountFormatted = amountNum.toLocaleString('en-US');

    const [donorAvatarUrl, recipientAvatarUrl] = await Promise.all([
      getAvatarUrl(donorId),
      getAvatarUrl(recipientId),
    ]);

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, themeColor);

    const avatarR = 170, leftCx = 400, rightCx = WIDTH - 400, avatarCy = 230;

    if (donorAvatarUrl) drawCircleAvatar(ctx, await loadImage(donorAvatarUrl), leftCx, avatarCy, avatarR, themeColor);
    if (recipientAvatarUrl) drawCircleAvatar(ctx, await loadImage(recipientAvatarUrl), rightCx, avatarCy, avatarR, themeColor);

    drawOutlinedText(ctx, `@${donorName || 'Anonymous'}`, leftCx, avatarCy + avatarR + 60, '#FFFFFF', 48);
    drawOutlinedText(ctx, `@${recipientName || 'Unknown'}`, rightCx, avatarCy + avatarR + 60, '#FFFFFF', 48);

    const iconImg = await loadImage(Buffer.from(iconBase64, 'base64'));
    const iconSize = 110;
    ctx.drawImage(iconImg, WIDTH / 2 - 250, 175 - iconSize / 2, iconSize, iconSize);

    drawOutlinedText(ctx, amountFormatted, WIDTH / 2 - 100, 175, themeColor, 100, 'left');
    drawOutlinedText(ctx, 'donated to', WIDTH / 2, 320, '#FFFFFF', 80);

    const buffer = await canvas.encode('png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
};
