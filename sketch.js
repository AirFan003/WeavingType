// Created for the #Genuary2024 - Generative Typography
// Interactive poster editor with woven typography

let fontEnglish;
let fontChinese;
let text = 'threading';
let gTextSize = 250;
let gLineHeight = 0;
let textChunks = [];
let letterSizeScale = 1;

let sampleDensity = 0.1;
let lineLayers = 10;
let lineSpacing = 0.05;
let layerStep = 0.01;
let strokeW = 0.5;
let edgeJitter = 0.45;
let withinThreadSag = 0.5;
let gapsThreadSag = 0.5;

const MASK_SAMPLE_RADIUS = 3;
const MASK_BRIGHTNESS_THRESHOLD = 4;
const BODY_SAMPLE_COUNT = 5;
const BODY_INSIDE_MIN_RATIO = 0.34;
const SAG_AMOUNT_SCALE = 0.06;
let letterSpacing = 0.065;
let colorMode = 'monotone';
let backgroundColor = '#0c0b0a';
let paletteColors = ['#e8dcc8', '#c45c3e', '#6b8f71'];

let textInput;
let isComposing = false;
let selectedChunkId = null;
let dragState = null;
let nextChunkId = 0;

const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
const FONT_ENGLISH =
  'https://cdn.jsdelivr.net/gh/adobe-fonts/source-serif@release/VAR/SourceSerif4Variable-Roman.ttf';
const FONT_CHINESE =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@5.2.5/chinese-simplified-700-normal.woff';
const FONT_CHINESE_FULL =
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf';
const A4_RATIO = 297 / 210;

function preload() {
  fontEnglish = loadFont(FONT_ENGLISH);
  fontChinese = loadFont(FONT_CHINESE);
}

function fontsReady() {
  return fontEnglish && fontChinese;
}

function isCjkChar(char) {
  return CJK_REGEX.test(char);
}

function fontForChar(char) {
  return isCjkChar(char) ? fontChinese : fontEnglish;
}

function hasCJK(value) {
  return CJK_REGEX.test(value);
}

function charAdvanceForSize(char, addTrackingAfter, textSize) {
  let width = fontForChar(char).textBounds(char, 0, 0, textSize).w;

  if (addTrackingAfter && !isCjkChar(char)) {
    width += textSize * letterSpacing;
  }

  return width;
}

function setup() {
  let size = getA4CanvasSize();
  let canvas = createCanvas(size.w, size.h);
  canvas.parent('a4-frame');

  stroke(255);
  noFill();
  syncCanvasMetrics();

  bindControls();
  text = textInput.value();
  syncChunksFromText();
  loadFullChineseFont();
}

function getA4CanvasSize() {
  let panel = document.getElementById('canvas-panel');

  if (!panel) {
    return { w: 595, h: 842 };
  }

  let pad = 48;
  let maxW = panel.clientWidth - pad * 2;
  let maxH = panel.clientHeight - pad * 2;
  let w = maxW;
  let h = w * A4_RATIO;

  if (h > maxH) {
    h = maxH;
    w = h / A4_RATIO;
  }

  return {
    w: max(200, floor(w)),
    h: max(280, floor(h)),
  };
}

function syncCanvasMetrics() {
  let baseSize = constrain(min(width, height) * 0.32, 72, 260);
  gTextSize = baseSize * letterSizeScale;
  gLineHeight = gTextSize * 1.0;
}

function resizeArtboard() {
  let size = getA4CanvasSize();
  resizeCanvas(size.w, size.h);
  syncCanvasMetrics();
  for (let chunk of textChunks) {
    chunk.rebuildLine();
  }
}

function loadFullChineseFont() {
  loadFont(
    FONT_CHINESE_FULL,
    (loadedFont) => {
      fontChinese = loadedFont;
      syncChunksFromText();
    },
    (error) => {
      console.warn('Extended Chinese font unavailable, using subset font.', error);
    }
  );
}

