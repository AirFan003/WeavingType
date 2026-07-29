// Created for the #Genuary2024 - Generative Typography
// Interactive poster editor with woven typography

let fontEnglish;
let fontChinese;
let gTextSize = 250;
let gLineHeight = 0;
let textChunks = [];
let letterSizeScale = 1;

let canvasTextInput;
let isComposing = false;
let editingChunkId = null;
let editRebuildTimer = null;
let selectedChunkId = null;
let dragState = null;
let nextChunkId = 0;
let lastClickTime = 0;
let lastClickChunkId = null;
let lastEmptyClickTime = 0;
let lastEmptyClickX = 0;
let lastEmptyClickY = 0;
let pendingEmptyClick = null;
let canvasMode = 'edit';
let renderModality = 'weave';
let calligraphyPresetBackup = null;

const DOUBLE_CLICK_MS = 400;
const DRAG_THRESHOLD = 4;
const EMPTY_HIT_RADIUS = 36;
const EMPTY_DOUBLE_CLICK_RADIUS = 12;
const THREAD_BREAK_RADIUS = 30;

let sampleDensity = 0.1;
let withinThreadDensity = 1;
let gapsThreadDensity = 1;
let lineLayers = 10;
let lineSpacing = 0.05;
let layerStep = 0.01;
let strokeW = 0.5;
let edgeJitter = 0.45;
let withinThreadSag = 0.5;
let gapsThreadSag = 0.5;

let connectEnabled = false;
let connectDensity = 0.45;
let connectCount = 14;
let connectMaxUnits = 4;
let connectMaxDist = 10;
let connectMinDist = 0.18;
let connectSag = 1.1;
let connectPairCache = new Map();

const SAG_AMOUNT_SCALE = 0.06;
let letterSpacing = 0.065;
let colorMode = 'monotone';
let backgroundColor = '#0c0b0a';
let backgroundImage = null;
let backgroundImageDataUrl = null;
let paletteColors = ['#e8dcc8', '#c45c3e', '#6b8f71'];

let threadPhysicsMap = new Map();
let prevMouseX = 0;
let prevMouseY = 0;
let mouseVelX = 0;
let mouseVelY = 0;
let mouseNearThreads = false;

let stitchPairCache = new Map();
let threadGeometryCache = new Map();
let paletteRgbCache = {};

let isRecording = false;
let mediaRecorder = null;
let recordStream = null;
let recordedChunks = [];
let recordButton = null;
let recordingIndicator = null;
let ffmpegConverter = null;
let posterArchive = [];
let activeArchiveId = null;
let archiveListElement = null;

const RECORD_FPS = 60;
const RECORD_BITRATE = 16_000_000;

const THREAD_PHYSICS = {
  influenceRadius: 24,
  springK: 0.3,
  damping: 0.7,
  mouseSagStrength: 3.4,
  impulseStrength: 0.28,
  settleThreshold: 0.04,
  brokenSpringK: 0.07,
  brokenDamping: 0.8,
  breakGravity: 0.011,
};

const CJK_REGEX = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
const FONT_ENGLISH =
  'https://cdn.jsdelivr.net/gh/adobe-fonts/source-serif@release/VAR/SourceSerif4Variable-Roman.ttf';
const CHINESE_FONT_STYLES = {
  sans: {
    label: 'Noto Sans · Simplified',
    cssFamily: 'Noto Sans SC',
    subset:
      'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-sc@5.2.5/chinese-simplified-700-normal.woff',
    full: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf',
  },
  'sans-tc': {
    label: 'Noto Sans · Traditional',
    cssFamily: 'Noto Sans TC',
    subset:
      'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-tc@5.2.5/chinese-traditional-700-normal.woff',
    full: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf',
  },
  xing: {
    label: '芝麻行 · Zhi Mang Xing',
    cssFamily: 'Zhi Mang Xing',
    // Full Google Fonts face (not the simplified-only Fontsource subset).
    subset: 'https://fonts.gstatic.com/s/zhimangxing/v19/f0Xw0ey79sErYFtWQ9a2rq-g0ac.ttf',
    full: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/zhimangxing/ZhiMangXing-Regular.ttf',
  },
  kai: {
    label: '马善政 · Regular script',
    cssFamily: 'Ma Shan Zheng',
    subset:
      'https://cdn.jsdelivr.net/fontsource/fonts/ma-shan-zheng@5.2.5/chinese-simplified-400-normal.woff',
    full: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/mashanzheng/MaShanZheng-Regular.ttf',
  },
  cao: {
    label: '刘健毛草 · Cursive',
    cssFamily: 'Liu Jian Mao Cao',
    subset:
      'https://cdn.jsdelivr.net/fontsource/fonts/liu-jian-mao-cao@5.2.5/chinese-simplified-400-normal.woff',
    full: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/liujianmaocao/LiuJianMaoCao-Regular.ttf',
  },
  cang: {
    label: '龙藏 · Calligraphic',
    cssFamily: 'Long Cang',
    subset:
      'https://cdn.jsdelivr.net/fontsource/fonts/long-cang@5.2.5/chinese-simplified-400-normal.woff',
    full: 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/longcang/LongCang-Regular.ttf',
  },
};

let chineseFontStyle = 'sans';
let chineseFontCache = {};
let chineseFontLoadToken = 0;

const A4_RATIO = 297 / 210;
const ARCHIVE_STORAGE_KEY = 'weavingTypePosterArchive';
const MAX_ARCHIVE_ITEMS = 30;

function preload() {
  fontEnglish = loadFont(FONT_ENGLISH);
  fontChinese = loadFont(CHINESE_FONT_STYLES.sans.subset);
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

function getChineseFontStyleConfig(styleId) {
  return CHINESE_FONT_STYLES[styleId] || CHINESE_FONT_STYLES.sans;
}

function syncChineseUiFont() {
  let config = getChineseFontStyleConfig(chineseFontStyle);
  document.documentElement.style.setProperty('--chinese-ui-font', `'${config.cssFamily}'`);
}

function rebuildChineseTextChunks() {
  for (let chunk of textChunks) {
    chunk.rebuildLine();
  }
}

function applyLoadedChineseFont(styleId, loadedFont, markFull) {
  let cacheKey = markFull ? `${styleId}:full` : `${styleId}:subset`;
  chineseFontCache[cacheKey] = loadedFont;

  if (styleId !== chineseFontStyle) {
    return;
  }

  fontChinese = loadedFont;
  rebuildChineseTextChunks();
}

function loadFullChineseFont(styleId = chineseFontStyle) {
  let config = getChineseFontStyleConfig(styleId);
  let fullKey = `${styleId}:full`;

  if (chineseFontCache[fullKey]) {
    if (styleId === chineseFontStyle) {
      fontChinese = chineseFontCache[fullKey];
      rebuildChineseTextChunks();
    }
    return;
  }

  loadFont(
    config.full,
    (loadedFont) => {
      applyLoadedChineseFont(styleId, loadedFont, true);
    },
    (error) => {
      console.warn(`Extended Chinese font unavailable for ${styleId}, using subset font.`, error);
    }
  );
}

function setChineseFontStyle(styleId, options = {}) {
  let config = getChineseFontStyleConfig(styleId);
  let nextStyle = CHINESE_FONT_STYLES[styleId] ? styleId : 'sans';
  let forceReload = options.forceReload === true;
  let styleSelect = select('#chinese-font-style');

  if (!forceReload && nextStyle === chineseFontStyle && fontChinese) {
    if (styleSelect) {
      styleSelect.value(nextStyle);
    }
    syncChineseUiFont();
    return;
  }

  chineseFontStyle = nextStyle;
  syncChineseUiFont();

  if (styleSelect) {
    styleSelect.value(nextStyle);
  }

  let fullKey = `${nextStyle}:full`;
  let subsetKey = `${nextStyle}:subset`;

  if (chineseFontCache[fullKey]) {
    fontChinese = chineseFontCache[fullKey];
    rebuildChineseTextChunks();
    return;
  }

  if (chineseFontCache[subsetKey]) {
    fontChinese = chineseFontCache[subsetKey];
    rebuildChineseTextChunks();
    loadFullChineseFont(nextStyle);
    return;
  }

  let loadToken = ++chineseFontLoadToken;
  if (styleSelect) {
    styleSelect.attribute('disabled', '');
  }

  loadFont(
    config.subset,
    (loadedFont) => {
      chineseFontCache[subsetKey] = loadedFont;

      if (loadToken !== chineseFontLoadToken || nextStyle !== chineseFontStyle) {
        return;
      }

      fontChinese = loadedFont;
      rebuildChineseTextChunks();
      if (styleSelect) {
        styleSelect.removeAttribute('disabled');
      }
      loadFullChineseFont(nextStyle);
    },
    (error) => {
      console.warn(`Failed to load Chinese font style ${nextStyle}`, error);
      if (styleSelect && loadToken === chineseFontLoadToken) {
        styleSelect.removeAttribute('disabled');
      }
    }
  );
}

function bindChineseFontControls() {
  let styleSelect = select('#chinese-font-style');
  if (!styleSelect) {
    return;
  }

  styleSelect.changed(() => {
    setChineseFontStyle(styleSelect.value());
  });
  styleSelect.value(chineseFontStyle);
  syncChineseUiFont();
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
  initDefaultBlocks();
  loadArchiveFromStorage();
  renderArchivePanel();
  chineseFontCache['sans:subset'] = fontChinese;
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

function bindControls() {
  canvasTextInput = select('#canvas-text-input');

  canvasTextInput.elt.addEventListener('compositionstart', () => {
    isComposing = true;
  });
  canvasTextInput.elt.addEventListener('compositionend', () => {
    isComposing = false;
    applyEditingInput(true);
  });

  canvasTextInput.input(() => {
    if (isComposing) {
      return;
    }
    applyEditingInput(false);
  });

  canvasTextInput.elt.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      finishEditing();
    }
  });

  enhanceThickSliders();
  bindChineseFontControls();

  bindSlider('density-slider', 'density-value', (v) => {
    sampleDensity = v;
    invalidateWeaveCaches();
  });
  bindSlider('within-density-slider', 'within-density-value', (v) => {
    withinThreadDensity = v;
    stitchPairCache.clear();
  });
  bindSlider('gaps-density-slider', 'gaps-density-value', (v) => {
    gapsThreadDensity = v;
    stitchPairCache.clear();
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
    invalidateWeaveCaches();
  });
  bindSlider('spacing-slider', 'spacing-value', (v) => {
    lineSpacing = v;
    invalidateWeaveCaches();
  });
  bindSlider('step-slider', 'step-value', (v) => {
    layerStep = v;
    invalidateWeaveCaches();
  });
  bindSlider('stroke-slider', 'stroke-value', (v) => {
    strokeW = v;
    invalidateThreadGeometryCache();
  });
  bindSlider('jitter-slider', 'jitter-value', (v) => {
    edgeJitter = v;
    invalidateThreadGeometryCache();
  });
  bindSlider('within-sag-slider', 'within-sag-value', (v) => {
    withinThreadSag = v;
    invalidateThreadGeometryCache();
  });
  bindSlider('gaps-sag-slider', 'gaps-sag-value', (v) => {
    gapsThreadSag = v;
    invalidateThreadGeometryCache();
  });
  bindSlider('connect-density-slider', 'connect-density-value', (v) => {
    connectDensity = v;
    connectPairCache.clear();
  });
  bindSlider('connect-count-slider', 'connect-count-value', (v) => {
    connectCount = Math.round(v);
    connectPairCache.clear();
  });
  bindSlider('connect-max-units-slider', 'connect-max-units-value', (v) => {
    connectMaxUnits = Math.round(v);
    connectPairCache.clear();
  });
  bindSlider('connect-max-dist-slider', 'connect-max-dist-value', (v) => {
    connectMaxDist = v;
    connectPairCache.clear();
  });
  bindSlider('connect-min-dist-slider', 'connect-min-dist-value', (v) => {
    connectMinDist = v;
    connectPairCache.clear();
  });
  bindSlider('connect-sag-slider', 'connect-sag-value', (v) => {
    connectSag = v;
    invalidateThreadGeometryCache();
  });
  bindSlider('chunk-scale-slider', 'chunk-scale-value', (v) => {
    let chunk = getSelectedChunk();
    if (chunk) {
      chunk.scale = v;
      chunk.rebuildLine();
    }
  });

  bindColorControls();
  bindBackgroundImageControls();
  bindCanvasModeControls();
  bindRenderModalityControls();
  bindConnectControls();
  select('#save-canvas').mousePressed(saveCanvasToArchive);
  select('#download-svg').mousePressed(downloadSvg);
  select('#download-png').mousePressed(downloadPng);
  recordButton = select('#record-canvas');
  recordingIndicator = document.getElementById('recording-indicator');
  archiveListElement = document.getElementById('archive-list');
  recordButton.mousePressed(toggleCanvasRecording);
  updateRecordButton();
  syncAllRangeSliderFills();
}

