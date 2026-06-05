// Created for the #Genuary2024 - Generative Typography
// https://genuary.art/prompts#jan20
// Interactive version: editable text + line density controls

let font;
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
let threadSag = 0.5;

let textInput;
let isComposing = false;
let fullFontLoading = false;

const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
const FONT_FAST =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@5.2.5/chinese-simplified-700-normal.woff';
const FONT_FULL =
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf';

function preload() {
  font = loadFont(FONT_FAST);
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
  loadFullFont();
}

function loadFullFont() {
  fullFontLoading = true;
  loadFont(
    FONT_FULL,
    (loadedFont) => {
      font = loadedFont;
      fullFontLoading = false;
      rebuildLayout();
    },
    (error) => {
      fullFontLoading = false;
      console.warn('Extended font unavailable, using subset font.', error);
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
  bindSlider('sag-slider', 'sag-value', (v) => {
    threadSag = v;
  });

  select('#download-svg').mousePressed(downloadSvg);
}

function bindSlider(sliderId, labelId, onChange) {
  let slider = select(`#${sliderId}`);
  let label = select(`#${labelId}`);

  let update = () => {
    let value = parseFloat(slider.value());
    label.html(sliderId === 'layers-slider' ? String(Math.round(value)) : value.toFixed(sliderId === 'step-slider' ? 3 : 2));
    onChange(value);
  };

  slider.input(update);
  update();
}

function hasCJK(value) {
  return CJK_REGEX.test(value);
}

function lineWidth(value) {
  return font.textBounds(value, 0, 0, gTextSize).w;
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

  if (!text || !font) {
    return;
  }

  let latinAscender = font.textBounds('Hg', 0, 0, gTextSize).h;
  let cjkAscender = font.textBounds('中', 0, 0, gTextSize).h;
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

function draw() {
  background(0);

  if (!font) {
    drawStatusMessage('Loading font…');
    return;
  }

  for (let i = 0; i < lineLayers; i++) {
    let threshold = gTextSize * (lineSpacing + layerStep * i);

    for (let line of gLines) {
      line.update(sampleDensity, threshold);
      line.draw(i);
    }
  }
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

class TextLine {
  constructor(text, startX, yp) {
    this.chars = [];
    let xp = startX;

    let index = 0;
    for (let c of text) {
      this.chars.push({ c, xp, yp, index });
      xp += font.textBounds(c, 0, 0, gTextSize).w;
      index++;
    }

    this.rowSegments = [];
  }

  update(sample, threshold) {
    let points = [];

    for (let char of this.chars) {
      let charPoints = font.textToPoints(char.c, char.xp, char.yp, gTextSize, {
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

    this.rowSegments = [];
    for (let row of Object.values(groups)) {
      for (let segment of splitRowIntoSegments(row)) {
        this.rowSegments.push(segment);
      }
    }
  }

  draw(layerIndex) {
    for (let segment of this.rowSegments) {
      drawWeaveSegment(segment, layerIndex);
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

function buildStitchPairs(segment, layerSalt) {
  let pairs = [];
  let i = 0;

  while (i < segment.length) {
    if (threadRandom(segment[i].x, segment[i].y, layerSalt) < 0.1) {
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

function computeThreadGeometry(a, b, layerSalt) {
  let jitterAmt = edgeJitter * gTextSize * 0.018;
  let sagAmt = threadSag * gTextSize * 0.035;

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

function drawCurvedThread(a, b, layerSalt) {
  let thread = computeThreadGeometry(a, b, layerSalt);

  stroke(255, thread.alpha);
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

function threadToSvgPath(thread) {
  let opacity = (thread.alpha / 255).toFixed(3);
  return (
    `<path d="M ${svgNumber(thread.start.x)} ${svgNumber(thread.start.y)} ` +
    `Q ${svgNumber(thread.ctrl.x)} ${svgNumber(thread.ctrl.y)} ` +
    `${svgNumber(thread.end.x)} ${svgNumber(thread.end.y)}" ` +
    `fill="none" stroke="#ffffff" stroke-width="${svgNumber(thread.weight)}" ` +
    `stroke-opacity="${opacity}" stroke-linecap="round"/>`
  );
}

function collectSvgPaths() {
  let paths = [];

  for (let i = 0; i < lineLayers; i++) {
    let threshold = gTextSize * (lineSpacing + layerStep * i);

    for (let line of gLines) {
      line.update(sampleDensity, threshold);

      for (let segment of line.rowSegments) {
        let layerSalt = i * 17.11;
        let pairs = buildStitchPairs(segment, layerSalt);

        for (let pair of pairs) {
          let thread = computeThreadGeometry(
            pair[0],
            pair[1],
            layerSalt + pair[0].charIndex * 0.31
          );
          paths.push(threadToSvgPath(thread));
        }
      }
    }
  }

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
    '  <rect width="100%" height="100%" fill="#000000"/>\n' +
    `  ${paths.join('\n  ')}\n` +
    '</svg>'
  );
}

function downloadSvg() {
  if (!font || gLines.length === 0) {
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

function drawWeaveSegment(segment, layerIndex) {
  let layerSalt = layerIndex * 17.11;
  let pairs = buildStitchPairs(segment, layerSalt);

  for (let pair of pairs) {
    drawCurvedThread(pair[0], pair[1], layerSalt + pair[0].charIndex * 0.31);
  }
}