function bindControls() {
  textInput = select('#text-input');

  textInput.elt.addEventListener('compositionstart', () => {
    isComposing = true;
  });
  textInput.elt.addEventListener('compositionend', () => {
    isComposing = false;
    text = textInput.value();
    syncChunksFromText();
  });

  textInput.input(() => {
    if (isComposing) {
      return;
    }
    text = textInput.value();
    syncChunksFromText();
  });

  bindSlider('density-slider', 'density-value', (v) => {
    sampleDensity = v;
  });
  bindSlider('letter-size-slider', 'letter-size-value', (v) => {
    letterSizeScale = v;
    syncCanvasMetrics();
    for (let chunk of textChunks) {
      chunk.rebuildLine();
    }
  });
  bindSlider('letter-spacing-slider', 'letter-spacing-value', (v) => {
    letterSpacing = v;
    for (let chunk of textChunks) {
      chunk.rebuildLine();
    }
  });
  bindSlider('layers-slider', 'layers-value', (v) => {
    lineLayers = Math.round(v);
  });
  bindSlider('spacing-slider', 'spacing-value', (v) => {
    lineSpacing = v;
  });
  bindSlider('step-slider', 'step-value', (v) => {
    layerStep = v;
  });
  bindSlider('stroke-slider', 'stroke-value', (v) => {
    strokeW = v;
  });
  bindSlider('jitter-slider', 'jitter-value', (v) => {
    edgeJitter = v;
  });
  bindSlider('within-sag-slider', 'within-sag-value', (v) => {
    withinThreadSag = v;
  });
  bindSlider('gaps-sag-slider', 'gaps-sag-value', (v) => {
    gapsThreadSag = v;
  });
  bindSlider('chunk-scale-slider', 'chunk-scale-value', (v) => {
    let chunk = getSelectedChunk();
    if (chunk) {
      chunk.scale = v;
      chunk.rebuildLine();
    }
  });

  bindColorControls();
  select('#download-svg').mousePressed(downloadSvg);
  select('#download-png').mousePressed(downloadPng);
}

function bindColorControls() {
  let modeSelect = select('#color-mode');
  modeSelect.changed(() => {
    colorMode = modeSelect.value();
    updateColorControlVisibility();
  });
  colorMode = modeSelect.value();
  updateColorControlVisibility();

  select('#bg-color').input(() => {
    backgroundColor = select('#bg-color').value();
  });
  backgroundColor = select('#bg-color').value();

  for (let i = 1; i <= 3; i++) {
    let picker = select(`#color-${i}`);
    let index = i - 1;
    picker.input(() => {
      paletteColors[index] = picker.value();
    });
    paletteColors[index] = picker.value();
  }
}

function updateColorControlVisibility() {
  let slots = selectAll('.color-label');

  for (let row of slots) {
    let slot = parseInt(row.attribute('data-color-slot'), 10);
    let show = false;

    if (colorMode === 'monotone') {
      show = slot === 0;
    } else if (colorMode === 'duotone') {
      show = slot <= 1;
    } else {
      show = slot <= 2;
    }

    if (show) {
      row.removeClass('is-hidden');
    } else {
      row.addClass('is-hidden');
    }
  }
}

function updateSelectionControls() {
  let panel = select('#selection-controls');
  let chunk = getSelectedChunk();

  if (!chunk) {
    panel.addClass('is-hidden');
    return;
  }

  panel.removeClass('is-hidden');
  select('#selected-chunk-label').html(`Selected: ${chunk.text}`);
  select('#chunk-scale-slider').value(chunk.scale);
  select('#chunk-scale-value').html(chunk.scale.toFixed(2));
}