function isEditMode() {
  return canvasMode === 'edit';
}

function isPerformanceMode() {
  return canvasMode === 'performance';
}

function bindCanvasModeControls() {
  select('#mode-edit').mousePressed(() => setCanvasMode('edit'));
  select('#mode-performance').mousePressed(() => setCanvasMode('performance'));
  updateModeUI();
}

function setCanvasMode(mode) {
  if (canvasMode === mode) {
    return;
  }

  if (mode === 'performance') {
    if (editingChunkId) {
      finishEditing();
    }
    selectedChunkId = null;
    updateSelectionControls();
  }

  canvasMode = mode;
  updateModeUI();
}

function updateModeUI() {
  let editBtn = select('#mode-edit');
  let perfBtn = select('#mode-performance');

  if (isEditMode()) {
    editBtn.addClass('is-active');
    perfBtn.removeClass('is-active');
  } else {
    editBtn.removeClass('is-active');
    perfBtn.addClass('is-active');
  }
}

function isCalligraphyModality() {
  return renderModality === 'calligraphy';
}

function bindRenderModalityControls() {
  select('#modality-weave').mousePressed(() => setRenderModality('weave'));
  select('#modality-calligraphy').mousePressed(() => setRenderModality('calligraphy'));
  updateRenderModalityUI();
}

function updateRenderModalityUI() {
  let weaveBtn = select('#modality-weave');
  let calligBtn = select('#modality-calligraphy');

  if (isCalligraphyModality()) {
    weaveBtn.removeClass('is-active');
    calligBtn.addClass('is-active');
  } else {
    weaveBtn.addClass('is-active');
    calligBtn.removeClass('is-active');
  }
}

function captureLiveControlSnapshot() {
  return {
    letterSizeScale,
    letterSpacing,
    sampleDensity,
    withinThreadDensity,
    gapsThreadDensity,
    lineLayers,
    lineSpacing,
    layerStep,
    strokeW,
    edgeJitter,
    withinThreadSag,
    gapsThreadSag,
    connectEnabled,
    connectDensity,
    connectCount,
    connectMaxUnits,
    connectMaxDist,
    connectMinDist,
    connectSag,
    colorMode,
    chineseFontStyle,
    backgroundColor,
    paletteColors: [...paletteColors],
  };
}

function applyLiveControlSnapshot(settings, options = {}) {
  letterSizeScale = settings.letterSizeScale;
  letterSpacing = settings.letterSpacing;
  sampleDensity = settings.sampleDensity;
  withinThreadDensity = settings.withinThreadDensity;
  gapsThreadDensity = settings.gapsThreadDensity;
  lineLayers = settings.lineLayers;
  lineSpacing = settings.lineSpacing;
  layerStep = settings.layerStep;
  strokeW = settings.strokeW;
  edgeJitter = settings.edgeJitter;
  withinThreadSag = settings.withinThreadSag;
  gapsThreadSag = settings.gapsThreadSag;
  connectEnabled = settings.connectEnabled === true;
  connectDensity = settings.connectDensity ?? connectDensity;
  connectCount = settings.connectCount ?? connectCount;
  connectMaxUnits = settings.connectMaxUnits ?? connectMaxUnits;
  connectMaxDist = settings.connectMaxDist ?? connectMaxDist;
  connectMinDist = settings.connectMinDist ?? connectMinDist;
  connectSag = settings.connectSag ?? connectSag;
  colorMode = settings.colorMode;
  backgroundColor = settings.backgroundColor;
  paletteColors = [...settings.paletteColors];

  setSliderControl('letter-size-slider', 'letter-size-value', letterSizeScale, letterSizeScale.toFixed(2));
  setSliderControl('letter-spacing-slider', 'letter-spacing-value', letterSpacing, letterSpacing.toFixed(3));
  setSliderControl('density-slider', 'density-value', sampleDensity, sampleDensity.toFixed(2));
  setSliderControl('within-density-slider', 'within-density-value', withinThreadDensity, withinThreadDensity.toFixed(2));
  setSliderControl('gaps-density-slider', 'gaps-density-value', gapsThreadDensity, gapsThreadDensity.toFixed(2));
  setSliderControl('layers-slider', 'layers-value', lineLayers, String(lineLayers));
  setSliderControl('spacing-slider', 'spacing-value', lineSpacing, lineSpacing.toFixed(2));
  setSliderControl('step-slider', 'step-value', layerStep, layerStep.toFixed(3));
  setSliderControl('stroke-slider', 'stroke-value', strokeW, strokeW.toFixed(2));
  setSliderControl('jitter-slider', 'jitter-value', edgeJitter, edgeJitter.toFixed(2));
  setSliderControl('within-sag-slider', 'within-sag-value', withinThreadSag, withinThreadSag.toFixed(2));
  setSliderControl('gaps-sag-slider', 'gaps-sag-value', gapsThreadSag, gapsThreadSag.toFixed(2));
  setSliderControl('connect-density-slider', 'connect-density-value', connectDensity, connectDensity.toFixed(2));
  setSliderControl('connect-count-slider', 'connect-count-value', connectCount, String(connectCount));
  setSliderControl('connect-max-units-slider', 'connect-max-units-value', connectMaxUnits, String(connectMaxUnits));
  setSliderControl('connect-max-dist-slider', 'connect-max-dist-value', connectMaxDist, connectMaxDist.toFixed(2));
  setSliderControl('connect-min-dist-slider', 'connect-min-dist-value', connectMinDist, connectMinDist.toFixed(2));
  setSliderControl('connect-sag-slider', 'connect-sag-value', connectSag, connectSag.toFixed(2));
  updateConnectUI();

  select('#color-mode').value(colorMode);
  select('#bg-color').value(backgroundColor);
  select('#color-1').value(paletteColors[0]);
  select('#color-2').value(paletteColors[1]);
  select('#color-3').value(paletteColors[2]);
  updateColorControlVisibility();

  if (options.syncFont !== false) {
    setChineseFontStyle(settings.chineseFontStyle || 'sans');
  }

  syncCanvasMetrics();
  syncAllRangeSliderFills();
  invalidateWeaveCaches();
  stitchPairCache.clear();
  invalidateThreadGeometryCache();
}

function getCalligraphyPreset() {
  return {
    letterSizeScale,
    letterSpacing,
    sampleDensity: 0.17,
    withinThreadDensity: 1,
    gapsThreadDensity: 0.92,
    lineLayers: 16,
    lineSpacing: 0.036,
    layerStep: 0.006,
    strokeW: 0.42,
    edgeJitter: 0.95,
    withinThreadSag: 0.28,
    gapsThreadSag: 0.4,
    colorMode: 'monotone',
    chineseFontStyle: chineseFontStyle === 'sans' ? 'cang' : chineseFontStyle,
    backgroundColor: '#f4efe6',
    paletteColors: ['#0d0b09', paletteColors[1] || '#c45c3e', paletteColors[2] || '#6b8f71'],
  };
}

function setRenderModality(mode) {
  if (mode !== 'weave' && mode !== 'calligraphy') {
    return;
  }

  if (mode === renderModality) {
    updateRenderModalityUI();
    return;
  }

  if (mode === 'calligraphy') {
    calligraphyPresetBackup = captureLiveControlSnapshot();
    renderModality = 'calligraphy';
    applyLiveControlSnapshot(getCalligraphyPreset());
  } else {
    renderModality = 'weave';
    if (calligraphyPresetBackup) {
      applyLiveControlSnapshot(calligraphyPresetBackup);
      calligraphyPresetBackup = null;
    } else {
      invalidateWeaveCaches();
    }
  }

  updateRenderModalityUI();
}

