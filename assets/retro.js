/* ============================================================
   文件列表渲染 · 分类自动生成 · 下载链接编码存放
   ============================================================ */
(function () {
  'use strict';

  var DATA_URL = 'config/Downloadfilelist.json';

  // 下载链接以编码形式保存，页面与数据文件中均不出现明文地址
  var LINKS = {
    '3f80e8ba3596fc6a626e334924b37f22': 'aHR0cDovL2NvcnBlci5jbi9kb3duLnBocC8zZjgwZThiYTM1OTZmYzZhNjI2ZTMzNDkyNGIzN2YyMi5sdWE=',
    '4fd7ae0a239e05986d86f07103d66fda': 'aHR0cDovL2NvcnBlci5jbi9kb3duLnBocC80ZmQ3YWUwYTIzOWUwNTk4NmQ4NmYwNzEwM2Q2NmZkYS5sdWE=',
    '5aca904501ddf1f224db3e992de29349': 'aHR0cDovL2NvcnBlci5jbi9kb3duLnBocC81YWNhOTA0NTAxZGRmMWYyMjRkYjNlOTkyZGUyOTM0OS5sdWE=',
    '5f3fbc57cdaaf0038ea7e45340cb4b98': 'aHR0cDovL2NvcnBlci5jbi9kb3duLnBocC81ZjNmYmM1N2NkYWFmMDAzOGVhN2U0NTM0MGNiNGI5OC5sdWE=',
    '7b3ae5d50eb491c6d65a9aa1d331f817': 'aHR0cDovL2NvcnBlci5jbi9kb3duLnBocC83YjNhZTVkNTBlYjQ5MWM2ZDY1YTlhYTFkMzMxZjgxNy5sdWE=',
    'cf3a6f04286dafb374713bb0a6468a6f': 'aHR0cDovL2NvcnBlci5jbi9kb3duLnBocC9jZjNhNmYwNDI4NmRhZmIzNzQ3MTNiYjBhNjQ2OGE2Zi5sdWE='
  
  };

  var POLL_INTERVAL = 3000; // 实时刷新间隔（毫秒）

  var state = {
    files: [],
    categories: [],
    active: '__ALL__',
    keyword: '',
    sort: 'date',
    fingerprint: ''
  };

  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fileUrl(id) {
    var code = LINKS[id];
    if (!code) return '';
    try { return window.atob(code); } catch (e) { return ''; }
  }

  function icon(ext) {
    var e = String(ext || '').toLowerCase();
    if (/^(lua|js|ts|py|c|cpp|h|java|sh|php|json|xml|css|html|go|rs)$/.test(e)) return '#i-code';
    return '#i-disk';
  }

  function extOf(file) {
    if (file.ext) return String(file.ext);
    var m = String(file.name || '').match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toLowerCase() : '';
  }

  function formatBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(2) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }

  /* ---------- 数据加载（含实时轮询） ---------- */
  function loadData(isPoll) {
    var fallback = function () {
      if (isPoll) return; // 轮询失败时保留当前显示，不回退覆盖
      try { applyData(JSON.parse($('fallback-data').textContent)); }
      catch (e) {
        $('fileBody').innerHTML = '<tr><td colspan="6" class="loading">读取失败</td></tr>';
      }
    };
    if (!window.fetch) { fallback(); return; }
    // 加时间戳参数绕过缓存，确保读到最新文件
    fetch(DATA_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (obj) {
        var fp = JSON.stringify(obj);
        if (fp === state.fingerprint) return; // 数据未变，跳过重渲染
        state.fingerprint = fp;
        applyData(obj); // 内部已处理分类失效回退并渲染
      })
      .catch(fallback);
  }

  function startPolling() {
    setInterval(function () { loadData(true); }, POLL_INTERVAL);
  }

  function applyData(obj) {
    state.files = (Array.isArray(obj.files) ? obj.files : []).map(function (f) {
      return {
        id: String(f.id || ''),
        name: f.name || '未命名文件',
        category: String(f.category || extOf(f) || '其他'),
        ext: extOf(f),
        size: f.size || formatBytes(f.bytes),
        bytes: Number(f.bytes) || 0,
        uploadedAt: f.uploadedAt || ''
      };
    });

    // 分类由数据自动生成
    var map = {};
    state.files.forEach(function (f) { map[f.category] = (map[f.category] || 0) + 1; });
    state.categories = Object.keys(map).map(function (k) {
      return { key: k, label: k.toUpperCase(), count: map[k] };
    }).sort(function (a, b) {
      return b.count - a.count || a.key.localeCompare(b.key);
    });

    // 若当前选中的分类已不存在（如被删除），回退到全部
    var exists = state.active === '__ALL__' || state.categories.some(function (c) {
      return c.key === state.active;
    });
    if (!exists) state.active = '__ALL__';

    renderCategories();
    renderFiles();
  }

  /* ---------- 分类目录 ---------- */
  function renderCategories() {
    var html = '<a class="catlink' + (state.active === '__ALL__' ? ' active' : '') +
      '" href="#" data-cat="__ALL__">' +
      '<svg class="cat-icon"><use href="#i-arrow"/></svg>全部文件' +
      '<span class="catcount">(' + state.files.length + ')</span></a>';

    state.categories.forEach(function (c) {
      html += '<a class="catlink' + (state.active === c.key ? ' active' : '') +
        '" href="#" data-cat="' + esc(c.key) + '">' +
        '<svg class="cat-icon"><use href="#i-arrow"/></svg>' + esc(c.label) +
        '<span class="catcount">(' + c.count + ')</span></a>';
    });
    $('catList').innerHTML = html;

    var links = $('catList').querySelectorAll('.catlink');
    Array.prototype.forEach.call(links, function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        state.active = a.getAttribute('data-cat');
        renderCategories();
        renderFiles();
      });
    });
  }

  /* ---------- 文件列表 ---------- */
  function renderFiles() {
    var list = state.files.filter(function (f) {
      var okCat = state.active === '__ALL__' || f.category === state.active;
      var k = state.keyword.toLowerCase();
      var okKey = !k || (f.name + ' ' + f.category).toLowerCase().indexOf(k) !== -1;
      return okCat && okKey;
    });

    list.sort(function (a, b) {
      if (state.sort === 'name') return a.name.localeCompare(b.name);
      if (state.sort === 'size') return b.bytes - a.bytes;
      return String(b.uploadedAt).localeCompare(String(a.uploadedAt));
    });

    if (!list.length) {
      $('fileBody').innerHTML = '<tr><td colspan="6" class="loading">没有找到匹配的文件</td></tr>';
    } else {
      $('fileBody').innerHTML = list.map(function (f, i) {
        return '<tr class="file-row">' +
          '<td align="center"><span class="rownum">' + (i + 1) + '</span></td>' +
          '<td><svg class="file-icon"><use href="' + icon(f.ext) + '"/></svg>' +
            '<a class="file-name op-download" href="#" data-id="' + esc(f.id) + '" data-name="' + esc(f.name) + '">' + esc(f.name) + '</a></td>' +
          '<td align="center"><span class="catword">' + esc(f.category.toUpperCase()) + '</span></td>' +
          '<td align="center"><span class="num">' + esc(f.size) + '</span></td>' +
          '<td align="center"><span class="datecell">' + esc(f.uploadedAt) + '</span></td>' +
          '<td><span class="actlinks">[<a class="op-download" href="#" data-id="' + esc(f.id) + '" data-name="' + esc(f.name) + '">下载</a>]</span></td>' +
          '</tr>';
      }).join('');

      bindRowActions();
    }

    var catLabel = state.active === '__ALL__' ? '全部文件' : state.active.toUpperCase();
    $('resultInfo').textContent = '共找到 ' + list.length + ' 个文件 / 全部 ' + state.files.length +
      ' 个 · 当前分类：' + catLabel + (state.keyword ? ' · 关键字：' + state.keyword : '');
  }

  /* ---------- 行内操作 ---------- */
  function bindRowActions() {
    var body = $('fileBody');
    Array.prototype.forEach.call(body.querySelectorAll('.op-download'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var url = fileUrl(a.getAttribute('data-id'));
        var name = a.getAttribute('data-name') || '';
        if (!url) return;

        // 直接触发下载：顶层导航不受混合内容/CORS 限制，
        // 适用于 GitHub Pages 等 HTTPS 静态托管环境。
        // 临时链接点击后立即移除，页面与 DOM 均不留痕。
        var tmp = document.createElement('a');
        tmp.href = url;
        tmp.download = name;
        tmp.rel = 'noopener';
        tmp.style.display = 'none';
        document.body.appendChild(tmp);
        tmp.click();
        document.body.removeChild(tmp);
      });
    });
  }

  /* ---------- 事件 ---------- */
  function bindEvents() {
    function doSearch() {
      state.keyword = $('searchInput').value.trim();
      renderFiles();
    }
    $('searchBtn').addEventListener('click', doSearch);
    $('searchInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
    });
    $('sortSelect').addEventListener('change', function (e) {
      state.sort = e.target.value;
      renderFiles();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindEvents();
    loadData(false);
    startPolling();
  });
})();