function threadStrokeHex(a, b, layerSalt) {
  if (colorMode === 'monotone') {
    return paletteColors[0];
  }

  let paletteSize = colorMode === 'duotone' ? 2 : 3;
  let colorIndex = floor(threadRandom(a.x, a.y, layerSalt + 21.7) * paletteSize);
  colorIndex = min(colorIndex, paletteSize - 1);

  return paletteColors[colorIndex];
}

function hexToRgb(hex) {
  let normalized = hex.replace('#', '');

  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function bindSlider(sliderId, labelId, onChange) {
  let slider = select(`#${sliderId}`);
  let label = select(`#${labelId}`);

  let update = () => {
    let value = parseFloat(slider.value());
    label.html(
      sliderId === 'layers-slider'
        ? String(Math.round(value))
        : value.toFixed(
            sliderId === 'step-slider' || sliderId === 'letter-spacing-slider' ? 3 : 2
          )
    );
    onChange(value);
  };

  slider.input(update);
  update();
}

function tokenizeText(value) {
  let tokens = [];
  let lines = value.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    if (lineIdx > 0) {
      tokens.push({ text: '', isLineBreak: true });
    }

    let line = lines[lineIdx];
    if (!line) {
      continue;
    }

    if (hasCJK(line)) {
      let parts = line.split(/\s+/).filter(Boolean);

      for (let part of parts) {
        if (/^[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+$/.test(part)) {
          for (let char of part) {
            tokens.push({ text: char, isLineBreak: false });
          }
        } else {
          tokens.push({ text: part, isLineBreak: false });
        }
      }
    } else {
      for (let word of line.match(/\S+/g) || []) {
        tokens.push({ text: word, isLineBreak: false });
      }
    }
  }

  return tokens;
}

function defaultChunkPosition(tokenIndex, tokens) {
  let row = 0;
  let col = 0;

  for (let i = 0; i < tokenIndex; i++) {
    if (tokens[i].isLineBreak) {
      row++;
      col = 0;
    } else {
      col++;
    }
  }

  let ascender = max(
    fontEnglish.textBounds('Hg', 0, 0, gTextSize).h,
    fontChinese.textBounds('中', 0, 0, gTextSize).h
  );

  return {
    x: width * 0.12 + col * width * 0.2,
    y: height * 0.18 + row * gTextSize * 1.35 + ascender * 0.2,
  };
}

function syncChunksFromText() {
  let tokens = tokenizeText(text || '');
  let wordTokens = tokens.filter((token) => !token.isLineBreak);
  let nextChunks = [];
  let wordIndex = 0;

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].isLineBreak) {
      continue;
    }

    let token = tokens[i];
    let prev = textChunks[wordIndex];

    if (prev && prev.text === token.text) {
      prev.rebuildLine();
      nextChunks.push(prev);
    } else {
      let pos = defaultChunkPosition(i, tokens);
      nextChunks.push(new TextChunk(token.text, pos.x, pos.y, 1));
    }

    wordIndex++;
  }

  textChunks = nextChunks;

  if (selectedChunkId && !getChunkById(selectedChunkId)) {
    selectedChunkId = null;
  }

  updateSelectionControls();
}

function getChunkById(id) {
  return textChunks.find((chunk) => chunk.id === id);
}

function getSelectedChunk() {
  return getChunkById(selectedChunkId);
}

function hitTestChunk(mx, my) {
  for (let i = textChunks.length - 1; i >= 0; i--) {
    let chunk = textChunks[i];
    if (chunk.containsPoint(mx, my)) {
      return chunk;
    }
  }

  return null;
}

function forEachWeaveThread(onThread) {
  for (let i = 0; i < lineLayers; i++) {
    let layerSalt = i * 17.11;

    for (let chunk of textChunks) {
      let line = chunk.line;
      let threshold = chunk.textSize() * (lineSpacing + layerStep * i);
      line.update(sampleDensity, threshold);

      for (let segment of line.segments) {
        let pairs = buildStitchPairs(segment, layerSalt);

        for (let pair of pairs) {
          let inside = isWithinLetterBody(pair[0], pair[1], line);
          onThread(pair, layerSalt + pair[0].charIndex * 0.31, inside, chunk.textSize());
        }
      }
    }
  }
}