function isConnectEnabled() {
  return connectEnabled;
}

function bindConnectControls() {
  select('#connect-off').mousePressed(() => setConnectEnabled(false));
  select('#connect-on').mousePressed(() => setConnectEnabled(true));
  updateConnectUI();
}

function setConnectEnabled(enabled) {
  connectEnabled = Boolean(enabled);
  connectPairCache.clear();
  updateConnectUI();
}

function updateConnectUI() {
  let offBtn = select('#connect-off');
  let onBtn = select('#connect-on');
  let controls = select('#connect-controls');

  if (connectEnabled) {
    offBtn.removeClass('is-active');
    onBtn.addClass('is-active');
    if (controls) {
      controls.removeClass('is-disabled');
    }
  } else {
    onBtn.removeClass('is-active');
    offBtn.addClass('is-active');
    if (controls) {
      controls.addClass('is-disabled');
    }
  }
}

function createThreadState() {
  return { sag: 0, velSag: 0, broken: false, breakDrop: 0 };
}

function ensureThreadState(id) {
  if (!threadPhysicsMap.has(id)) {
    threadPhysicsMap.set(id, createThreadState());
  }

  return threadPhysicsMap.get(id);
}

function threadBreakRadius(textSize) {
  return THREAD_BREAK_RADIUS * (textSize / 180);
}

function findNearestThreadHit(mx, my) {
  let best = null;

  let consider = (pair, layerSalt, inside, textSize) => {
    let thread = getThreadGeometry(pair[0], pair[1], layerSalt, inside, textSize);
    let radius = threadBreakRadius(textSize);
    let threadDist = fastDistanceToThread(mx, my, thread, radius);

    if (threadDist <= radius && (!best || threadDist < best.dist)) {
      best = {
        id: threadPhysicsId(pair[0], pair[1], layerSalt),
        dist: threadDist,
        textSize,
      };
    }
  };

  forEachWeaveThread((pair, layerSalt, inside, textSize) => {
    consider(pair, layerSalt, inside, textSize);
  });

  forEachConnectThread((pair, layerSalt, inside, textSize) => {
    consider(pair, layerSalt, inside, textSize);
  });

  return best;
}

function breakThreadAt(mx, my) {
  let hit = findNearestThreadHit(mx, my);
  if (!hit) {
    return;
  }

  let state = ensureThreadState(hit.id);

  if (state.broken) {
    state.breakDrop += hit.textSize * 0.14;
    state.velSag += hit.textSize * 0.2;
  } else {
    state.broken = true;
    state.breakDrop = hit.textSize * (0.38 + threadRandom(mx, my, hit.textSize) * 0.18);
    state.velSag += hit.textSize * 0.48;
    state.sag += hit.textSize * 0.1;
  }
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

function bindBackgroundImageControls() {
  let fileInput = select('#bg-image-input');
  let uploadButton = select('#bg-image-upload');
  let clearButton = select('#bg-image-clear');

  uploadButton.mousePressed(() => {
    fileInput.elt.click();
  });

  fileInput.elt.addEventListener('change', () => {
    let file = fileInput.elt.files && fileInput.elt.files[0];
    if (!file) {
      return;
    }

    setBackgroundImageFromFile(file, () => {
      fileInput.elt.value = '';
    });
  });

  clearButton.mousePressed(clearBackgroundImage);
  updateBackgroundImageUI();
}

function updateBackgroundImageUI() {
  let clearButton = select('#bg-image-clear');
  let label = select('#bg-image-label');

  if (backgroundImageDataUrl) {
    clearButton.removeClass('is-hidden');
    label.removeClass('is-hidden');
    label.html('Background image loaded');
  } else {
    clearButton.addClass('is-hidden');
    label.addClass('is-hidden');
    label.html('');
  }
}

function setBackgroundImageFromFile(file, onComplete) {
  if (!file.type.startsWith('image/')) {
    window.alert('Please choose an image file.');
    if (onComplete) {
      onComplete();
    }
    return;
  }

  let reader = new FileReader();
  reader.onload = () => {
    optimizeBackgroundImageDataUrl(reader.result, (dataUrl) => {
      loadBackgroundImageFromDataUrl(dataUrl);
      if (onComplete) {
        onComplete();
      }
    });
  };
  reader.onerror = () => {
    window.alert('Could not read that image file.');
    if (onComplete) {
      onComplete();
    }
  };
  reader.readAsDataURL(file);
}

function optimizeBackgroundImageDataUrl(dataUrl, onReady) {
  let img = new Image();
  img.onload = () => {
    let maxDim = max(width, height) * 2;
    let scale = min(1, maxDim / max(img.width, img.height));
    let targetW = max(1, floor(img.width * scale));
    let targetH = max(1, floor(img.height * scale));
    let canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    canvas.getContext('2d').drawImage(img, 0, 0, targetW, targetH);
    onReady(canvas.toDataURL('image/jpeg', 0.88));
  };
  img.onerror = () => {
    onReady(dataUrl);
  };
  img.src = dataUrl;
}

function loadBackgroundImageFromDataUrl(dataUrl) {
  if (!dataUrl) {
    backgroundImage = null;
    backgroundImageDataUrl = null;
    updateBackgroundImageUI();
    return;
  }

  loadImage(
    dataUrl,
    (img) => {
      backgroundImage = img;
      backgroundImageDataUrl = dataUrl;
      updateBackgroundImageUI();
    },
    (error) => {
      console.warn('Could not load background image.', error);
      backgroundImage = null;
      backgroundImageDataUrl = null;
      updateBackgroundImageUI();
    }
  );
}

function clearBackgroundImage() {
  backgroundImage = null;
  backgroundImageDataUrl = null;
  select('#bg-image-input').elt.value = '';
  updateBackgroundImageUI();
}

function getBackgroundImageCoverRect(imgW, imgH) {
  let scale = max(width / imgW, height / imgH);
  let drawW = imgW * scale;
  let drawH = imgH * scale;

  return {
    x: (width - drawW) / 2,
    y: (height - drawH) / 2,
    w: drawW,
    h: drawH,
  };
}

function drawCanvasBackground() {
  let bg = hexToRgb(backgroundColor);
  background(bg.r, bg.g, bg.b);

  if (!backgroundImage || !backgroundImage.width) {
    return;
  }

  let rect = getBackgroundImageCoverRect(backgroundImage.width, backgroundImage.height);
  push();
  noStroke();
  image(backgroundImage, rect.x, rect.y, rect.w, rect.h);
  pop();
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
  select('#selected-chunk-label').html(`Selected: ${chunk.text || '(new text)'}`);
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

function enhanceThickSliders() {
  for (let row of document.querySelectorAll('.control-row')) {
    let input = row.querySelector('input[type="range"]');
    if (!input || input.closest('.thick-slider')) {
      continue;
    }

    let label = row.querySelector('label');
    let valueEl = row.querySelector('.control-value');
    if (!label || !valueEl) {
      continue;
    }

    let labelText = label.textContent.trim();
    let wrapper = document.createElement('div');
    wrapper.className = 'thick-slider';

    let face = document.createElement('div');
    face.className = 'thick-slider__face';

    let fill = document.createElement('div');
    fill.className = 'thick-slider__fill';

    let faceLabel = document.createElement('span');
    faceLabel.className = 'thick-slider__label';
    faceLabel.textContent = labelText;

    let faceValue = document.createElement('span');
    faceValue.className = 'thick-slider__value';
    faceValue.id = valueEl.id;

    face.append(fill, faceLabel, faceValue);

    input.classList.add('thick-slider__input');
    input.setAttribute('aria-label', labelText);
    wrapper.append(face, input);

    let controlInput = row.querySelector('.control-input');
    controlInput.innerHTML = '';
    controlInput.appendChild(wrapper);
    label.remove();
  }
}

function syncRangeSliderFill(sliderEl) {
  let min = parseFloat(sliderEl.min) || 0;
  let max = parseFloat(sliderEl.max) || 100;
  let value = parseFloat(sliderEl.value) || 0;
  let pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  let wrapper = sliderEl.closest('.thick-slider');
  if (wrapper) {
    let fill = wrapper.querySelector('.thick-slider__fill');
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.classList.toggle('is-empty', pct <= 0.5);
    }
    return;
  }

  sliderEl.style.setProperty('--range-progress', `${pct}%`);
}

function syncAllRangeSliderFills() {
  for (let input of document.querySelectorAll('input[type="range"]')) {
    syncRangeSliderFill(input);
  }
}

function bindSlider(sliderId, labelId, onChange) {
  let slider = select(`#${sliderId}`);
  let label = select(`#${labelId}`);

  let update = () => {
    let value = parseFloat(slider.value());
    label.html(
      sliderId === 'layers-slider' ||
      sliderId === 'connect-count-slider' ||
      sliderId === 'connect-max-units-slider'
        ? String(Math.round(value))
        : value.toFixed(
            sliderId === 'step-slider' || sliderId === 'letter-spacing-slider' ? 3 : 2
          )
    );
    syncRangeSliderFill(slider.elt);
    onChange(value);
  };

  slider.input(update);
  update();
}

function initDefaultBlocks() {
  let ascender = max(
    fontEnglish.textBounds('Hg', 0, 0, gTextSize).h,
    fontChinese.textBounds('中', 0, 0, gTextSize).h
  );

  textChunks = [createTextBlock(width * 0.12, height * 0.22 + ascender * 0.2, 'threading')];
  selectedChunkId = textChunks[0].id;
  updateSelectionControls();
}

function createTextBlock(x, y, textValue = '', scale = 1) {
  return new TextChunk(textValue, x, y, scale);
}

function removeTextBlock(id) {
  textChunks = textChunks.filter((chunk) => chunk.id !== id);

  if (selectedChunkId === id) {
    selectedChunkId = null;
  }
  if (editingChunkId === id) {
    editingChunkId = null;
    hideCanvasTextInput();
  }

  invalidateWeaveCaches();
  updateSelectionControls();
}

function getEditingChunk() {
  return getChunkById(editingChunkId);
}

function applyEditingInput(immediate) {
  let chunk = getEditingChunk();
  if (!chunk) {
    return;
  }

  chunk.text = canvasTextInput.value();

  if (immediate) {
    chunk.rebuildLine();
    syncCanvasTextInputPosition();
  } else {
    scheduleEditingRebuild(chunk);
  }

  updateSelectionControls();
}

function scheduleEditingRebuild(chunk) {
  if (editRebuildTimer) {
    clearTimeout(editRebuildTimer);
  }

  editRebuildTimer = setTimeout(() => {
    chunk.rebuildLine();
    syncCanvasTextInputPosition();
    editRebuildTimer = null;
  }, 120);
}

function startEditingChunk(id) {
  let chunk = getChunkById(id);
  if (!chunk) {
    return;
  }

  editingChunkId = id;
  selectedChunkId = id;
  canvasTextInput.value(chunk.text);
  showCanvasTextInput();
  syncCanvasTextInputPosition();
  canvasTextInput.elt.focus();
  updateSelectionControls();
}

function finishEditing() {
  if (!editingChunkId) {
    return;
  }

  if (editRebuildTimer) {
    clearTimeout(editRebuildTimer);
    editRebuildTimer = null;
  }

  let chunk = getChunkById(editingChunkId);
  if (chunk) {
    chunk.text = canvasTextInput.value();
    chunk.rebuildLine();

    if (!chunk.text.trim()) {
      removeTextBlock(editingChunkId);
    }
  }

  editingChunkId = null;
  hideCanvasTextInput();
  updateSelectionControls();
}

function showCanvasTextInput() {
  canvasTextInput.elt.style.display = 'block';
}

function hideCanvasTextInput() {
  canvasTextInput.elt.style.display = 'none';
}

function syncCanvasTextInputPosition() {
  let chunk = getEditingChunk();
  if (!chunk) {
    hideCanvasTextInput();
    return;
  }

  let canvas = document.querySelector('#a4-frame canvas');
  if (!canvas) {
    return;
  }

  let rect = canvas.getBoundingClientRect();
  let scaleX = rect.width / width;
  let scaleY = rect.height / height;
  let textSize = chunk.textSize();
  let bounds = chunk.getBounds();
  let inputWidth = max(48, bounds.w + textSize * 0.35);

  canvasTextInput.elt.style.left = `${chunk.x * scaleX}px`;
  canvasTextInput.elt.style.top = `${(chunk.y - textSize * 0.72) * scaleY}px`;
  canvasTextInput.elt.style.fontSize = `${textSize * scaleY}px`;
  canvasTextInput.elt.style.width = `${inputWidth * scaleX}px`;
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

function geometryRenderSalt() {
  return `${withinThreadSag.toFixed(3)}|${gapsThreadSag.toFixed(3)}|${connectSag.toFixed(3)}|${edgeJitter.toFixed(3)}|${strokeW.toFixed(3)}`;
}

function invalidateThreadGeometryCache() {
  threadGeometryCache.clear();
}

function invalidateWeaveCaches() {
  stitchPairCache.clear();
  connectPairCache.clear();
  invalidateThreadGeometryCache();

  for (let chunk of textChunks) {
    if (chunk.line) {
      chunk.line.invalidateCache();
    }
  }
}

function getPaletteRgb(hex) {
  if (!paletteRgbCache[hex]) {
    paletteRgbCache[hex] = hexToRgb(hex);
  }

  return paletteRgbCache[hex];
}

function forEachWeaveThread(onThread) {
  for (let chunk of textChunks) {
    let line = chunk.line;
    let textSize = chunk.textSize();

    line.ensureRawPoints(sampleDensity);

    for (let i = 0; i < lineLayers; i++) {
      let layerSalt = i * 17.11;
      let threshold = textSize * (lineSpacing + layerStep * i);
      let segments = line.segmentsForThreshold(threshold);

      for (let segment of segments) {
        let pairs = stitchPairsForSegment(segment, layerSalt);

        for (let pair of pairs) {
          let inside = line.isWithinLetterBody(pair[0], pair[1]);
          onThread(pair, layerSalt + pair[0].charIndex * 0.31, inside, textSize, chunk);
        }
      }
    }
  }
}

function boundsGapDistance(a, b) {
  let dx = 0;
  let dy = 0;

  if (a.x + a.w < b.x) {
    dx = b.x - (a.x + a.w);
  } else if (b.x + b.w < a.x) {
    dx = a.x - (b.x + b.w);
  }

  if (a.y + a.h < b.y) {
    dy = b.y - (a.y + a.h);
  } else if (b.y + b.h < a.y) {
    dy = a.y - (b.y + b.h);
  }

  return sqrt(dx * dx + dy * dy);
}

function chunkSalt(chunk) {
  let id = String(chunk && chunk.id != null ? chunk.id : '');
  let match = id.match(/(\d+)$/);
  if (match) {
    return Number(match[1]);
  }

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return abs(hash);
}

function unitSalt(unitId) {
  let id = String(unitId || '');
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 33 + id.charCodeAt(i)) | 0;
  }
  return abs(hash);
}

