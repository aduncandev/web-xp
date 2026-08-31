export function drawDarkBox(ctx, sprites, x1, y1, x2, y2, t) {
  const top = sprites.textboxTop;
  const left = sprites.textboxLeft;
  const corner = sprites.textboxCorner;
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(x1 + 20, y1 + 20, x2 - x1 - 40, y2 - y1 - 40);
  const innerW = x2 - x1 - 63;
  const innerH = y2 - y1 - 63;
  if (innerW > 0) {
    ctx.drawImage(top.img, 0, 0, 1, 16, x1 + 32, y1, innerW, 32);
    ctx.save();
    ctx.translate(x1 + 32, y2 + 1);
    ctx.scale(1, -1);
    ctx.drawImage(top.img, 0, 0, 1, 16, 0, 0, innerW, 32);
    ctx.restore();
  }
  if (innerH > 0) {
    ctx.drawImage(left.img, 0, 0, 16, 1, x1, y1 + 32, 32, innerH);
    ctx.save();
    ctx.translate(x2 + 1, y1 + 32);
    ctx.scale(-1, 1);
    ctx.drawImage(left.img, 0, 0, 16, 1, 0, 0, 32, innerH);
    ctx.restore();
  }
  const jf = Math.floor((t / 10) % corner.frames);
  const drawCorner = (x, y, sx, sy) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.drawImage(corner.img, jf * 16, 0, 16, 16, 0, 0, 32, 32);
    ctx.restore();
  };
  drawCorner(x1, y1, 1, 1);
  drawCorner(x2 + 1, y1, -1, 1);
  drawCorner(x1, y2 + 1, 1, -1);
  drawCorner(x2 + 1, y2 + 1, -1, -1);
  ctx.restore();
}

export function createCodeEntry(numcount, initial) {
  return {
    num: Array.from({ length: numcount }, (_, i) =>
      initial ? Number(initial[i]) || 0 : 0,
    ),
    mpos: 0,
    con: 0,
    timer: 0,
    uhold: -1,
    dhold: -1,
    txtcolor: '#fff',
    result: null,

    step(input, play) {
      if (this.con === 0) {
        this.timer += 1;
        if (input.left) {
          play('menumove', 0.8, 0.9);
          this.mpos -= 1;
        }
        if (input.right) {
          play('menumove', 0.8, 1);
          this.mpos += 1;
        }
        if (this.mpos >= numcount) this.mpos = 0;
        if (this.mpos < 0) this.mpos = numcount - 1;
        this.dhold = input.downHeld ? this.dhold + 1 : -1;
        this.uhold = input.upHeld ? this.uhold + 1 : -1;
        if (input.upHeld && input.downHeld) {
          this.dhold = -1;
          this.uhold = -1;
        }
        if (this.uhold >= 0 && this.uhold % 5 === 0) {
          play('menumove', 0.8, 1);
          this.num[this.mpos] += 1;
        } else if (this.dhold >= 0 && this.dhold % 5 === 0) {
          play('menumove', 0.8, 0.9);
          this.num[this.mpos] -= 1;
        }
        if (this.num[this.mpos] > 9) this.num[this.mpos] = 0;
        if (this.num[this.mpos] < 0) this.num[this.mpos] = 9;
        if (input.confirm) {
          play('menumove', 0.8, 1.2);
          this.con = 1;
          this.timer = 0;
        }
        if (input.cancel) {
          play('menumove', 0.8, 0.8);
          this.result = -2;
        }
      } else if (this.con === 1) {
        this.timer += 1;
        if (this.timer === 30) {
          play('bell', 0.9);
          this.txtcolor = 'rgb(255,255,0)';
          this.result = this.num.join('');
        }
      }
    },

    draw(ctx, sprites, cx, yy, input, text) {
      const spc = 40;
      const xx = cx - ((numcount - 1) * spc) / 2;
      ctx.save();
      const arrow = sprites.menuArrow;
      for (let i = 0; i < numcount; i++) {
        const dx = xx + spc * i;
        if (i === this.mpos && this.con === 0) {
          const drawArrow = (y, rot, lit) => {
            ctx.save();
            ctx.translate(dx, y);
            ctx.rotate(rot);
            ctx.globalAlpha = 1;
            if (!lit) ctx.globalAlpha = 0.55;
            ctx.drawImage(arrow.img, 0, 0, 12, 8, -12, -8, 24, 16);
            ctx.restore();
          };
          drawArrow(yy - 26, Math.PI, input && input.upHeld);
          drawArrow(yy + 28, 0, input && input.downHeld);
        }
        text(String(this.num[i]), dx, yy + 8, 24, this.txtcolor, 'center');
      }
      ctx.restore();
    },
  };
}