function charIndexAtPoint(x, y, masks) {
  for (let mask of masks) {
    if (mask.contains(x, y)) {
      return mask.charIndex;
    }
  }

  return null;
}

function isWithinLetterBody(a, b, line) {
  let aChar = charIndexAtPoint(a.x, a.y, line.masks);
  let bChar = charIndexAtPoint(b.x, b.y, line.masks);

  if (aChar === null || bChar === null || aChar !== bChar) {
    return false;
  }

  let insideCount = 0;

  for (let i = 0; i < BODY_SAMPLE_COUNT; i++) {
    let t = i / (BODY_SAMPLE_COUNT - 1);
    let x = lerp(a.x, b.x, t);
    let y = lerp(a.y, b.y, t);

    if (charIndexAtPoint(x, y, line.masks) === aChar) {
      insideCount++;
    }
  }

  return insideCount / BODY_SAMPLE_COUNT >= BODY_INSIDE_MIN_RATIO;
}

function draw() {
  let bg = hexToRgb(backgroundColor);
  background(bg.r, bg.g, bg.b);

  if (!fontsReady()) {
    drawStatusMessage('Loading fonts…');
    return;
  }

  forEachWeaveThread((pair, layerSalt, inside, textSize) => {
    drawCurvedThread(pair[0], pair[1], layerSalt, inside, textSize);
  });

  drawSelectionUI();
  updateCanvasCursor();
}

function drawSelectionUI() {
  let chunk = getSelectedChunk();
  if (!chunk) {
    return;
  }

  let b = chunk.getBounds();
  noFill();
  stroke(232, 220, 200, 200);
  strokeWeight(1.5);
  rect(b.x, b.y, b.w, b.h, 2);

  fill(232, 220, 200);
  noStroke();
  circle(b.x + b.w, b.y + b.h, 10);
}

function drawStatusMessage(message) {
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);
  text(message, width / 2, height / 2);
}

function mousePressed() {
  if (mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) {
    return;
  }

  let chunk = hitTestChunk(mouseX, mouseY);

  if (chunk) {
    selectedChunkId = chunk.id;
    updateSelectionControls();

    let b = chunk.getBounds();
    let onHandle = dist(mouseX, mouseY, b.x + b.w, b.y + b.h) < 14;

    if (onHandle) {
      dragState = {
        mode: 'resize',
        chunkId: chunk.id,
        startScale: chunk.scale,
        startY: mouseY,
      };
    } else {
      dragState = {
        mode: 'move',
        chunkId: chunk.id,
        lastX: mouseX,
        lastY: mouseY,
      };
    }
  } else {
    selectedChunkId = null;
    updateSelectionControls();
  }
}

function mouseDragged() {
  if (!dragState) {
    return;
  }

  let chunk = getChunkById(dragState.chunkId);
  if (!chunk) {
    return;
  }

  if (dragState.mode === 'move') {
    chunk.x += mouseX - dragState.lastX;
    chunk.y += mouseY - dragState.lastY;
    dragState.lastX = mouseX;
    dragState.lastY = mouseY;
    chunk.rebuildLine();
  } else if (dragState.mode === 'resize') {
    chunk.scale = constrain(dragState.startScale + (mouseY - dragState.startY) * 0.008, 0.25, 3);
    chunk.rebuildLine();
    updateSelectionControls();
  }
}

function mouseReleased() {
  dragState = null;
}

