// Created for the #Genuary2024 - Generative Typography
// https://genuary.art/prompts#jan20
// Interactive version: editable text + line density controls

let fontEnglish;
let fontChinese;
let text = 'threading';
let gTextSize = 250;
let gMargin = 48;
let gLineHeight = 0;
let gParagraphGap = 0;
let gLines = [];

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
let withinLetterDensity = 1;
let betweenLetterDensity = 1;
let letterSpacing = 0.065;
let colorMode = 'monotone';
let backgroundColor = '#0c0b0a';
let paletteColors = ['#e8dcc8', '#c45c3e', '#6b8f71'];

let textInput;
let isComposing = false;

const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
const FONT_ENGLISH =
  'https://cdn.jsdelivr.net/gh/adobe-fonts/source-serif@release/VAR/SourceSerif4Variable-Roman.ttf';
const FONT_CHINESE =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@5.2.5/chinese-simplified-700-normal.woff';
const FONT_CHINESE_FULL =
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf';

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

function englishTrackingAfter() {
  return gTextSize * letterSpacing;
}

function charAdvance(char, addTrackingAfter) {
  let width = fontForChar(char).textBounds(char, 0, 0, gTextSize).w;

  if (addTrackingAfter && !isCjkChar(char)) {
    width += englishTrackingAfter();
  }

  return width;
}

function setup() {
  let canvas = createCanvas(windowWidth, windowHeight - 80);
  canvas.position(0, 80);
  canvas.style('z-index', '0');

  stroke(255);
  noFill();

  gLineHeight = gTextSize * 1.0;
  gParagraphGap = gTextSize * 0.15;

  bindControls();
  text = textInput.value();
  rebuildLayout();
  loadFullChineseFont();
}