function boundsFromPoints(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let pt of points) {
    minX = min(minX, pt.x);
    minY = min(minY, pt.y);
    maxX = max(maxX, pt.x);
    maxY = max(maxY, pt.y);
  }

  if (!isFinite(minX)) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  return {
    x: minX,
    y: minY,
    w: max(1, maxX - minX),
    h: max(1, maxY - minY),
  };
}

function boundsCenter(bounds) {
  return {
    x: bounds.x + bounds.w * 0.5,
    y: bounds.y + bounds.h * 0.5,
  };
}

function subsampleConnectPoints(points, textSize) {
  if (!points || points.length === 0) {
    return [];
  }

  let target = constrain(floor(28 + connectDensity * 90), 24, 140);
  let step = max(1, floor(points.length / target));
  let sampled = [];

  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
  }

  return sampled;
}

function collectConnectUnits() {
  let units = [];

  for (let chunk of textChunks) {
    if (!chunk.text || !chunk.line) {
      continue;
    }

    chunk.line.ensureRawPoints(sampleDensity);
    let points = chunk.line.rawPoints;
    if (!points || points.length === 0) {
      continue;
    }

    let byChar = new Map();
    for (let pt of points) {
      let key = pt.charIndex;
      if (!byChar.has(key)) {
        byChar.set(key, []);
      }
      byChar.get(key).push(pt);
    }

    let textSize = chunk.textSize();

    for (let [charIndex, charPoints] of byChar) {
      if (!charPoints.length) {
        continue;
      }

      let bounds = boundsFromPoints(charPoints);
      units.push({
        id: `${chunk.id}:${charIndex}`,
        chunk,
        charIndex,
        points: charPoints,
        bounds,
        center: boundsCenter(bounds),
        textSize,
      });
    }
  }

  return units;
}

function connectPairCacheKey(unitA, unitB, maxReach) {
  let a = unitA.bounds;
  let b = unitB.bounds;
  return (
    `${unitA.id}|${unitB.id}|${sampleDensity.toFixed(3)}|${connectDensity.toFixed(3)}|` +
    `${connectCount}|${connectMaxUnits}|${connectMaxDist.toFixed(3)}|${connectMinDist.toFixed(3)}|` +
    `${maxReach.toFixed(1)}|` +
    `${a.x.toFixed(1)}|${a.y.toFixed(1)}|${a.w.toFixed(1)}|${a.h.toFixed(1)}|` +
    `${b.x.toFixed(1)}|${b.y.toFixed(1)}|${b.w.toFixed(1)}|${b.h.toFixed(1)}`
  );
}