function keyPressed() {
  let chunk = getSelectedChunk();
  if (!chunk) {
    return;
  }

  let step = keyIsDown(SHIFT) ? 1 : 5;

  if (keyCode === LEFT_ARROW) {
    chunk.x -= step;
    chunk.rebuildLine();
    return false;
  }
  if (keyCode === RIGHT_ARROW) {
    chunk.x += step;
    chunk.rebuildLine();
    return false;
  }
  if (keyCode === UP_ARROW) {
    chunk.y -= step;
    chunk.rebuildLine();
    return false;
  }
  if (keyCode === DOWN_ARROW) {
    chunk.y += step;
    chunk.rebuildLine();
    return false;
  }
}

function updateCanvasCursor() {
  let canvas = document.querySelector('#a4-frame canvas');
  if (!canvas) {
    return;
  }

  if (dragState) {
    canvas.style.cursor = dragState.mode === 'resize' ? 'nwse-resize' : 'grabbing';
    return;
  }

  if (mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) {
    canvas.style.cursor = 'default';
    return;
  }

  let chunk = hitTestChunk(mouseX, mouseY);
  if (!chunk) {
    canvas.style.cursor = 'default';
    return;
  }

  let b = chunk.getBounds();
  let onHandle = dist(mouseX, mouseY, b.x + b.w, b.y + b.h) < 14;
  canvas.style.cursor = onHandle ? 'nwse-resize' : 'grab';
}

function windowResized() {
  resizeArtboard();
}

class TextChunk {
  constructor(textValue, x, y, scale) {
    this.id = `chunk-${nextChunkId++}`;
    this.text = textValue;
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.line = null;
    this.bounds = { x: 0, y: 0, w: 0, h: 0 };
    this.rebuildLine();
  }

  textSize() {
    return gTextSize * this.scale;
  }

  rebuildLine() {
    this.line = new TextLine(this.text, this.x, this.y, this.textSize());
    this.bounds = this.line.getBounds();
  }

  getBounds() {
    return this.bounds;
  }

  containsPoint(mx, my) {
    let b = this.bounds;
    return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
  }
}

class LetterMask {
  constructor(char, textSize) {
    this.charIndex = char.index;
    this.textSize = textSize;
    let bounds = char.font.textBounds(char.c, char.xp, char.yp, textSize);
    let pad = 14;

    this.offsetX = floor(bounds.x) - pad;
    this.offsetY = floor(bounds.y) - pad;
    this.maskWidth = ceil(bounds.w) + pad * 2;
    this.maskHeight = ceil(bounds.h) + pad * 2;
    this.graphics = createGraphics(this.maskWidth, this.maskHeight);

    this.graphics.pixelDensity(1);
    this.graphics.background(0);
    this.graphics.fill(255);
    this.graphics.noStroke();
    this.graphics.textFont(char.font);
    this.graphics.textSize(textSize);
    this.graphics.textAlign(LEFT, BASELINE);
    this.graphics.text(char.c, char.xp - this.offsetX, char.yp - this.offsetY);
  }

  contains(x, y) {
    let localX = floor(x - this.offsetX);
    let localY = floor(y - this.offsetY);

    for (let oy = -MASK_SAMPLE_RADIUS; oy <= MASK_SAMPLE_RADIUS; oy++) {
      for (let ox = -MASK_SAMPLE_RADIUS; ox <= MASK_SAMPLE_RADIUS; ox++) {
        let sampleX = localX + ox;
        let sampleY = localY + oy;

        if (sampleX < 0 || sampleY < 0 || sampleX >= this.maskWidth || sampleY >= this.maskHeight) {
          continue;
        }

        let pixel = this.graphics.get(sampleX, sampleY);
        if (brightness(pixel) > MASK_BRIGHTNESS_THRESHOLD) {
          return true;
        }
      }
    }

    return false;
  }
}

class TextLine {
  constructor(textValue, startX, yp, textSize) {
    this.textSize = textSize;
    this.chars = [];
    let xp = startX;

    let chars = [...textValue];
    let index = 0;

    for (let i = 0; i < chars.length; i++) {
      let c = chars[i];
      let charFont = fontForChar(c);
      this.chars.push({ c, xp, yp, index, font: charFont });
      xp += charAdvanceForSize(c, i < chars.length - 1, textSize);
      index++;
    }

    this.masks = this.chars.map((char) => new LetterMask(char, textSize));
    this.segments = [];
    this.bounds = this.computeBounds();
  }

