(function(){
var _locale = 'en';
var _translations = {};
var _ready = false;
var _LOADED_EVENT = 'i18n-ready';
var _CHANGE_EVENT = 'language-changed';
var _STORAGE_KEY = 'odysseus-locale';

function _detectBrowserLang() {
  try {
    var lang = (navigator.language || navigator.browserLanguage || '').toLowerCase();
    if (lang.startsWith('zh')) return 'zh-CN';
  } catch(e) {}
  return 'en';
}

async function _loadLocale(locale) {
  if (locale === 'en') {
    _translations = {};
    _ready = true;
    window.dispatchEvent(new CustomEvent(_LOADED_EVENT));
    return;
  }
  try {
    var res = await fetch('/static/i18n/' + locale + '.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    _translations = await res.json();
    _ready = true;
    window.dispatchEvent(new CustomEvent(_LOADED_EVENT));
  } catch(e) {
    console.warn('[i18n] Failed to load locale "' + locale + '":', e);
    _translations = {};
    _ready = true;
    window.dispatchEvent(new CustomEvent(_LOADED_EVENT));
  }
}

function __(key) {
  if (!key) return '';
  var t = _translations[key];
  return t !== undefined ? t : key;
}

async function setLanguage(locale) {
  locale = locale || 'en';
  if (locale === _locale && _ready) return;
  _locale = locale;
  _ready = false;
  try { localStorage.setItem(_STORAGE_KEY, locale); } catch(e) {}
  await _loadLocale(locale);
  _scanDOM();
  // Update html lang attribute
  var html = document.documentElement;
  if (html) html.lang = locale === 'zh-CN' ? 'zh-CN' : 'en';
  window.dispatchEvent(new CustomEvent(_CHANGE_EVENT, { detail: { locale: locale } }));
}

function getCurrentLocale() {
  return _locale;
}

function _scanDOM(root) {
  root = root || document;
  var elements = root.querySelectorAll('[data-i18n]');
  elements.forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    if (!key) return;
    var text = __(key);
    if (text === key) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = text;
    } else if (el.tagName === 'OPTION') {
      el.textContent = text;
    } else {
      var textNodes = Array.from(el.childNodes).filter(function(n) { return n.nodeType === 3; });
      if (textNodes.length > 0) {
        textNodes[0].textContent = text;
      } else if (!el.querySelector('svg, img, canvas')) {
        el.textContent = text;
      }
    }
  });

  var placeholders = root.querySelectorAll('[data-i18n-placeholder]');
  placeholders.forEach(function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = __(key);
  });

  var titles = root.querySelectorAll('[data-i18n-title]');
  titles.forEach(function(el) {
    var key = el.getAttribute('data-i18n-title');
    if (key) el.title = __(key);
  });

  var aria = root.querySelectorAll('[data-i18n-aria-label]');
  aria.forEach(function(el) {
    var key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', __(key));
  });
}

async function initI18n() {
  var saved = null;
  try { saved = localStorage.getItem(_STORAGE_KEY); } catch(e) {}
  _locale = saved || 'en';
  await _loadLocale(_locale);
  _scanDOM();

  // Check backend setting
  try {
    var res = await fetch('/api/auth/settings', { credentials: 'same-origin' });
    if (res.ok) {
      var settings = await res.json();
      var backendLocale = settings.language || '';
      if (backendLocale && backendLocale !== _locale) {
        _locale = backendLocale;
        try { localStorage.setItem(_STORAGE_KEY, backendLocale); } catch(e) {}
        await _loadLocale(backendLocale);
        _scanDOM();
        var html = document.documentElement;
        if (html) html.lang = backendLocale === 'zh-CN' ? 'zh-CN' : 'en';
      }
    }
  } catch(e) {}

  window.dispatchEvent(new CustomEvent('i18n-initialized', { detail: { locale: _locale } }));
}

window.__ = __;
window.setLanguage = setLanguage;
window.getCurrentLocale = getCurrentLocale;
window.initI18n = initI18n;
window._i18nScanDOM = _scanDOM;
})();