function loadFullChineseFont() {
  loadFont(
    FONT_CHINESE_FULL,
    (loadedFont) => {
      fontChinese = loadedFont;
      rebuildLayout();
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
    rebuildLayout();
  });

  textInput.input(() => {
    if (isComposing) {
      return;
    }
    text = textInput.value();
    rebuildLayout();
  });

  bindSlider('density-slider', 'density-value', (v) => {
    sampleDensity = v;
  });
  bindSlider('letter-spacing-slider', 'letter-spacing-value', (v) => {
    letterSpacing = v;
    rebuildLayout();
  });
  bindSlider('within-slider', 'within-value', (v) => {
    withinLetterDensity = v;
  });
  bindSlider('between-slider', 'between-value', (v) => {
    betweenLetterDensity = v;
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

  bindColorControls();
  select('#download-svg').mousePressed(downloadSvg);
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

  for (let label of slots) {
    let slot = parseInt(label.attribute('data-color-slot'), 10);
    let show = false;

    if (colorMode === 'monotone') {
      show = slot === 0;
    } else if (colorMode === 'duotone') {
      show = slot <= 1;
    } else {
      show = slot <= 2;
    }

    if (show) {
      label.removeClass('is-hidden');
    } else {
      label.addClass('is-hidden');
    }
  }
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

function hasCJK(value) {
  return CJK_REGEX.test(value);
}

function lineWidth(value) {
  let chars = [...value];
  let widthTotal = 0;

  for (let i = 0; i < chars.length; i++) {
    widthTotal += charAdvance(chars[i], i < chars.length - 1);
  }

  return widthTotal;
}

function wrapParagraphByCharacters(paragraph, maxWidth) {
  let lines = [];
  let currentLine = '';

  for (let char of paragraph) {
    let trial = currentLine + char;

    if (lineWidth(trial) > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = trial;
    }
  }

  if (currentLine !== '') {
    lines.push(currentLine);
  }

  return lines;
}

function wrapParagraphByWords(paragraph, maxWidth) {
  let lines = [];
  let currentLine = '';
  let words = paragraph.split(/(\s+)/);

  for (let word of words) {
    if (word === '') continue;

    let trial = currentLine + word;

    if (lineWidth(trial) > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = word.trimStart();
    } else {
      currentLine = trial;
    }
  }

  if (currentLine !== '') {
    lines.push(currentLine);
  }

  return lines;
}

function wrapParagraph(paragraph, maxWidth) {
  if (hasCJK(paragraph)) {
    return wrapParagraphByCharacters(paragraph, maxWidth);
  }
  return wrapParagraphByWords(paragraph, maxWidth);
}

function rebuildLayout() {
  gLines = [];

  if (!text || !fontsReady()) {
    return;
  }

  let latinAscender = fontEnglish.textBounds('Hg', 0, 0, gTextSize).h;
  let cjkAscender = fontChinese.textBounds('中', 0, 0, gTextSize).h;
  let ascender = max(latinAscender, cjkAscender);
  let maxWidth = width - gMargin * 2;
  let paragraphs = text.split('\n');
  let laidOut = [];

  for (let paragraph of paragraphs) {
    if (paragraph === '') {
      laidOut.push({ text: '', blank: true });
      continue;
    }

    for (let line of wrapParagraph(paragraph, maxWidth)) {
      laidOut.push({ text: line, blank: false });
    }
  }

  let contentHeight = 0;
  for (let entry of laidOut) {
    if (entry.blank) {
      contentHeight += gParagraphGap;
    } else {
      contentHeight += gLineHeight;
    }
  }

  let y = (height - contentHeight) / 2 + ascender;

  for (let entry of laidOut) {
    if (entry.blank) {
      y += gParagraphGap;
      continue;
    }

    gLines.push(new TextLine(entry.text, gMargin, y));
    y += gLineHeight;
  }
}

function getDensitySettings(density) {
  let amount = max(density, 0);

  return {
    layers: amount === 0 ? 0 : max(1, round(lineLayers * amount)),
    sample: sampleDensity * amount,
    spacing: lineSpacing / max(amount, 0.2),
    step: layerStep / max(amount, 0.2),
  };
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

function forEachWeaveThread(onThread) {
  let passes = [
    { density: withinLetterDensity, saltOffset: 0, within: true },
    { density: betweenLetterDensity, saltOffset: 1000, within: false },
  ];
  for (let pass of passes) {
    let settings = getDensitySettings(pass.density);

    for (let i = 0; i < settings.layers; i++) {
      let threshold = gTextSize * (settings.spacing + settings.step * i);

      for (let line of gLines) {
        line.update(settings.sample, threshold);
        let layerSalt = pass.saltOffset + i * 17.11;

        for (let segment of line.segments) {
          let pairs = buildStitchPairs(segment, layerSalt, pass.density);

          for (let pair of pairs) {
            let inside = isWithinLetterBody(pair[0], pair[1], line);
            if (inside !== pass.within) {
              continue;
            }

            onThread(pair, layerSalt + pair[0].charIndex * 0.31, inside);
          }
        }
      }
    }
  }
}

function draw() {
  let bg = hexToRgb(backgroundColor);
  background(bg.r, bg.g, bg.b);

  if (!fontsReady()) {
    drawStatusMessage('Loading fonts…');
    return;
  }

  forEachWeaveThread((pair, layerSalt, inside) => {
    drawCurvedThread(pair[0], pair[1], layerSalt, inside);
  });
}

function drawStatusMessage(message) {
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(18);
  text(message, width / 2, height / 2);
}

function keyPressed() {
  if (document.activeElement === textInput.elt) {
    return;
  }

  if (keyCode === BACKSPACE) {
    text = text.slice(0, -1);
    textInput.value(text);
    rebuildLayout();
    return false;
  }

  if (keyCode === ENTER) {
    text += '\n';
    textInput.value(text);
    rebuildLayout();
    return false;
  }

  if (key.length === 1 && !keyDown(CONTROL) && !keyDown(META)) {
    text += key;
    textInput.value(text);
    rebuildLayout();
    return false;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight - 80);
  rebuildLayout();
}

class LetterMask {
  constructor(char) {
    this.charIndex = char.index;
    let bounds = char.font.textBounds(char.c, char.xp, char.yp, gTextSize);
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
    this.graphics.textSize(gTextSize);
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
  constructor(text, startX, yp) {
    this.chars = [];
    let xp = startX;

    let chars = [...text];
    let index = 0;

    for (let i = 0; i < chars.length; i++) {
      let c = chars[i];
      let charFont = fontForChar(c);
      this.chars.push({ c, xp, yp, index, font: charFont });
      xp += charAdvance(c, i < chars.length - 1);
      index++;
    }

    this.masks = this.chars.map((char) => new LetterMask(char));
    this.segments = [];
  }

  update(sample, threshold) {
    let points = [];

    for (let char of this.chars) {
      let charPoints = char.font.textToPoints(char.c, char.xp, char.yp, gTextSize, {
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

function sagAmountForThread(inside) {
  return (inside ? withinThreadSag : gapsThreadSag) * gTextSize * SAG_AMOUNT_SCALE;
}

function computeThreadGeometry(a, b, layerSalt, inside) {
  let jitterAmt = edgeJitter * gTextSize * 0.018;
  let sagAmt = sagAmountForThread(inside);

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

function drawCurvedThread(a, b, layerSalt, inside) {
  let thread = computeThreadGeometry(a, b, layerSalt, inside);
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

  forEachWeaveThread((pair, layerSalt, inside) => {
    let thread = computeThreadGeometry(pair[0], pair[1], layerSalt, inside);
    paths.push(threadToSvgPath(thread, threadStrokeHex(pair[0], pair[1], layerSalt)));
  });

  return paths;
}

function makeSvgFilename() {
  let slug = text
    .trim()
    .slice(0, 30)
    .replace(/[^\w\u4e00-\u9fff-]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return `weaving-${slug || 'type'}.svg`;
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
  if (!fontsReady() || gLines.length === 0) {
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