  computeBounds() {
    if (this.chars.length === 0) {
      return { x: 0, y: 0, w: 0, h: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let char of this.chars) {
      let b = char.font.textBounds(char.c, char.xp, char.yp, this.textSize);
      minX = min(minX, b.x);
      minY = min(minY, b.y);
      maxX = max(maxX, b.x + b.w);
      maxY = max(maxY, b.y + b.h);
    }

    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY,
    };
  }

  getBounds() {
    return this.bounds;
  }

  update(sample, threshold) {
    let points = [];

    for (let char of this.chars) {
      let charPoints = char.font.textToPoints(char.c, char.xp, char.yp, this.textSize, {
        sampleFactor: sample,
        simplifyThreshold: 0,
      });

      for (let pt of charPoints) {
        points.push({ x: pt.x, y: pt.y, charIndex: char.index });
      }
    }

    let groups = {};

    for (let pt of points) {
      let roundedY = floor(pt.y / threshold);
      groups[roundedY] = groups[roundedY] || [];
      groups[roundedY].push(pt);
    }

    this.segments = [];
    for (let row of Object.values(groups)) {
      for (let segment of splitRowIntoSegments(row)) {
        this.segments.push(segment);
      }
    }
  }
}

function canConnectPoints(a, b) {
  return abs(a.charIndex - b.charIndex) <= 1;
}

function splitRowIntoSegments(row) {
  if (row.length === 0) {
    return [];
  }

  row.sort((a, b) => a.x - b.x);

  let segments = [[row[0]]];

  for (let i = 1; i < row.length; i++) {
    let current = segments[segments.length - 1];
    let last = current[current.length - 1];
    let pt = row[i];

    if (canConnectPoints(last, pt)) {
      current.push(pt);
    } else {
      segments.push([pt]);
    }
  }

  return segments;
}

function threadRandom(x, y, salt) {
  let n = sin(x * 12.9898 + y * 78.233 + salt * 43.758) * 43758.5453;
  return n - floor(n);
}

function jitterPoint(x, y, amount, salt) {
  let angle = threadRandom(x, y, salt) * TWO_PI;
  let dist = threadRandom(y, x, salt + 1.7) * amount;
  return {
    x: x + cos(angle) * dist,
    y: y + sin(angle) * dist,
  };
}

function buildStitchPairs(segment, layerSalt, density = 1) {
  let pairs = [];
  let i = 0;
  let skipChance = 0.1 + (1 - min(density, 1)) * 0.4;

  while (i < segment.length) {
    if (threadRandom(segment[i].x, segment[i].y, layerSalt) < skipChance) {
      i++;
      continue;
    }

    let span = threadRandom(segment[i].x, segment[i].y, layerSalt + 2) > 0.62 ? 2 : 1;
    let j = min(i + span, segment.length - 1);

    if (j > i) {
      pairs.push([segment[i], segment[j]]);
    }

    let step = threadRandom(segment[j].x, segment[j].y, layerSalt + 4) > 0.7 ? 2 : 1;
    i += step;
  }

  return pairs;
}

function sagAmountForThread(inside, textSize) {
  return (inside ? withinThreadSag : gapsThreadSag) * textSize * SAG_AMOUNT_SCALE;
}

