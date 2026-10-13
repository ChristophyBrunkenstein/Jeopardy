/* Minimal QR code generator (byte mode, versions 1-10, error correction L or M).
 * Self-contained so the game works with no internet connection.
 *   QR.matrix("text")            -> array of rows of booleans (true = dark)
 *   QR.draw(canvas, "text", px)  -> paints it (with quiet zone) on a canvas
 */
(function (root) {
  'use strict';
  // index = version (0 unused); [L, M]
  var ECC_PER_BLOCK = [[0, 0], [7, 10], [10, 16], [15, 26], [20, 18], [26, 24], [18, 16], [20, 18], [24, 22], [30, 22], [18, 26]];
  var NUM_BLOCKS = [[0, 0], [1, 1], [1, 1], [1, 1], [1, 2], [1, 2], [2, 4], [2, 4], [2, 4], [2, 5], [4, 5]];
  var FORMAT_BITS = { L: 1, M: 0 };

  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) { var n = Math.floor(ver / 7) + 2; r -= (25 * n - 10) * n - 55; if (ver >= 7) r -= 36; }
    return r;
  }
  function dataCodewords(ver, e) {
    return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver][e] * NUM_BLOCKS[ver][e];
  }

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
    return z;
  }
  function rsDivisor(degree) {
    var r = [], i, j;
    for (i = 0; i < degree - 1; i++) r.push(0);
    r.push(1);
    var root = 1;
    for (i = 0; i < degree; i++) {
      for (j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = gfMul(root, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      div.forEach(function (c, i) { r[i] ^= gfMul(c, f); });
    });
    return r;
  }

  function addEccAndInterleave(data, ver, e) {
    var nBlocks = NUM_BLOCKS[ver][e], eccLen = ECC_PER_BLOCK[ver][e];
    var raw = Math.floor(rawModules(ver) / 8);
    var nShort = nBlocks - raw % nBlocks, shortLen = Math.floor(raw / nBlocks);
    var blocks = [], div = rsDivisor(eccLen), k = 0;
    for (var i = 0; i < nBlocks; i++) {
      var dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (i < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var out = [];
    for (var x = 0; x < blocks[0].length; x++) {
      for (var j = 0; j < blocks.length; j++) {
        if (x !== shortLen - eccLen || j >= nShort) out.push(blocks[j][x]);
      }
    }
    return out;
  }

  function utf8(text) {
    var s = unescape(encodeURIComponent(text)), out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function encodeData(bytes, e) {
    for (var ver = 1; ver <= 10; ver++) {
      var cap = dataCodewords(ver, e) * 8;
      var countBits = ver < 10 ? 8 : 16;
      if (4 + countBits + bytes.length * 8 > cap) continue;
      var bits = [];
      var put = function (val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
      put(4, 4); put(bytes.length, countBits);
      bytes.forEach(function (b) { put(b, 8); });
      put(0, Math.min(4, cap - bits.length));
      while (bits.length % 8) bits.push(0);
      var words = [];
      for (var i = 0; i < bits.length; i += 8) {
        var w = 0; for (var j = 0; j < 8; j++) w = (w << 1) | bits[i + j]; words.push(w);
      }
      for (var pad = 0xEC; words.length < cap / 8; pad ^= 0xEC ^ 0x11) words.push(pad);
      return { ver: ver, words: words };
    }
    throw new Error('Text too long for QR code');
  }

  function build(text, level) {
    var e = level === 'L' ? 0 : 1;
    var enc = encodeData(utf8(text), e);
    var ver = enc.ver, size = ver * 4 + 17;
    var all = addEccAndInterleave(enc.words, ver, e);

    var mods = [], fn = [];
    for (var y = 0; y < size; y++) { mods.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function setFn(x, y, dark) { mods[y][x] = dark; fn[y][x] = true; }
    var bit = function (v, i) { return ((v >>> i) & 1) !== 0; };

    // timing patterns
    for (var i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
    // finder patterns
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) setFn(xx, yy, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    // alignment patterns
    var pos = [];
    if (ver > 1) {
      var n = Math.floor(ver / 7) + 2;
      var step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
      pos = [6];
      for (var p = size - 7; pos.length < n; p -= step) pos.splice(1, 0, p);
    }
    pos.forEach(function (ax, i) {
      pos.forEach(function (ay, j) {
        if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) return;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      });
    });
    // version info
    if (ver >= 7) {
      var rem = ver;
      for (var q = 0; q < 12; q++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vbits = (ver << 12) | rem;
      for (var m = 0; m < 18; m++) {
        var a = size - 11 + m % 3, b = Math.floor(m / 3);
        setFn(a, b, bit(vbits, m)); setFn(b, a, bit(vbits, m));
      }
    }
    function formatBits(mask) {
      var data = (FORMAT_BITS[level === 'L' ? 'L' : 'M'] << 3) | mask, r = data;
      for (var t = 0; t < 10; t++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var bits = ((data << 10) | r) ^ 0x5412, k;
      for (k = 0; k <= 5; k++) setFn(8, k, bit(bits, k));
      setFn(8, 7, bit(bits, 6)); setFn(8, 8, bit(bits, 7)); setFn(7, 8, bit(bits, 8));
      for (k = 9; k < 15; k++) setFn(14 - k, 8, bit(bits, k));
      for (k = 0; k < 8; k++) setFn(size - 1 - k, 8, bit(bits, k));
      for (k = 8; k < 15; k++) setFn(8, size - 15 + k, bit(bits, k));
      setFn(8, size - 8, true);
    }
    formatBits(0); // reserve the format areas as function modules

    // place data bits in the zig-zag
    var idx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var j = 0; j < 2; j++) {
          var x = right - j, upward = ((right + 1) & 2) === 0, y = upward ? size - 1 - vert : vert;
          if (!fn[y][x] && idx < all.length * 8) { mods[y][x] = bit(all[idx >>> 3], 7 - (idx & 7)); idx++; }
        }
      }
    }

    function applyMask(mask) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        var inv;
        switch (mask) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = x * y % 2 + x * y % 3 === 0; break;
          case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
          default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (!fn[y][x] && inv) mods[y][x] = !mods[y][x];
      }
    }

    function penalty() {
      var score = 0, x, y, dark = 0;
      var lines = [];
      for (y = 0; y < size; y++) { lines.push(mods[y].slice()); }
      for (x = 0; x < size; x++) { var col = []; for (y = 0; y < size; y++) col.push(mods[y][x]); lines.push(col); }
      lines.forEach(function (ln) {
        var run = 1;
        for (var i = 1; i <= ln.length; i++) {
          if (i < ln.length && ln[i] === ln[i - 1]) run++;
          else { if (run >= 5) score += 3 + (run - 5); run = 1; }
        }
        var s = ln.map(function (v) { return v ? '1' : '0'; }).join('');
        var re = /(?=(10111010000|00001011101))/g, mt;
        while ((mt = re.exec(s))) { score += 40; re.lastIndex = mt.index + 1; }
      });
      for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) {
        if (mods[y][x] === mods[y][x + 1] && mods[y][x] === mods[y + 1][x] && mods[y][x] === mods[y + 1][x + 1]) score += 3;
      }
      for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (mods[y][x]) dark++;
      var total = size * size;
      score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return score;
    }

    var best = 0, bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      applyMask(mask); formatBits(mask);
      var s = penalty();
      if (s < bestScore) { bestScore = s; best = mask; }
      applyMask(mask); // undo
    }
    applyMask(best); formatBits(best);
    return mods;
  }

  root.QR = {
    matrix: function (text, level) { return build(text, level || 'M'); },
    draw: function (canvas, text, px, level) {
      var m = build(text, level || 'M'), quiet = 4, n = m.length + quiet * 2;
      var cell = Math.max(1, Math.floor(px / n));
      canvas.width = canvas.height = cell * n;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      for (var y = 0; y < m.length; y++) for (var x = 0; x < m.length; x++) {
        if (m[y][x]) ctx.fillRect((x + quiet) * cell, (y + quiet) * cell, cell, cell);
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
