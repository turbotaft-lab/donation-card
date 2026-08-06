const { createCanvas, loadImage } = require('@napi-rs/canvas');

const WIDTH = 1200;
const HEIGHT = 400;
const PINK = '#FF2FD6';

async function getAvatarUrl(userId) {
  const res = await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
  const data = await res.json();
  return data?.data?.[0]?.imageUrl || null;
}

function drawCircleAvatar(ctx, img, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 8;
  ctx.strokeStyle = PINK;
  ctx.stroke();
}

function drawOutlinedText(ctx, text, x, y, fillStyle, font, align = 'center') {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
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

    const [donorAvatarUrl, recipientAvatarUrl] = await Promise.all([
      getAvatarUrl(donorId),
      getAvatarUrl(recipientId),
    ]);

    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const avatarR = 130, leftCx = 300, rightCx = WIDTH - 300, avatarCy = 160;

    if (donorAvatarUrl) drawCircleAvatar(ctx, await loadImage(donorAvatarUrl), leftCx, avatarCy, avatarR);
    if (recipientAvatarUrl) drawCircleAvatar(ctx, await loadImage(recipientAvatarUrl), rightCx, avatarCy, avatarR);

    drawOutlinedText(ctx, `@${donorName || 'Anonymous'}`, leftCx, avatarCy + avatarR + 45, '#FFFFFF', 'bold 42px sans-serif');
    drawOutlinedText(ctx, `@${recipientName || 'Unknown'}`, rightCx, avatarCy + avatarR + 45, '#FFFFFF', 'bold 42px sans-serif');

    const iconCx = WIDTH / 2 - 90, iconCy = 110;
    ctx.beginPath();
    ctx.moveTo(iconCx, iconCy - 40);
    ctx.lineTo(iconCx + 40, iconCy);
    ctx.lineTo(iconCx, iconCy + 40);
    ctx.lineTo(iconCx - 40, iconCy);
    ctx.closePath();
    ctx.fillStyle = PINK;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(iconCx, iconCy, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    drawOutlinedText(ctx, amount || '0', WIDTH / 2 + 40, iconCy, PINK, 'bold 76px sans-serif', 'left');
    drawOutlinedText(ctx, 'donated to', WIDTH / 2, 220, '#FFFFFF', 'bold 56px sans-serif');

    const buffer = await canvas.encode('png');
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
};