function computeThreadGeometry(a, b, layerSalt, inside, textSize) {
  let jitterAmt = edgeJitter * textSize * 0.018;
  let sagAmt = sagAmountForThread(inside, textSize);

  let start = jitterPoint(a.x, a.y, jitterAmt, layerSalt);
  let end = jitterPoint(b.x, b.y, jitterAmt, layerSalt + 5.2);

  let dx = end.x - start.x;
  let dy = end.y - start.y;
  let len = max(sqrt(dx * dx + dy * dy), 0.001);
  let nx = dx / len;
  let ny = dy / len;

  let overshoot = jitterAmt * (0.25 + threadRandom(a.x, a.y, layerSalt + 6.1) * 0.75);
  start.x -= nx * overshoot * 0.35;
  start.y -= ny * overshoot * 0.35;
  end.x += nx * overshoot * 0.55;
  end.y += ny * overshoot * 0.55;

  let midX = (start.x + end.x) / 2;
  let midY = (start.y + end.y) / 2;
  let perpX = -ny;
  let perpY = nx;
  let sway = (threadRandom(midX, midY, layerSalt + 7.4) - 0.5) * jitterAmt * 0.8;
  let droop = sagAmt * (0.35 + threadRandom(midX, midY, layerSalt + 8.2) * 0.65);

  return {
    start,
    ctrl: {
      x: midX + perpX * sway,
      y: midY + droop + abs(dx) * 0.03,
    },
    end,
    weight: strokeW * (0.55 + threadRandom(a.x, a.y, layerSalt + 9.3) * 0.9),
    alpha: 95 + floor(threadRandom(b.x, b.y, layerSalt + 11.5) * 160),
  };
}

function drawCurvedThread(a, b, layerSalt, inside, textSize) {
  let thread = computeThreadGeometry(a, b, layerSalt, inside, textSize);
  let strokeRgb = hexToRgb(threadStrokeHex(a, b, layerSalt));

  stroke(strokeRgb.r, strokeRgb.g, strokeRgb.b, thread.alpha);
  strokeWeight(thread.weight);
  noFill();
  beginShape();
  vertex(thread.start.x, thread.start.y);
  quadraticVertex(thread.ctrl.x, thread.ctrl.y, thread.end.x, thread.end.y);
  endShape();
}

function svgNumber(value) {
  return value.toFixed(2);
}

function threadToSvgPath(thread, strokeHex) {
  let opacity = (thread.alpha / 255).toFixed(3);
  return (
    `<path d="M ${svgNumber(thread.start.x)} ${svgNumber(thread.start.y)} ` +
    `Q ${svgNumber(thread.ctrl.x)} ${svgNumber(thread.ctrl.y)} ` +
    `${svgNumber(thread.end.x)} ${svgNumber(thread.end.y)}" ` +
    `fill="none" stroke="${strokeHex}" stroke-width="${svgNumber(thread.weight)}" ` +
    `stroke-opacity="${opacity}" stroke-linecap="round"/>`
  );
}

function collectSvgPaths() {
  let paths = [];

  forEachWeaveThread((pair, layerSalt, inside, textSize) => {
    let thread = computeThreadGeometry(pair[0], pair[1], layerSalt, inside, textSize);
    paths.push(threadToSvgPath(thread, threadStrokeHex(pair[0], pair[1], layerSalt)));
  });

  return paths;
}

function makeExportBasename() {
  let slug = text
    .trim()
    .slice(0, 30)
    .replace(/[^\w\u4e00-\u9fff-]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return `weaving-${slug || 'type'}`;
}

function makeSvgFilename() {
  return `${makeExportBasename()}.svg`;
}

function downloadPng() {
  if (!fontsReady() || textChunks.length === 0) {
    return;
  }

  saveCanvas(makeExportBasename(), 'png');
}

function buildSvgDocument() {
  let paths = collectSvgPaths();

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    `  <rect width="100%" height="100%" fill="${backgroundColor}"/>\n` +
    `  ${paths.join('\n  ')}\n` +
    '</svg>'
  );
}

function downloadSvg() {
  if (!fontsReady() || textChunks.length === 0) {
    return;
  }

  let svg = buildSvgDocument();
  let blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  let url = URL.createObjectURL(blob);
  let anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = makeSvgFilename();
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