function buildConnectPairsForUnits(unitA, unitB, maxReach) {
  let key = connectPairCacheKey(unitA, unitB, maxReach);
  if (connectPairCache.has(key)) {
    return connectPairCache.get(key);
  }

  let textSize = max(unitA.textSize, unitB.textSize);
  let minDist = textSize * connectMinDist;
  let maxDist = maxReach;
  let minDistSq = minDist * minDist;
  let maxDistSq = maxDist * maxDist;
  let pointsA = subsampleConnectPoints(unitA.points, textSize);
  let pointsB = subsampleConnectPoints(unitB.points, textSize);
  let candidates = [];

  for (let i = 0; i < pointsA.length; i++) {
    let a = pointsA[i];
    for (let j = 0; j < pointsB.length; j++) {
      let b = pointsB[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let distSq = dx * dx + dy * dy;

      if (distSq < minDistSq || distSq > maxDistSq) {
        continue;
      }

      let score =
        distSq * (0.65 + threadRandom(a.x, a.y, 210.4 + j) * 0.7) +
        threadRandom(b.x, b.y, 311.7 + i) * textSize * textSize * 0.08;

      if (threadRandom(a.x, b.y, 412.2 + i + j) < skipChanceForDensity(connectDensity)) {
        continue;
      }

      candidates.push({ a, b, score });
    }
  }

  candidates.sort((left, right) => left.score - right.score);

  let pairs = [];
  let usedA = new Set();
  let usedB = new Set();
  let limit = max(1, connectCount);

  for (let candidate of candidates) {
    if (pairs.length >= limit) {
      break;
    }

    let aKey = `${candidate.a.x.toFixed(1)}|${candidate.a.y.toFixed(1)}`;
    let bKey = `${candidate.b.x.toFixed(1)}|${candidate.b.y.toFixed(1)}`;
    if (usedA.has(aKey) || usedB.has(bKey)) {
      continue;
    }

    usedA.add(aKey);
    usedB.add(bKey);
    pairs.push([candidate.a, candidate.b]);
  }

  if (connectPairCache.size > 400) {
    connectPairCache.clear();
  }

  connectPairCache.set(key, pairs);
  return pairs;
}

function forEachConnectThread(onThread) {
  if (!connectEnabled) {
    return;
  }

  let units = collectConnectUnits();
  if (units.length < 2) {
    return;
  }

  let canvasReach = dist(0, 0, width, height);
  let neighborLimit = max(1, connectMaxUnits - 1);
  let linked = new Set();

  for (let i = 0; i < units.length; i++) {
    let unitA = units[i];
    let neighbors = [];

    for (let j = 0; j < units.length; j++) {
      if (i === j) {
        continue;
      }

      let unitB = units[j];
      let reach = max(
        max(unitA.textSize, unitB.textSize) * connectMaxDist,
        canvasReach * min(1, connectMaxDist / 20)
      );
      let gap = boundsGapDistance(unitA.bounds, unitB.bounds);
      if (gap > reach) {
        continue;
      }

      let centerDist = dist(unitA.center.x, unitA.center.y, unitB.center.x, unitB.center.y);
      neighbors.push({ unit: unitB, gap, centerDist, reach });
    }

    neighbors.sort((left, right) => left.centerDist - right.centerDist);
    neighbors = neighbors.slice(0, neighborLimit);

    for (let entry of neighbors) {
      let unitB = entry.unit;
      let pairKey = unitA.id < unitB.id ? `${unitA.id}::${unitB.id}` : `${unitB.id}::${unitA.id}`;
      if (linked.has(pairKey)) {
        continue;
      }
      linked.add(pairKey);

      let textSize = max(unitA.textSize, unitB.textSize);
      let pairs = buildConnectPairsForUnits(unitA, unitB, entry.reach);
      let pairSalt = 900 + unitSalt(unitA.id) * 0.17 + unitSalt(unitB.id) * 0.29;

      for (let p = 0; p < pairs.length; p++) {
        onThread(pairs[p], pairSalt + p * 3.17, 'connect', textSize, unitA.chunk, unitB.chunk);
      }
    }
  }
}

function renderInteractiveThread(
  pair,
  layerSalt,
  inside,
  textSize,
  chunkNear,
  influenceRadius,
  mouseInfluence,
  activeThreadIds
) {
  let id = threadPhysicsId(pair[0], pair[1], layerSalt);
  let thread = getThreadGeometry(pair[0], pair[1], layerSalt, inside, textSize);
  let state = threadPhysicsMap.get(id);
  let nearMouse = false;
  let threadDist = Infinity;

  if (chunkNear || (state && !threadPhysicsIsSettled(state, textSize))) {
    threadDist = fastDistanceToThread(mouseX, mouseY, thread, influenceRadius);

    if (chunkNear && mouseInfluence && threadDist < influenceRadius * 1.15) {
      nearMouse = true;
    }
  } else if (isPerformanceMode() && mouseInfluence) {
    let breakRadius = threadBreakRadius(textSize);
    threadDist = fastDistanceToThread(mouseX, mouseY, thread, breakRadius);

    if (threadDist <= breakRadius) {
      mouseNearThreads = true;
    }
  }

  let simulate = nearMouse || (state && !threadPhysicsIsSettled(state, textSize));

  if (!simulate && !state) {
    renderCurvedThread(thread, pair[0], pair[1], layerSalt);
    return;
  }

  if (!state) {
    state = createThreadState();
    threadPhysicsMap.set(id, state);
  }

  activeThreadIds.add(id);

  if (simulate) {
    if (mouseInfluence && threadDist < influenceRadius && !state.broken) {
      applyThreadMouseInfluence(state, thread, textSize, threadDist, influenceRadius, inside);
      mouseNearThreads = true;
    }

    stepThreadPhysics(state, textSize);
  }

  applyThreadPhysicsToGeometry(thread, state);
  renderCurvedThread(thread, pair[0], pair[1], layerSalt);
}

function buildChunkInteraction(mouseInfluence) {
  let interaction = new Map();

  for (let chunk of textChunks) {
    let textSize = chunk.textSize();
    let influenceRadius = threadInfluenceRadius(textSize);
    let bounds = chunk.getBounds();

    interaction.set(chunk.id, {
      textSize,
      influenceRadius,
      bounds,
      chunkNear:
        mouseInfluence &&
        mouseX >= bounds.x - influenceRadius &&
        mouseX <= bounds.x + bounds.w + influenceRadius &&
        mouseY >= bounds.y - influenceRadius &&
        mouseY <= bounds.y + bounds.h + influenceRadius * 2,
    });
  }

  return interaction;
}

function draw() {
  drawCanvasBackground();

  if (!fontsReady()) {
    drawStatusMessage('Loading fonts…');
    return;
  }

  mouseVelX = mouseX - prevMouseX;
  mouseVelY = mouseY - prevMouseY;
  prevMouseX = mouseX;
  prevMouseY = mouseY;
  mouseNearThreads = false;

  if (isCalligraphyModality()) {
    drawCalligraphyUnderlay();
    drawCalligraphyMesh();
  }

  let mouseInfluence =
    !dragState &&
    !editingChunkId &&
    isPerformanceMode() &&
    mouseX >= 0 &&
    mouseY >= 0 &&
    mouseX <= width &&
    mouseY <= height;
  let activeThreadIds = new Set();
  let chunkInteraction = buildChunkInteraction(mouseInfluence);

  forEachWeaveThread((pair, layerSalt, inside, textSize, chunk) => {
    let info = chunkInteraction.get(chunk.id);
    renderInteractiveThread(
      pair,
      layerSalt,
      inside,
      textSize,
      info.chunkNear,
      info.influenceRadius,
      mouseInfluence,
      activeThreadIds
    );
  });

  forEachConnectThread((pair, layerSalt, inside, textSize, chunkA, chunkB) => {
    let infoA = chunkInteraction.get(chunkA.id);
    let infoB = chunkInteraction.get(chunkB.id);
    let influenceRadius = max(infoA.influenceRadius, infoB.influenceRadius) * 1.15;
    let chunkNear = infoA.chunkNear || infoB.chunkNear;
    renderInteractiveThread(
      pair,
      layerSalt,
      inside,
      textSize,
      chunkNear,
      influenceRadius,
      mouseInfluence,
      activeThreadIds
    );
  });

  pruneThreadPhysics(activeThreadIds);

  drawSelectionUI();
  drawEditingPlaceholder();
  if (!isRecording) {
    syncCanvasTextInputPosition();
  }
  updateCanvasCursor();
}

function drawEditingPlaceholder() {
  let chunk = getEditingChunk();
  if (!chunk || chunk.text.length > 0) {
    return;
  }

  let textSize = chunk.textSize();
  noFill();
  if (isCalligraphyModality()) {
    stroke(20, 16, 12, 140);
  } else {
    stroke(232, 220, 200, 120);
  }
  strokeWeight(1);
  line(chunk.x, chunk.y - textSize * 0.05, chunk.x + textSize * 0.45, chunk.y - textSize * 0.05);
}

function drawCalligraphyUnderlay() {
  textAlign(LEFT, BASELINE);
  noStroke();

  for (let chunk of textChunks) {
    if (!chunk.text || !chunk.line) {
      continue;
    }

    let size = chunk.textSize();

    for (let char of chunk.line.chars) {
      if (!char.c || char.c === ' ') {
        continue;
      }

      textFont(char.font);
      textSize(size);
      fill(10, 8, 6, isCjkChar(char.c) ? 252 : 220);
      text(char.c, char.xp, char.yp);
    }
  }
}

function drawCalligraphyMesh() {
  let strokeRgb = getPaletteRgb(paletteColors[0] || '#0d0b09');

  for (let chunk of textChunks) {
    if (!chunk.text || !chunk.line) {
      continue;
    }

    let textSize = chunk.textSize();
    chunk.line.ensureRawPoints(sampleDensity);
    let points = chunk.line.rawPoints;
    if (!points || points.length < 12) {
      continue;
    }

    let targetCount = constrain(floor(points.length * 0.22), 48, 220);
    let step = max(1, floor(points.length / targetCount));
    let sampled = [];

    for (let i = 0; i < points.length; i += step) {
      sampled.push(points[i]);
    }

    let minDist = textSize * 0.1;
    let maxDist = textSize * 1.45;
    let minDistSq = minDist * minDist;
    let maxDistSq = maxDist * maxDist;

    for (let i = 0; i < sampled.length; i++) {
      let a = sampled[i];
      let linkCount = 2 + floor(threadRandom(a.x, a.y, 41.2) * 4);

      for (let n = 0; n < linkCount; n++) {
        let j = floor(threadRandom(a.x, a.y, 52.7 + n * 3.1) * sampled.length);
        if (j === i) {
          continue;
        }

        let b = sampled[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distSq = dx * dx + dy * dy;

        if (distSq < minDistSq || distSq > maxDistSq) {
          continue;
        }

        if (threadRandom(a.x, b.y, 63.4 + n) < 0.28) {
          continue;
        }

        let alpha = 22 + floor(threadRandom(b.x, a.y, 74.8 + n) * 48);
        stroke(strokeRgb.r, strokeRgb.g, strokeRgb.b, alpha);
        strokeWeight(strokeW * (0.28 + threadRandom(a.x, b.x, 88.1 + n) * 0.35));
        line(a.x, a.y, b.x, b.y);
      }
    }
  }
}

function drawSelectionUI() {
  if (isRecording || isPerformanceMode()) {
    return;
  }

  let chunk = getSelectedChunk();
  if (!chunk || chunk.id === editingChunkId) {
    return;
  }

  let b = chunk.getBounds();
  let accent = isCalligraphyModality()
    ? { r: 28, g: 22, b: 16, a: 210 }
    : { r: 232, g: 220, b: 200, a: 200 };

  noFill();
  stroke(accent.r, accent.g, accent.b, accent.a);
  strokeWeight(1.5);
  rect(b.x, b.y, b.w, b.h, 2);

  fill(accent.r, accent.g, accent.b);
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

  if (isPerformanceMode()) {
    breakThreadAt(mouseX, mouseY);
    return;
  }

  if (editingChunkId) {
    let editing = getEditingChunk();
    if (editing && editing.containsPoint(mouseX, mouseY)) {
      canvasTextInput.elt.focus();
      return;
    }
    finishEditing();
  }

  let chunk = hitTestChunk(mouseX, mouseY);

  if (chunk) {
    if (editingChunkId === chunk.id) {
      return;
    }

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
        startX: mouseX,
        startY: mouseY,
        moved: false,
      };
    }
    return;
  }

  selectedChunkId = null;
  updateSelectionControls();
  pendingEmptyClick = { x: mouseX, y: mouseY };
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
    if (!dragState.moved && dist(mouseX, mouseY, dragState.startX, dragState.startY) > DRAG_THRESHOLD) {
      dragState.moved = true;
    }

    if (dragState.moved) {
      chunk.x += mouseX - dragState.lastX;
      chunk.y += mouseY - dragState.lastY;
      dragState.lastX = mouseX;
      dragState.lastY = mouseY;
      chunk.rebuildLine();
    }
  } else if (dragState.mode === 'resize') {
    chunk.scale = constrain(dragState.startScale + (mouseY - dragState.startY) * 0.008, 0.25, 3);
    chunk.rebuildLine();
    updateSelectionControls();
  }
}

