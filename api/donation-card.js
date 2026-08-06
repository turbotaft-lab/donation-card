const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

GlobalFonts.registerFromPath(path.join(process.cwd(), 'fonts/Poppins-ExtraBold.ttf'), 'PoppinsExtraBold');

const WIDTH = 2000;
const HEIGHT = 600;
const FONT = 'PoppinsExtraBold';

function getThemeColor(amount) {
  if (amount >= 10000) return '#FF3B3B'; // red
  if (amount >= 1000) return '#FF2FD6';  // pink
  return '#A020F0';                       // purple (covers 100-999 and below)
}

async function getAvatarUrl(userId) {
  const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
  const data = await res.json();
  return data?.data?.[0]?.imageUrl || null;
}

function drawBackground(ctx, color) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#FFFFFF');
  gradient.addColorStop(1, color + '33'); // theme color at low opacity
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

// Octagon-based Robux-style icon, drawn from scratch (not a copy of Roblox's actual logo asset)
function drawRobuxIcon(ctx, cx, cy, size, color) {
  const sides = 8;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI / sides) + (i * 2 * Math.PI / sides);
    const px = cx + size * Math.cos(angle);
    const py = cy + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#000000';
  ctx.fill();

  const inner = size * 0.82;
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI / sides) + (i * 2 * Math.PI / sides);
    const px = cx + inner * Math.cos(angle);
    const py = cy + inner * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  const boxSize = size * 0.55;
  const boxR = boxSize * 0.22;
  ctx.beginPath();
  ctx.roundRect(cx - boxSize / 2, cy - boxSize / 2, boxSize, boxSize, boxR);
  ctx.fillStyle = '#000000';
  ctx.fill();

  const dotR = size * 0.14;
  ctx.beginPath();
  ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
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

    const iconCx = WIDTH / 2 - 190, iconCy = 175;
    drawRobuxIcon(ctx, iconCx, iconCy, 55, themeColor);

    drawOutlinedText(ctx, amountFormatted, WIDTH / 2 - 100, iconCy, themeColor, 100, 'left');
    drawOutlinedText(ctx, 'donated to', WIDTH / 2, 320, '#FFFFFF', 80);

    const buffer = await canvas.encode('png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
};