function mouseReleased() {
  if (dragState && dragState.mode === 'move' && !dragState.moved) {
    let chunk = getChunkById(dragState.chunkId);
    let now = millis();

    if (chunk && chunk.id === lastClickChunkId && now - lastClickTime < DOUBLE_CLICK_MS) {
      startEditingChunk(chunk.id);
      lastClickChunkId = null;
      lastClickTime = 0;
    } else {
      lastClickChunkId = chunk ? chunk.id : null;
      lastClickTime = now;
    }
  } else if (pendingEmptyClick) {
    let now = millis();
    let click = pendingEmptyClick;
    let isDoubleClick =
      now - lastEmptyClickTime < DOUBLE_CLICK_MS &&
      dist(click.x, click.y, lastEmptyClickX, lastEmptyClickY) < EMPTY_DOUBLE_CLICK_RADIUS;

    if (isDoubleClick) {
      let newChunk = createTextBlock(click.x, click.y);
      textChunks.push(newChunk);
      startEditingChunk(newChunk.id);
      lastEmptyClickTime = 0;
    } else {
      lastEmptyClickTime = now;
      lastEmptyClickX = click.x;
      lastEmptyClickY = click.y;
    }
  }

  pendingEmptyClick = null;
  dragState = null;
}

function keyPressed() {
  if (isPerformanceMode()) {
    return;
  }

  if (editingChunkId) {
    return;
  }

  if ((keyCode === DELETE || keyCode === BACKSPACE) && selectedChunkId) {
    removeTextBlock(selectedChunkId);
    return false;
  }

  if (keyCode === ESCAPE) {
    selectedChunkId = null;
    updateSelectionControls();
    return false;
  }

  if (keyCode === ENTER && selectedChunkId) {
    startEditingChunk(selectedChunkId);
    return false;
  }

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

  if (isPerformanceMode()) {
    if (mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) {
      canvas.style.cursor = 'default';
      return;
    }

    canvas.style.cursor = mouseNearThreads ? 'pointer' : 'default';
    return;
  }

  if (editingChunkId) {
    canvas.style.cursor = 'text';
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
  if (chunk) {
    let b = chunk.getBounds();
    let onHandle = dist(mouseX, mouseY, b.x + b.w, b.y + b.h) < 14;
    canvas.style.cursor = onHandle ? 'nwse-resize' : 'grab';
    return;
  }

  canvas.style.cursor = mouseNearThreads ? 'pointer' : 'default';
}

function windowResized() {
  resizeArtboard();
  syncCanvasTextInputPosition();
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
    stitchPairCache.clear();
    threadGeometryCache.clear();

    if (this.line) {
      this.line.invalidateCache();
    }

    this.line = new TextLine(this.text, this.x, this.y, this.textSize());
    this.bounds = this.line.getBounds();
  }

  getBounds() {
    return this.bounds;
  }

  containsPoint(mx, my) {
    if (!this.text) {
      return dist(mx, my, this.x, this.y) <= EMPTY_HIT_RADIUS;
    }

    let b = this.bounds;
    if (b.w < 1 || b.h < 1) {
      return dist(mx, my, this.x, this.y) <= EMPTY_HIT_RADIUS;
    }

    return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
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

    this.rawPoints = null;
    this.rawSample = null;
    this.segmentCache = new Map();
    this.bounds = this.computeBounds();
  }

  invalidateCache() {
    this.rawPoints = null;
    this.rawSample = null;
    this.segmentCache.clear();
  }

  ensureRawPoints(sample) {
    if (this.rawPoints && this.rawSample === sample) {
      return;
    }

    this.rawSample = sample;
    this.segmentCache.clear();
    stitchPairCache.clear();
    invalidateThreadGeometryCache();
    this.rawPoints = [];

    for (let char of this.chars) {
      let charPoints = char.font.textToPoints(char.c, char.xp, char.yp, this.textSize, {
        sampleFactor: sample,
        simplifyThreshold: 0,
      });

      for (let pt of charPoints) {
        this.rawPoints.push({ x: pt.x, y: pt.y, charIndex: char.index });
      }
    }
  }

  segmentsForThreshold(threshold) {
    let key = threshold.toFixed(5);

    if (this.segmentCache.has(key)) {
      return this.segmentCache.get(key);
    }

    let groups = {};

    for (let pt of this.rawPoints) {
      let roundedY = floor(pt.y / threshold);
      groups[roundedY] = groups[roundedY] || [];
      groups[roundedY].push(pt);
    }

    let segments = [];

    for (let row of Object.values(groups)) {
      for (let segment of splitRowIntoSegments(row)) {
        segments.push(segment);
      }
    }

    this.segmentCache.set(key, segments);
    return segments;
  }

  isWithinLetterBody(a, b) {
    return a.charIndex === b.charIndex;
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

function skipChanceForDensity(density) {
  return 0.1 + (1 - min(density, 1)) * 0.4;
}

function buildStitchPairs(segment, layerSalt, withinDensity, gapsDensity) {
  let pairs = [];
  let i = 0;
  let longSpanChance = isCalligraphyModality() ? 0.38 : 0.62;
  let stepChance = isCalligraphyModality() ? 0.55 : 0.7;

  while (i < segment.length) {
    let span = threadRandom(segment[i].x, segment[i].y, layerSalt + 2) > longSpanChance ? 2 : 1;
    if (isCalligraphyModality() && threadRandom(segment[i].x, segment[i].y, layerSalt + 2.6) > 0.82) {
      span = min(3, segment.length - 1 - i);
    }
    let j = min(i + span, segment.length - 1);

    if (j > i) {
      let inside = segment[i].charIndex === segment[j].charIndex;
      let density = inside ? withinDensity : gapsDensity;
      let skipChance = skipChanceForDensity(density);

      if (threadRandom(segment[i].x, segment[i].y, layerSalt) >= skipChance) {
        pairs.push([segment[i], segment[j]]);
      }
    }

    let step = threadRandom(segment[j].x, segment[j].y, layerSalt + 4) > stepChance ? 2 : 1;
    i += step;
  }

  return pairs;
}

function stitchPairsForSegment(segment, layerSalt) {
  if (segment.length === 0) {
    return [];
  }

  let last = segment[segment.length - 1];
  let key =
    `${layerSalt}|${withinThreadDensity.toFixed(3)}|${gapsThreadDensity.toFixed(3)}|` +
    `${segment[0].x.toFixed(1)}|${segment[0].y.toFixed(1)}|${segment.length}|` +
    `${last.x.toFixed(1)}|${last.y.toFixed(1)}`;

  if (stitchPairCache.has(key)) {
    return stitchPairCache.get(key);
  }

  let pairs = buildStitchPairs(segment, layerSalt, withinThreadDensity, gapsThreadDensity);
  stitchPairCache.set(key, pairs);
  return pairs;
}

function copyThreadGeometry(thread) {
  return {
    start: { x: thread.start.x, y: thread.start.y },
    ctrl: { x: thread.ctrl.x, y: thread.ctrl.y },
    end: { x: thread.end.x, y: thread.end.y },
    weight: thread.weight,
    alpha: thread.alpha,
  };
}

function getThreadGeometry(a, b, layerSalt, inside, textSize) {
  let modeKey = inside === 'connect' ? 2 : inside ? 1 : 0;
  let key = `${geometryRenderSalt()}|${layerSalt}|${a.x.toFixed(1)}|${a.y.toFixed(1)}|${b.x.toFixed(1)}|${b.y.toFixed(1)}|${modeKey}`;

  if (!threadGeometryCache.has(key)) {
    threadGeometryCache.set(key, computeThreadGeometry(a, b, layerSalt, inside, textSize));

    if (threadGeometryCache.size > 12000) {
      threadGeometryCache.clear();
    }
  }

  return copyThreadGeometry(threadGeometryCache.get(key));
}

function sagAmountForThread(inside, textSize) {
  let sag = inside === 'connect' ? connectSag : inside ? withinThreadSag : gapsThreadSag;
  return sag * textSize * SAG_AMOUNT_SCALE;
}

function threadPhysicsId(a, b, layerSalt) {
  return `${layerSalt}|${a.x.toFixed(1)}|${a.y.toFixed(1)}|${b.x.toFixed(1)}|${b.y.toFixed(1)}`;
}

function pruneThreadPhysics(activeIds) {
  for (let id of threadPhysicsMap.keys()) {
    if (!activeIds.has(id)) {
      threadPhysicsMap.delete(id);
    }
  }
}

function threadPhysicsIsSettled(state, textSize) {
  let threshold = THREAD_PHYSICS.settleThreshold;

  if (state.broken) {
    let target = state.breakDrop || textSize * 0.35;
    return abs(state.sag - target) < threshold * 2 && abs(state.velSag) < threshold;
  }

  return abs(state.sag) < threshold && abs(state.velSag) < threshold;
}

function threadInfluenceRadius(textSize) {
  return THREAD_PHYSICS.influenceRadius * (textSize / 180);
}

function sampleQuadraticBezier(p0, p1, p2, t) {
  let mt = 1 - t;

  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  let lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return dist(px, py, x1, y1);
  }

  let t = constrain(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);

  return dist(px, py, x1 + dx * t, y1 + dy * t);
}

function distanceToQuadraticBezier(mx, my, start, ctrl, end) {
  let minDist = Infinity;
  let prev = start;
  let samples = 5;

  for (let i = 1; i <= samples; i++) {
    let pt = sampleQuadraticBezier(start, ctrl, end, i / samples);
    minDist = min(minDist, dist(mx, my, pt.x, pt.y));
    minDist = min(minDist, distanceToSegment(mx, my, prev.x, prev.y, pt.x, pt.y));
    prev = pt;
  }

  return minDist;
}

function fastDistanceToThread(mx, my, thread, influenceRadius) {
  let minX = min(thread.start.x, thread.ctrl.x, thread.end.x) - influenceRadius;
  let maxX = max(thread.start.x, thread.ctrl.x, thread.end.x) + influenceRadius;
  let minY = min(thread.start.y, thread.ctrl.y, thread.end.y) - influenceRadius;
  let maxY = max(thread.start.y, thread.ctrl.y, thread.end.y) + influenceRadius;

  if (mx < minX || mx > maxX || my < minY || my > maxY) {
    return Infinity;
  }

  return distanceToQuadraticBezier(mx, my, thread.start, thread.ctrl, thread.end);
}

function applyThreadMouseInfluence(state, thread, textSize, threadDist, influenceRadius, inside) {
  if (threadDist > influenceRadius) {
    return;
  }

  let influence = sq(1 - threadDist / influenceRadius);
  let looseness = inside === true ? 0.9 : 1.25;
  let sagPull = influence * THREAD_PHYSICS.mouseSagStrength * textSize * 0.13 * looseness;

  state.velSag += sagPull * 0.24 + mouseVelY * influence * THREAD_PHYSICS.impulseStrength * 0.08;
  state.sag += sagPull * 0.05;
}

function stepThreadPhysics(state, textSize) {
  if (state.broken) {
    let target = state.breakDrop || textSize * 0.35;
    state.velSag += (target - state.sag) * THREAD_PHYSICS.brokenSpringK;
    state.velSag += THREAD_PHYSICS.breakGravity * textSize;
    state.velSag *= THREAD_PHYSICS.brokenDamping;
    state.sag += state.velSag;
    return;
  }

  state.velSag += -state.sag * THREAD_PHYSICS.springK;
  state.velSag *= THREAD_PHYSICS.damping;
  state.sag += state.velSag;
}

function applyThreadPhysicsToGeometry(thread, state) {
  thread.ctrl.y += state.sag;
}

function computeThreadGeometry(a, b, layerSalt, inside, textSize) {
  let isConnect = inside === 'connect';
  let jitterScale = isCalligraphyModality() ? 0.028 : isConnect ? 0.022 : 0.018;
  let jitterAmt = edgeJitter * textSize * jitterScale;
  let sagAmt = sagAmountForThread(inside, textSize);
  if (isCalligraphyModality() && !isConnect) {
    sagAmt *= 0.55;
  }

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
  let swayScale = isConnect ? 1.05 : isCalligraphyModality() ? 1.25 : 0.8;
  let sway = (threadRandom(midX, midY, layerSalt + 7.4) - 0.5) * jitterAmt * swayScale;
  let droop = sagAmt * (0.35 + threadRandom(midX, midY, layerSalt + 8.2) * 0.65);
  if (isConnect) {
    droop += len * 0.04 * (0.4 + threadRandom(midX, midY, layerSalt + 8.9) * 0.8);
  }

  let lengthFactor = isConnect ? abs(dx) * 0.02 + abs(dy) * 0.01 : abs(dx) * (isCalligraphyModality() ? 0.012 : 0.03);

  return {
    start,
    ctrl: {
      x: midX + perpX * sway,
      y: midY + droop + lengthFactor,
    },
    end,
    weight: strokeW * (isConnect ? 0.7 : 0.55) + strokeW * threadRandom(a.x, a.y, layerSalt + 9.3) * (isConnect ? 0.75 : 0.9),
    alpha: isCalligraphyModality()
      ? 70 + floor(threadRandom(b.x, b.y, layerSalt + 11.5) * 130)
      : isConnect
        ? 110 + floor(threadRandom(b.x, b.y, layerSalt + 11.5) * 130)
        : 95 + floor(threadRandom(b.x, b.y, layerSalt + 11.5) * 160),
  };
}

function renderCurvedThread(thread, a, b, layerSalt) {
  let strokeRgb = getPaletteRgb(threadStrokeHex(a, b, layerSalt));

  stroke(strokeRgb.r, strokeRgb.g, strokeRgb.b, thread.alpha);
  strokeWeight(thread.weight);
  noFill();
  beginShape();
  vertex(thread.start.x, thread.start.y);
  quadraticVertex(thread.ctrl.x, thread.ctrl.y, thread.end.x, thread.end.y);
  endShape();
}

function drawCurvedThread(a, b, layerSalt, inside, textSize) {
  let thread = getThreadGeometry(a, b, layerSalt, inside, textSize);
  renderCurvedThread(thread, a, b, layerSalt);
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

function collectSvgCalligraphyUnderlay() {
  if (!isCalligraphyModality()) {
    return [];
  }

  let nodes = [];

  for (let chunk of textChunks) {
    if (!chunk.text || !chunk.line) {
      continue;
    }

    let size = chunk.textSize();

    for (let char of chunk.line.chars) {
      if (!char.c || char.c === ' ') {
        continue;
      }

      let opacity = isCjkChar(char.c) ? '0.99' : '0.86';
      let escaped = char.c
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      nodes.push(
        `<text x="${svgNumber(char.xp)}" y="${svgNumber(char.yp)}" ` +
          `fill="#0a0806" fill-opacity="${opacity}" font-size="${svgNumber(size)}" ` +
          `font-family="${getChineseFontStyleConfig(chineseFontStyle).cssFamily}, 'Source Serif 4', serif">` +
          `${escaped}</text>`
      );
    }
  }

  return nodes;
}

function collectSvgPaths() {
  let paths = [];

  forEachWeaveThread((pair, layerSalt, inside, textSize) => {
    let thread = getThreadGeometry(pair[0], pair[1], layerSalt, inside, textSize);
    paths.push(threadToSvgPath(thread, threadStrokeHex(pair[0], pair[1], layerSalt)));
  });

  forEachConnectThread((pair, layerSalt, inside, textSize) => {
    let thread = getThreadGeometry(pair[0], pair[1], layerSalt, inside, textSize);
    paths.push(threadToSvgPath(thread, threadStrokeHex(pair[0], pair[1], layerSalt)));
  });

  return paths;
}

function buildSvgDocument() {
  let underlay = collectSvgCalligraphyUnderlay();
  let paths = collectSvgPaths();
  let body = [...underlay, ...paths].join('\n  ');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n` +
    `${buildSvgBackgroundMarkup()}\n` +
    `  ${body}\n` +
    '</svg>'
  );
}

function makeExportBasename() {
  let slug = textChunks
    .map((chunk) => chunk.text.trim())
    .filter(Boolean)
    .join('-')
    .slice(0, 30)
    .replace(/[^\w\u4e00-\u9fff-]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return `weaving-${slug || 'type'}`;
}

function formatArchiveDate(isoString) {
  let date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function setSliderControl(sliderId, labelId, value, labelText) {
  select(`#${sliderId}`).value(value);
  select(`#${labelId}`).html(labelText);
}

function captureCurrentSettings() {
  return {
    letterSizeScale,
    letterSpacing,
    sampleDensity,
    withinThreadDensity,
    gapsThreadDensity,
    lineLayers,
    lineSpacing,
    layerStep,
    strokeW,
    edgeJitter,
    withinThreadSag,
    gapsThreadSag,
    connectEnabled,
    connectDensity,
    connectCount,
    connectMaxUnits,
    connectMaxDist,
    connectMinDist,
    connectSag,
    colorMode,
    chineseFontStyle,
    renderModality,
    backgroundColor,
    backgroundImageDataUrl,
    paletteColors: [...paletteColors],
  };
}

function applySettingsFromSnapshot(settings) {
  letterSizeScale = settings.letterSizeScale;
  letterSpacing = settings.letterSpacing;
  sampleDensity = settings.sampleDensity;
  withinThreadDensity = settings.withinThreadDensity;
  gapsThreadDensity = settings.gapsThreadDensity;
  lineLayers = settings.lineLayers;
  lineSpacing = settings.lineSpacing;
  layerStep = settings.layerStep;
  strokeW = settings.strokeW;
  edgeJitter = settings.edgeJitter;
  withinThreadSag = settings.withinThreadSag;
  gapsThreadSag = settings.gapsThreadSag;
  connectEnabled = settings.connectEnabled === true;
  connectDensity = settings.connectDensity ?? connectDensity;
  connectCount = settings.connectCount ?? connectCount;
  connectMaxUnits = settings.connectMaxUnits ?? connectMaxUnits;
  connectMaxDist = settings.connectMaxDist ?? connectMaxDist;
  connectMinDist = settings.connectMinDist ?? connectMinDist;
  connectSag = settings.connectSag ?? connectSag;
  colorMode = settings.colorMode;
  backgroundColor = settings.backgroundColor;
  paletteColors = [...settings.paletteColors];

  setSliderControl('letter-size-slider', 'letter-size-value', letterSizeScale, letterSizeScale.toFixed(2));
  setSliderControl('letter-spacing-slider', 'letter-spacing-value', letterSpacing, letterSpacing.toFixed(3));
  setSliderControl('density-slider', 'density-value', sampleDensity, sampleDensity.toFixed(2));
  setSliderControl('within-density-slider', 'within-density-value', withinThreadDensity, withinThreadDensity.toFixed(2));
  setSliderControl('gaps-density-slider', 'gaps-density-value', gapsThreadDensity, gapsThreadDensity.toFixed(2));
  setSliderControl('layers-slider', 'layers-value', lineLayers, String(lineLayers));
  setSliderControl('spacing-slider', 'spacing-value', lineSpacing, lineSpacing.toFixed(2));
  setSliderControl('step-slider', 'step-value', layerStep, layerStep.toFixed(3));
  setSliderControl('stroke-slider', 'stroke-value', strokeW, strokeW.toFixed(2));
  setSliderControl('jitter-slider', 'jitter-value', edgeJitter, edgeJitter.toFixed(2));
  setSliderControl('within-sag-slider', 'within-sag-value', withinThreadSag, withinThreadSag.toFixed(2));
  setSliderControl('gaps-sag-slider', 'gaps-sag-value', gapsThreadSag, gapsThreadSag.toFixed(2));
  setSliderControl('connect-density-slider', 'connect-density-value', connectDensity, connectDensity.toFixed(2));
  setSliderControl('connect-count-slider', 'connect-count-value', connectCount, String(Math.round(connectCount)));
  setSliderControl('connect-max-units-slider', 'connect-max-units-value', connectMaxUnits, String(Math.round(connectMaxUnits)));
  setSliderControl('connect-max-dist-slider', 'connect-max-dist-value', connectMaxDist, connectMaxDist.toFixed(2));
  setSliderControl('connect-min-dist-slider', 'connect-min-dist-value', connectMinDist, connectMinDist.toFixed(2));
  setSliderControl('connect-sag-slider', 'connect-sag-value', connectSag, connectSag.toFixed(2));

  select('#color-mode').value(colorMode);
  setChineseFontStyle(settings.chineseFontStyle || 'sans');
  select('#bg-color').value(backgroundColor);
  select('#color-1').value(paletteColors[0]);
  select('#color-2').value(paletteColors[1]);
  select('#color-3').value(paletteColors[2]);
  updateColorControlVisibility();
  renderModality = settings.renderModality === 'calligraphy' ? 'calligraphy' : 'weave';
  calligraphyPresetBackup = null;
  updateRenderModalityUI();
  updateConnectUI();
  loadBackgroundImageFromDataUrl(settings.backgroundImageDataUrl || null);
  syncCanvasMetrics();
  syncAllRangeSliderFills();
  invalidateWeaveCaches();
  stitchPairCache.clear();
  invalidateThreadGeometryCache();
}

function serializePosterState() {
  return {
    canvas: { width, height },
    chunks: textChunks.map((chunk) => ({
      text: chunk.text,
      x: chunk.x,
      y: chunk.y,
      scale: chunk.scale,
    })),
    settings: captureCurrentSettings(),
  };
}

function capturePosterThumbnail() {
  let canvas = getRecordCanvasElement();
  if (!canvas) {
    return '';
  }

  let thumbWidth = 220;
  let thumbHeight = max(1, floor(thumbWidth * (height / width)));
  let offscreen = document.createElement('canvas');
  offscreen.width = thumbWidth;
  offscreen.height = thumbHeight;
  offscreen.getContext('2d').drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
  return offscreen.toDataURL('image/jpeg', 0.78);
}

function posterDisplayName(chunks) {
  let label = chunks
    .map((chunk) => chunk.text.trim())
    .filter(Boolean)
    .join(' · ')
    .slice(0, 48);

  return label || 'Untitled poster';
}

function loadArchiveFromStorage() {
  try {
    let raw = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    posterArchive = raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Could not load poster archive.', error);
    posterArchive = [];
  }
}

function persistArchiveToStorage() {
  try {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(posterArchive));
  } catch (error) {
    console.warn('Could not save poster archive.', error);
    window.alert('Could not save poster. Your browser storage may be full.');
  }
}

function saveCanvasToArchive() {
  if (!fontsReady()) {
    return;
  }

  if (editingChunkId) {
    finishEditing();
  }

  let snapshot = serializePosterState();
  let poster = {
    id: `poster-${Date.now()}`,
    name: posterDisplayName(snapshot.chunks),
    savedAt: new Date().toISOString(),
    thumbnail: capturePosterThumbnail(),
    ...snapshot,
  };

  posterArchive.unshift(poster);
  posterArchive = posterArchive.slice(0, MAX_ARCHIVE_ITEMS);
  activeArchiveId = poster.id;
  persistArchiveToStorage();
  renderArchivePanel();
}

function scaleChunkPosition(x, y, savedCanvas) {
  if (!savedCanvas || !savedCanvas.width || !savedCanvas.height) {
    return { x, y };
  }

  return {
    x: x * (width / savedCanvas.width),
    y: y * (height / savedCanvas.height),
  };
}

function loadPosterFromArchive(posterId) {
  let poster = posterArchive.find((entry) => entry.id === posterId);
  if (!poster) {
    return;
  }

  if (editingChunkId) {
    finishEditing();
  }

  applySettingsFromSnapshot(poster.settings);

  textChunks = poster.chunks.map((chunk) => {
    let position = scaleChunkPosition(chunk.x, chunk.y, poster.canvas);
    return createTextBlock(position.x, position.y, chunk.text, chunk.scale);
  });

  selectedChunkId = textChunks.length > 0 ? textChunks[0].id : null;
  activeArchiveId = poster.id;
  invalidateWeaveCaches();
  updateSelectionControls();
  renderArchivePanel();
}

function deletePosterFromArchive(posterId) {
  posterArchive = posterArchive.filter((entry) => entry.id !== posterId);

  if (activeArchiveId === posterId) {
    activeArchiveId = null;
  }

  persistArchiveToStorage();
  renderArchivePanel();
}

function renderArchivePanel() {
  if (!archiveListElement) {
    return;
  }

  archiveListElement.innerHTML = '';

  if (posterArchive.length === 0) {
    let empty = document.createElement('p');
    empty.className = 'archive-empty';
    empty.textContent = 'No saved posters yet. Click Save canvas to store your current artboard here.';
    archiveListElement.appendChild(empty);
    return;
  }

  for (let poster of posterArchive) {
    let item = document.createElement('button');
    item.type = 'button';
    item.className = 'archive-item';
    if (poster.id === activeArchiveId) {
      item.classList.add('is-active');
    }

    let thumb = document.createElement('img');
    thumb.className = 'archive-thumb';
    thumb.src = poster.thumbnail;
    thumb.alt = poster.name;

    let meta = document.createElement('div');
    meta.className = 'archive-meta';

    let name = document.createElement('p');
    name.className = 'archive-name';
    name.textContent = poster.name;

    let date = document.createElement('p');
    date.className = 'archive-date';
    date.textContent = formatArchiveDate(poster.savedAt);

    meta.appendChild(name);
    meta.appendChild(date);

    let deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'archive-delete';
    deleteButton.setAttribute('aria-label', `Delete ${poster.name}`);
    deleteButton.textContent = '×';

    deleteButton.addEventListener('click', (event) => {
      event.stopPropagation();
      deletePosterFromArchive(poster.id);
    });

    item.addEventListener('click', () => {
      loadPosterFromArchive(poster.id);
    });

    item.appendChild(thumb);
    item.appendChild(meta);
    item.appendChild(deleteButton);
    archiveListElement.appendChild(item);
  }
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

function buildSvgBackgroundMarkup() {
  let markup = `  <rect width="100%" height="100%" fill="${backgroundColor}"/>`;

  if (backgroundImage && backgroundImageDataUrl) {
    let rect = getBackgroundImageCoverRect(backgroundImage.width, backgroundImage.height);
    markup += `\n  <image href="${backgroundImageDataUrl}" x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" preserveAspectRatio="xMidYMid slice"/>`;
  }

  return markup;
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

function getRecordCanvasElement() {
  return document.querySelector('#a4-frame canvas');
}

function getRecordingMimeType() {
  let mp4Types = [
    'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];
  let webmTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

  for (let type of mp4Types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  for (let type of webmTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

function recordingProducesMp4(mimeType) {
  return mimeType.includes('mp4');
}

function loadScriptOnce(src, isLoaded) {
  if (isLoaded()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function loadFfmpegConverter() {
  if (ffmpegConverter) {
    return ffmpegConverter;
  }

  await loadScriptOnce(
    'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js',
    () => window.FFmpegWASM
  );
  await loadScriptOnce(
    'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.js',
    () => window.FFmpegUtil
  );

  let { FFmpeg } = FFmpegWASM;
  let ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.6/dist/umd/ffmpeg-core.js',
    wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-st@0.12.6/dist/umd/ffmpeg-core.wasm',
  });

  ffmpegConverter = ffmpeg;
  return ffmpegConverter;
}

async function convertWebmBlobToMp4(webmBlob) {
  let ffmpeg = await loadFfmpegConverter();
  let { fetchFile } = FFmpegUtil;

  await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob));
  await ffmpeg.exec([
    '-i',
    'input.webm',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    'output.mp4',
  ]);

  let data = await ffmpeg.readFile('output.mp4');
  return new Blob([data.buffer], { type: 'video/mp4' });
}

async function finalizeRecording(mimeType) {
  if (recordStream) {
    for (let track of recordStream.getTracks()) {
      track.stop();
    }
    recordStream = null;
  }

  try {
    if (recordedChunks.length === 0) {
      return;
    }

    let blob = new Blob(recordedChunks, { type: mimeType });

    if (!recordingProducesMp4(mimeType)) {
      if (recordButton) {
        recordButton.html('Converting to MP4…');
        recordButton.attribute('disabled', 'true');
      }
      blob = await convertWebmBlobToMp4(blob);
    }

    downloadRecording(blob);
  } catch (error) {
    console.error('MP4 export failed:', error);
    window.alert('Could not create MP4 recording. Try Chrome or Safari, then record again.');
  } finally {
    recordedChunks = [];
    mediaRecorder = null;
    isRecording = false;
    if (recordButton) {
      recordButton.removeAttribute('disabled');
    }
    updateRecordButton();
  }
}

function updateRecordButton() {
  if (!recordButton) {
    return;
  }

  if (isRecording) {
    recordButton.html('Stop recording');
    recordButton.addClass('is-recording');
    if (recordingIndicator) {
      recordingIndicator.classList.remove('is-hidden');
    }
  } else {
    recordButton.html('Record canvas');
    recordButton.removeClass('is-recording');
    if (recordingIndicator) {
      recordingIndicator.classList.add('is-hidden');
    }
  }
}

function toggleCanvasRecording() {
  if (isRecording) {
    stopCanvasRecording();
  } else {
    startCanvasRecording();
  }
}

function startCanvasRecording() {
  if (isRecording) {
    return;
  }

  if (editingChunkId) {
    finishEditing();
  }

  if (!getRecordingMimeType()) {
    window.alert('Video recording is not supported in this browser.');
    return;
  }

  let canvas = getRecordCanvasElement();
  if (!canvas || typeof canvas.captureStream !== 'function') {
    window.alert('Canvas recording is not supported in this browser.');
    return;
  }

  hideCanvasTextInput();
  recordedChunks = [];
  recordStream = canvas.captureStream(RECORD_FPS);

  let mimeType = getRecordingMimeType();
  mediaRecorder = new MediaRecorder(recordStream, {
    mimeType,
    videoBitsPerSecond: RECORD_BITRATE,
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    finalizeRecording(mimeType);
  };

  mediaRecorder.start(200);
  isRecording = true;
  updateRecordButton();
}

function stopCanvasRecording() {
  if (!isRecording || !mediaRecorder) {
    return;
  }

  if (mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

function downloadRecording(blob) {
  let stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  let url = URL.createObjectURL(blob);
  let anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `weaving-recording-${stamp}.mp4`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
