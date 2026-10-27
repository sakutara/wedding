(function () {
  'use strict';
  var KEY = 'wedding.v1';
  var app = document.getElementById('app');
  var dlg = document.getElementById('dlg');
  var toastEl = document.getElementById('toast');
  var tab = 'home';
  var openEv = {};   // id sự kiện đang mở
  var openTask = {}; // id việc đang mở rộng
  var toastTimer = null;
  var calY = new Date().getFullYear();
  var calM = new Date().getMonth(); // 0-11, tháng đang xem trên lịch
  var selDay = null; // ngày đang chọn trên lịch (ymd)
  var state = load();

  // ---------- dữ liệu ----------
  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }
  function empty() { return { settings: { weddingDate: '', names: '' }, events: [], budget: { total: 0, items: [] }, music: { items: [] } }; }
  function normalize(s) {
    s.settings = s.settings || { weddingDate: '', names: '' };
    s.budget = s.budget || { total: 0, items: [] };
    s.music = s.music || { items: [] };
    return s;
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.events)) return normalize(s);
    } catch (e) { /* bỏ qua */ }
    return empty();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Không lưu được dữ liệu trong trình duyệt'); }
  }
  // thay đổi dữ liệu; nếu có msg thì hiện thanh Hoàn tác
  function mutate(fn, msg) {
    var before = JSON.stringify(state);
    fn();
    save(); render();
    if (msg) toast(msg, function () { state = JSON.parse(before); save(); render(); });
  }

  // ---------- ngày ----------
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function todayStr() { return ymd(new Date()); }
  function diff(a, b) { return Math.round((parse(a) - parse(b)) / 864e5); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function fmt(s) { var d = parse(s); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); }
  function wd() { return state.settings.weddingDate; }

  // ---------- mẫu ----------
  function makeTask(t, key) {
    return {
      id: uid(), tpl: key, title: t[0], off: t[1], dueEdited: false,
      due: wd() ? addDays(wd(), -t[1]) : '', note: '', done: false, hidden: false,
      subtasks: (t[2] || []).map(function (s) { return { id: uid(), title: s, due: '', done: false }; })
    };
  }
  function makeEvent(ev) {
    return {
      id: uid(), tpl: ev.k, title: ev.t, emoji: ev.e, hidden: false,
      tasks: ev.tasks.map(function (t, i) { return makeTask(t, ev.k + '.' + i); })
    };
  }
  // nạp mẫu; chỉ thêm những gì còn thiếu. Trả về số việc đã thêm
  function applyTemplate() {
    var added = 0;
    TEMPLATE.forEach(function (tp) {
      var ev = state.events.find(function (e) { return e.tpl === tp.k; });
      if (!ev) { var n = makeEvent(tp); state.events.push(n); added += n.tasks.length; return; }
      tp.tasks.forEach(function (t, i) {
        var key = tp.k + '.' + i;
        if (!ev.tasks.some(function (x) { return x.tpl === key; })) { ev.tasks.push(makeTask(t, key)); added++; }
      });
    });
    return added;
  }
  function recomputeDue() {
    state.events.forEach(function (e) {
      e.tasks.forEach(function (t) {
        if (t.off !== undefined && !t.dueEdited) t.due = wd() ? addDays(wd(), -t.off) : '';
      });
    });
  }

  // ---------- tìm kiếm / thống kê ----------
  function findEv(id) { return state.events.find(function (e) { return e.id === id; }); }
  function findTask(eid, tid) { var e = findEv(eid); return e && e.tasks.find(function (t) { return t.id === tid; }); }
  function visibleTasks(ev) { return ev.tasks.filter(function (t) { return !t.hidden; }); }
  function progress(ev) {
    var v = visibleTasks(ev);
    return { done: v.filter(function (t) { return t.done; }).length, total: v.length };
  }
  function allActive() {
    var out = [];
    state.events.forEach(function (e) {
      if (e.hidden) return;
      e.tasks.forEach(function (t) { if (!t.hidden) out.push({ ev: e, t: t }); });
    });
    return out;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }


  // ---------- ngân sách ----------
  function money(n) { return (Number(n) || 0).toLocaleString('vi-VN') + ' đ'; }
  function num(v) { return Number(String(v == null ? '' : v).replace(/[^\d]/g, '')) || 0; }
  function cost(b) { return b.actual > 0 ? b.actual : b.est; }
  function payChip(b) {
    var c = cost(b);
    if (b.paid >= c && c > 0) return '<span class="chip ok">✔ Đã trả đủ</span>';
    if (b.paid > 0) return '<span class="chip now">Đã cọc ' + money(b.paid) + '</span>';
    return '<span class="chip plain">Chưa cọc</span>';
  }
  function budgetRow(b) {
    var ev = b.eventId && findEv(b.eventId), c = cost(b), left = Math.max(0, c - b.paid), d = 'data-b="' + b.id + '"';
    var h = '<li class="task' + (c > 0 && b.paid >= c ? ' done' : '') + '"><div class="tbody" data-a="bdopen" ' + d + '>' +
      '<div class="ttl">' + esc(b.title) + '</div><div class="meta">' + payChip(b) +
      (b.payDue && left > 0 ? '<span class="chip ' + (b.payDue < todayStr() ? 'late' : 'soon') + '">Hạn trả ' + fmt(b.payDue) + '</span>' : '') +
      (ev ? '<span>' + esc(ev.emoji) + ' ' + esc(ev.title) + '</span>' : '') + '</div></div>' +
      '<div class="amt"><b>' + money(c) + '</b>' + (left > 0 && b.paid > 0 ? '<div class="muted">còn ' + money(left) + '</div>' : '') + '</div></li>';
    if (openTask[b.id]) {
      h += '<div class="detail"><div class="muted">Dự kiến: ' + money(b.est) + ' · Thực tế: ' + (b.actual ? money(b.actual) : '—') +
        ' · Đã trả/cọc: ' + money(b.paid) + ' · Còn lại: ' + money(left) + '</div>' +
        (b.note ? '<div class="note">' + esc(b.note) + '</div>' : '') +
        '<div class="acts"><button class="btn" data-a="bdedit" ' + d + '>✎ Sửa</button>' +
        (left > 0 ? '<button class="btn" data-a="bdpaid" ' + d + '>✔ Đã trả đủ</button>' : '') +
        '<button class="btn danger" data-a="bddel" ' + d + '>🗑 Xoá</button></div></div>';
    }
    return h;
  }
  function renderBudget() {
    var B = state.budget, items = B.items;
    var est = 0, tot = 0, paid = 0;
    items.forEach(function (b) { est += b.est; tot += cost(b); paid += Math.min(b.paid, cost(b) || b.paid); });
    var left = Math.max(0, tot - paid);
    var over = B.total > 0 && tot > B.total;
    var pct = tot ? Math.min(100, Math.round(paid * 100 / tot)) : 0;
    var h = '<h1>Ngân sách</h1><div class="card hero"><div class="sub">Tổng ngân sách</div><div class="big" style="font-size:1.9rem">' +
      (B.total ? money(B.total) : 'Chưa đặt') + '</div>' +
      '<div class="acts" style="justify-content:center"><button class="btn" style="color:#c2456b" data-a="bdtotal">✎ Đặt ngân sách</button></div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div><div class="sub" style="margin-top:6px">Đã trả/cọc ' + money(paid) + ' / ' + money(tot) + ' (' + pct + '%)</div></div>';
    h += '<div class="grid">' +
      '<div class="card"><div class="muted">Dự kiến chi</div><b>' + money(est) + '</b></div>' +
      '<div class="card"><div class="muted">Chi phí hiện tại</div><b>' + money(tot) + '</b></div>' +
      '<div class="card"><div class="muted">Đã trả / cọc</div><b>' + money(paid) + '</b></div>' +
      '<div class="card"><div class="muted">Còn phải trả</div><b>' + money(left) + '</b></div></div>';
    if (B.total) h += '<div class="alert' + (over ? '' : ' ok') + '">' + (over ? '⚠️ Vượt ngân sách ' + money(tot - B.total) : '👍 Còn trong ngân sách ' + money(B.total - tot)) + '</div>';
    h += '<div class="acts" style="margin-top:14px"><button class="btn pri" data-a="bdadd">+ Thêm khoản chi</button></div>';
    if (!items.length) h += '<div class="empty">Chưa có khoản chi nào. Bấm “Thêm khoản chi” để bắt đầu (ví dụ: nhà hàng, studio, váy cưới).</div>';
    // nhóm theo sự kiện
    var groups = {};
    items.forEach(function (b) { var k = b.eventId && findEv(b.eventId) ? b.eventId : '_'; (groups[k] = groups[k] || []).push(b); });
    Object.keys(groups).forEach(function (k) {
      var ev = k === '_' ? null : findEv(k), sum = groups[k].reduce(function (a, b) { return a + cost(b); }, 0);
      h += '<h2>' + (ev ? esc(ev.emoji) + ' ' + esc(ev.title) : '📦 Khác') + ' <span class="muted">' + money(sum) + '</span></h2>' +
        '<div class="card"><ul class="tasks">' + groups[k].map(budgetRow).join('') + '</ul></div>';
    });
    return h;
  }
  function editBudget(id) {
    var b = id ? state.budget.items.find(function (x) { return x.id === id; }) : { title: '', eventId: '', est: 0, actual: 0, paid: 0, payDue: '', note: '' };
    var opts = '<option value="">— Không thuộc sự kiện nào —</option>' + state.events.map(function (e) {
      return '<option value="' + e.id + '"' + (e.id === b.eventId ? ' selected' : '') + '>' + esc(e.emoji) + ' ' + esc(e.title) + '</option>';
    }).join('');
    var inp = function (n, l, v) { return '<label>' + l + '</label><input type="text" inputmode="numeric" name="' + n + '" value="' + (v || '') + '" placeholder="0">'; };
    dialog('<b>' + (id ? 'Sửa khoản chi' : 'Thêm khoản chi') + '</b><label>Tên khoản (VD: Nhà hàng, Studio, Váy cưới)</label>' +
      '<input type="text" name="title" required value="' + esc(b.title) + '"><label>Thuộc sự kiện</label><select name="ev">' + opts + '</select>' +
      inp('est', 'Dự kiến (đ)', b.est) + inp('actual', 'Thực tế / theo hợp đồng (đ)', b.actual) +
      inp('paid', 'Đã cọc / đã trả (đ)', b.paid) +
      '<label>Hạn trả phần còn lại</label><input type="date" name="due" value="' + esc(b.payDue) + '">' +
      '<label>Ghi chú</label><textarea name="note" rows="2">' + esc(b.note) + '</textarea>', function (d) {
      if (!d.title) return;
      mutate(function () {
        var rec = id ? b : { id: uid() };
        rec.title = d.title; rec.eventId = d.ev; rec.est = num(d.est); rec.actual = num(d.actual);
        rec.paid = num(d.paid); rec.payDue = d.due; rec.note = d.note;
        if (!id) state.budget.items.push(rec);
      });
    });
  }

  // ---------- giao diện ----------
  function dueChip(t) {
    if (!t.due) return '';
    if (t.done) return '<span class="chip plain">' + fmt(t.due) + '</span>';
    var d = diff(t.due, todayStr()), cls = '', txt;
    if (d < 0) { cls = 'late'; txt = 'Quá hạn ' + (-d) + ' ngày'; }
    else if (d === 0) { cls = 'now'; txt = 'Hôm nay'; }
    else if (d === 1) { cls = 'soon'; txt = 'Ngày mai'; }
    else if (d <= 7) { cls = 'soon'; txt = 'Còn ' + d + ' ngày'; }
    else txt = fmt(t.due);
    return '<span class="chip ' + cls + '">' + txt + '</span>';
  }

  function taskRow(ev, t, showEvent, expandable) {
    var subDone = t.subtasks.filter(function (s) { return s.done; }).length;
    var meta = '';
    if (showEvent) meta += '<span>' + esc(ev.emoji) + ' ' + esc(ev.title) + '</span>';
    meta += dueChip(t);
    if (t.subtasks.length) meta += '<span>' + subDone + '/' + t.subtasks.length + ' việc con</span>';
    if (t.note) meta += '<span>📝</span>';
    var d = 'data-e="' + ev.id + '" data-t="' + t.id + '"';
    var html = '<li class="task' + (t.done ? ' done' : '') + (t.hidden ? ' hid' : '') + '">' +
      '<button class="chk" data-a="toggle" ' + d + ' aria-label="Đánh dấu xong">✓</button>' +
      '<div class="tbody" data-a="' + (expandable ? 'expand' : 'edit') + '" ' + d + '>' +
      '<div class="ttl">' + esc(t.title) + '</div><div class="meta">' + meta + '</div></div></li>';
    if (expandable && openTask[t.id]) html += taskDetail(ev, t);
    return html;
  }

  function taskDetail(ev, t) {
    var d = 'data-e="' + ev.id + '" data-t="' + t.id + '"';
    var h = '<div class="detail">';
    t.subtasks.forEach(function (s) {
      h += '<div class="sub' + (s.done ? ' done' : '') + '">' +
        '<button class="chk sm' + (s.done ? ' on' : '') + '" data-a="togglesub" ' + d + ' data-s="' + s.id + '" aria-label="Xong">✓</button>' +
        '<span class="st">' + esc(s.title) + '</span>' +
        '<button class="icon" data-a="editsub" ' + d + ' data-s="' + s.id + '" aria-label="Sửa">✎</button>' +
        '<button class="icon" data-a="delsub" ' + d + ' data-s="' + s.id + '" aria-label="Xoá">✕</button></div>';
    });
    h += '<form class="add" data-a="addsub" ' + d + '><input type="text" name="title" placeholder="+ Thêm việc con" autocomplete="off">' +
      '<button class="btn" type="submit">Thêm</button></form>';
    if (t.note) h += '<div class="note">' + esc(t.note) + '</div>';
    h += '<div class="acts">' +
      '<button class="btn" data-a="edit" ' + d + '>✎ Sửa</button>' +
      '<button class="btn" data-a="dup" ' + d + '>⧉ Nhân bản</button>' +
      '<button class="btn" data-a="hidetask" ' + d + '>' + (t.hidden ? '👁 Hiện lại' : '🙈 Ẩn') + '</button>' +
      '<button class="btn danger" data-a="deltask" ' + d + '>🗑 Xoá</button></div></div>';
    return h;
  }

  function renderHome() {
    var h = '', all = allActive(), today = todayStr();
    var tot = all.length, done = all.filter(function (x) { return x.t.done; }).length;
    var pct = tot ? Math.round(done * 100 / tot) : 0;
    var title = state.settings.names ? esc(state.settings.names) : 'Đám cưới của bạn';
    var big, sub;
    if (!wd()) { big = '💍'; sub = 'Chưa đặt ngày cưới. Vào Cài đặt để chọn ngày.'; }
    else {
      var d = diff(wd(), today);
      if (d > 0) { big = 'Còn ' + d + ' ngày'; sub = 'đến ngày cưới ' + fmt(wd()); }
      else if (d === 0) { big = 'Hôm nay!'; sub = 'Chúc mừng ngày cưới 🎉'; }
      else { big = 'Đã cưới ' + (-d) + ' ngày'; sub = 'Ngày cưới ' + fmt(wd()); }
    }
    h += '<div class="card hero"><div class="sub">' + title + '</div><div class="big">' + big + '</div><div class="sub">' + sub + '</div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div><div class="sub" style="margin-top:6px">Đã xong ' + done + '/' + tot + ' việc (' + pct + '%)</div></div>';

    var pend = all.filter(function (x) { return !x.t.done; });
    var withDue = pend.filter(function (x) { return x.t.due; });
    var late = withDue.filter(function (x) { return x.t.due < today; });
    var now = withDue.filter(function (x) { return x.t.due === today; });
    var soon = withDue.filter(function (x) { var d = diff(x.t.due, today); return d > 0 && d <= 7; });
    var noDue = pend.filter(function (x) { return !x.t.due; });
    var byDue = function (a, b) { return a.t.due < b.t.due ? -1 : a.t.due > b.t.due ? 1 : 0; };

    if (late.length || now.length)
      h += '<div class="alert">⏰ ' + (late.length ? late.length + ' việc quá hạn' : '') +
        (late.length && now.length ? ', ' : '') + (now.length ? now.length + ' việc đến hạn hôm nay' : '') + '</div>';
    else if (tot && !pend.length) h += '<div class="alert ok">🎉 Bạn đã hoàn thành mọi việc!</div>';
    else if (tot) h += '<div class="alert ok">👍 Không có việc nào quá hạn.</div>';

    function sect(label, arr) {
      if (!arr.length) return '';
      return '<h2>' + label + ' <span class="muted">(' + arr.length + ')</span></h2><div class="card"><ul class="tasks">' +
        arr.map(function (x) { return taskRow(x.ev, x.t, true, false); }).join('') + '</ul></div>';
    }
    h += sect('🔴 Quá hạn', late.sort(byDue));
    h += sect('🟠 Hôm nay', now);
    h += sect('🗓️ 7 ngày tới', soon.sort(byDue));
    h += sect('❔ Chưa có hạn', noDue.slice(0, 30));
    if (noDue.length > 30) h += '<div class="muted" style="margin-top:6px">… và ' + (noDue.length - 30) + ' việc khác</div>';
    if (!tot) h += '<div class="empty">Chưa có việc nào. Vào tab “Sự kiện” để thêm hoặc nạp danh sách mẫu.</div>';
    return h;
  }

  function evCard(ev) {
    var p = progress(ev), pct = p.total ? Math.round(p.done * 100 / p.total) : 0;
    var d = 'data-e="' + ev.id + '"', open = !!openEv[ev.id];
    var h = '<div class="card ev' + (ev.hidden ? ' hid' : '') + '">' +
      '<button class="evh" data-a="evopen" ' + d + '><span class="em">' + esc(ev.emoji || '📌') + '</span>' +
      '<span class="mid"><div class="name">' + esc(ev.title) + (ev.hidden ? ' (đã ẩn)' : '') + '</div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div></span>' +
      '<span class="cnt">' + p.done + '/' + p.total + ' ' + (open ? '▾' : '▸') + '</span></button>';
    if (open) {
      h += '<div class="evbody"><ul class="tasks">';
      ev.tasks.forEach(function (t) { h += taskRow(ev, t, false, true); });
      h += '</ul>' +
        '<form class="add" data-a="addtask" ' + d + '><input type="text" name="title" placeholder="+ Thêm việc mới (gõ tên rồi Enter)" autocomplete="off">' +
        '<button class="btn pri" type="submit">Thêm</button></form>' +
        '<div class="acts"><button class="btn" data-a="evedit" ' + d + '>✎ Sửa sự kiện</button>' +
        '<button class="btn" data-a="evhide" ' + d + '>' + (ev.hidden ? '👁 Hiện lại' : '🙈 Ẩn sự kiện') + '</button>' +
        '<button class="btn danger" data-a="evdel" ' + d + '>🗑 Xoá sự kiện</button></div></div>';
    }
    return h + '</div>';
  }

  function renderEvents() {
    var h = '<h1>Sự kiện</h1><div class="muted">Bấm vào sự kiện để xem và thêm việc.</div>';
    if (!state.events.length) h += '<div class="empty">Chưa có sự kiện nào.</div>';
    state.events.filter(function (e) { return !e.hidden; }).forEach(function (e) { h += evCard(e); });
    var hid = state.events.filter(function (e) { return e.hidden; });
    if (hid.length) { h += '<h2>🙈 Đã ẩn</h2>'; hid.forEach(function (e) { h += evCard(e); }); }
    h += '<div class="acts" style="margin-top:16px"><button class="btn pri" data-a="evadd">+ Thêm sự kiện</button>' +
      '<button class="btn" data-a="tplload">📥 Nạp / khôi phục việc mẫu</button></div>';
    return h;
  }

  // ---------- lịch tháng ----------
  var WD_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  function dueEntries() {
    var map = {};
    function add(date, obj) { (map[date] = map[date] || []).push(obj); }
    state.events.forEach(function (e) {
      if (e.hidden) return;
      e.tasks.forEach(function (t) {
        if (t.hidden) return;
        if (t.due) add(t.due, { ev: e, t: t });
        t.subtasks.forEach(function (s) { if (s.due) add(s.due, { ev: e, t: t, sub: s }); });
      });
    });
    return map;
  }
  function calGridStart(y, m) {
    var d = new Date(y, m, 1);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // lùi về thứ Hai
    return d;
  }
  function renderCalendar() {
    var map = dueEntries(), today = todayStr();
    var label = (calM + 1) + '/' + calY;
    var h = '<h1>Lịch</h1>' +
      '<div class="calnav"><button class="btn" data-a="calprev" aria-label="Tháng trước">‹</button>' +
      '<b>Tháng ' + label + '</b>' +
      '<button class="btn" data-a="calnext" aria-label="Tháng sau">›</button></div>' +
      '<div class="acts" style="margin:-4px 0 10px"><button class="btn" data-a="caltoday">Hôm nay</button></div>' +
      '<div class="calgrid">' + WD_LABELS.map(function (w) { return '<div class="wd">' + w + '</div>'; }).join('');
    var cur = calGridStart(calY, calM);
    for (var i = 0; i < 42; i++) {
      var ds = ymd(cur), entries = map[ds] || [];
      var done = entries.filter(function (x) { return x.sub ? x.sub.done : x.t.done; }).length;
      var dots = entries.slice(0, 4).map(function (x) {
        var isDone = x.sub ? x.sub.done : x.t.done;
        var cls = isDone ? 'done' : (ds < today ? 'late' : (ds === today ? 'now' : ''));
        return '<i class="' + cls + '"></i>';
      }).join('');
      h += '<button class="calday' + (cur.getMonth() !== calM ? ' out' : '') + (ds === today ? ' today' : '') +
        (ds === selDay ? ' sel' : '') + '" data-a="calday" data-day="' + ds + '">' +
        '<span class="dnum">' + cur.getDate() + '</span>' +
        (ds === wd() ? '<span class="wedmark">💍</span>' : (entries.length ? '<span class="caldots">' + dots + (entries.length > 4 ? '<span class="more">+' + (entries.length - 4) + '</span>' : '') + '</span>' : '')) +
        '</button>';
      cur.setDate(cur.getDate() + 1);
    }
    h += '</div>';
    var day = selDay || today, dayEntries = (map[day] || []).slice().sort(function (a, b) {
      return (a.sub ? a.sub.title : a.t.title).localeCompare(b.sub ? b.sub.title : b.t.title);
    });
    h += '<h2>📅 ' + fmt(day) + (day === today ? ' <span class="muted">(Hôm nay)</span>' : '') +
      (day === wd() ? ' <span class="muted">💍 Ngày cưới</span>' : '') + '</h2>';
    h += '<div class="card"><ul class="tasks">' + dayEntries.map(calEntryRow).join('') + '</ul>';
    if (!dayEntries.length) h += '<div class="empty">Chưa có việc nào vào ngày này.</div>';
    h += '<div class="acts"><button class="btn pri" data-a="caladd" data-day="' + day + '">+ Thêm việc cho ngày này</button></div></div>';
    return h;
  }
  function calEntryRow(x) {
    if (!x.sub) return taskRow(x.ev, x.t, true, true);
    var s = x.sub, d = 'data-e="' + x.ev.id + '" data-t="' + x.t.id + '" data-s="' + s.id + '"';
    return '<li class="task' + (s.done ? ' done' : '') + '">' +
      '<button class="chk" ' + d + ' data-a="togglesub" aria-label="Đánh dấu xong">✓</button>' +
      '<div class="tbody"><div class="ttl">' + esc(s.title) + '</div><div class="meta">' +
      '<span>' + esc(x.ev.emoji) + ' ' + esc(x.ev.title) + ' › ' + esc(x.t.title) + '</span></div></div></li>';
  }
  function addTaskOnDay(day) {
    var evs = state.events.filter(function (e) { return !e.hidden; });
    if (!evs.length) { toast('Chưa có sự kiện nào. Vào tab Sự kiện để thêm trước.'); return; }
    var opts = evs.map(function (e) { return '<option value="' + e.id + '">' + esc(e.emoji) + ' ' + esc(e.title) + '</option>'; }).join('');
    dialog('<b>Thêm việc cho ngày ' + fmt(day) + '</b><label>Tên việc</label><input type="text" name="title" required autocomplete="off">' +
      '<label>Thuộc sự kiện</label><select name="ev">' + opts + '</select>' +
      '<label>Ghi chú</label><textarea name="note" rows="2"></textarea>', function (d) {
      if (!d.title) return;
      mutate(function () {
        findEv(d.ev).tasks.push({ id: uid(), title: d.title, due: day, note: d.note, done: false, hidden: false, dueEdited: true, subtasks: [] });
        openEv[d.ev] = true;
      });
    });
  }

  // ---------- nhạc cưới ----------
  var MOMENTS = ['Đón khách', 'Cô dâu bước vào', 'Trao nhẫn / thề nguyện', 'Cắt bánh, rót rượu', 'Khai tiệc', 'Tiệc / dạ vũ', 'Tiễn khách', 'Khác'];
  function musicRow(m) {
    var d = 'data-m="' + m.id + '"';
    var meta = (m.moment ? '<span class="chip plain">' + esc(m.moment) + '</span>' : '') + (m.artist ? '<span>' + esc(m.artist) + '</span>' : '');
    var h = '<li class="task' + (m.done ? ' done' : '') + '">' +
      '<button class="chk" data-a="mtoggle" ' + d + ' aria-label="Đã chọn xong">✓</button>' +
      '<div class="tbody" data-a="mopen" ' + d + '><div class="ttl">' + esc(m.title) + '</div><div class="meta">' + meta + '</div></div></li>';
    if (openTask[m.id]) {
      h += '<div class="detail">' +
        (m.link ? '<div class="muted"><a href="' + esc(m.link) + '" target="_blank" rel="noopener">🔗 Nghe thử</a></div>' : '') +
        (m.note ? '<div class="note">' + esc(m.note) + '</div>' : '') +
        '<div class="acts"><button class="btn" data-a="medit" ' + d + '>✎ Sửa</button>' +
        '<button class="btn danger" data-a="mdel" ' + d + '>🗑 Xoá</button></div></div>';
    }
    return h;
  }
  function renderMusic() {
    var items = state.music.items;
    var h = '<h1>Nhạc cưới</h1><div class="muted">Ghi lại các bài hát dùng cho lễ và tiệc cưới.</div>';
    if (!items.length) h += '<div class="empty">Chưa có bài hát nào. Bấm “Thêm bài hát” để bắt đầu.</div>';
    h += '<div class="acts" style="margin-top:14px"><button class="btn pri" data-a="madd">+ Thêm bài hát</button></div>';
    var groups = {}, order = [];
    items.forEach(function (m) {
      var k = m.moment || '_';
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(m);
    });
    order.sort(function (a, b) {
      var ia = MOMENTS.indexOf(a), ib = MOMENTS.indexOf(b);
      if (a === '_') return 1; if (b === '_') return -1;
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1; if (ib === -1) return -1;
      return ia - ib;
    });
    order.forEach(function (k) {
      var done = groups[k].filter(function (m) { return m.done; }).length;
      h += '<h2>' + (k === '_' ? '🎵 Chưa phân loại' : esc(k)) + ' <span class="muted">(' + done + '/' + groups[k].length + ')</span></h2>' +
        '<div class="card"><ul class="tasks">' + groups[k].map(musicRow).join('') + '</ul></div>';
    });
    return h;
  }
  function editMusic(id) {
    var m = id ? state.music.items.find(function (x) { return x.id === id; }) : { title: '', artist: '', moment: '', link: '', note: '' };
    dialog('<b>' + (id ? 'Sửa bài hát' : 'Thêm bài hát') + '</b><label>Tên bài hát</label>' +
      '<input type="text" name="title" required value="' + esc(m.title) + '" autocomplete="off">' +
      '<label>Ca sĩ / phiên bản</label><input type="text" name="artist" value="' + esc(m.artist) + '" autocomplete="off">' +
      '<label>Dùng cho đoạn nào</label><input type="text" name="moment" list="momentList" value="' + esc(m.moment) + '" autocomplete="off">' +
      '<datalist id="momentList">' + MOMENTS.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' +
      '<label>Link nghe thử (YouTube, Spotify...)</label><input type="text" name="link" value="' + esc(m.link) + '" autocomplete="off">' +
      '<label>Ghi chú</label><textarea name="note" rows="2">' + esc(m.note) + '</textarea>', function (d) {
      if (!d.title) return;
      mutate(function () {
        var rec = id ? m : { id: uid(), done: false };
        rec.title = d.title; rec.artist = d.artist; rec.moment = d.moment; rec.link = d.link; rec.note = d.note;
        if (!id) state.music.items.push(rec);
      });
    });
  }

  function renderSettings() {
    return '<h1>Cài đặt</h1><div class="set">' +
      '<div class="card"><b>Thông tin đám cưới</b><form id="setForm">' +
      '<label>Tên cô dâu & chú rể</label><input type="text" name="names" value="' + esc(state.settings.names) + '" placeholder="VD: Lan & Minh">' +
      '<label>Ngày cưới</label><input type="date" name="date" value="' + esc(wd()) + '">' +
      '<div class="muted" style="margin-top:6px">Đổi ngày cưới sẽ tự dời hạn của các việc mẫu (trừ việc bạn đã tự chỉnh hạn).</div>' +
      '<div class="acts"><button class="btn pri" type="submit">Lưu</button></div></form></div>' +
      '<div class="card"><b>Nhắc việc bằng lịch điện thoại</b><div class="muted">Xuất file .ics rồi mở bằng ứng dụng Lịch. Mỗi việc chưa xong có báo thức trước 3 ngày, 1 ngày và 9h sáng ngày đến hạn.</div>' +
      '<div class="acts"><button class="btn pri" data-a="ics">📅 Xuất lịch (.ics)</button></div></div>' +
      '<div class="card"><b>Sao lưu</b><div class="muted">Dữ liệu chỉ nằm trong trình duyệt này. Hãy xuất file để sao lưu hoặc chuyển sang thiết bị khác.</div>' +
      '<div class="acts"><button class="btn" data-a="export">⬇ Xuất JSON</button><button class="btn" data-a="import">⬆ Nhập JSON</button></div></div>' +
      '<div class="card"><b>Xoá toàn bộ dữ liệu</b><div class="acts"><button class="btn danger" data-a="wipe">🗑 Xoá tất cả</button></div></div>' +
      '</div>';
  }

  function renderWelcome() {
    return '<div class="card hero" style="margin-top:24px"><div class="big">💍</div><h1>Việc Cưới</h1>' +
      '<div class="sub">Theo dõi mọi việc chuẩn bị đám cưới của bạn</div></div>' +
      '<div class="card set" style="margin-top:12px"><form id="startForm">' +
      '<label class="muted">Ngày cưới dự kiến</label><input type="date" name="date" required>' +
      '<div class="acts"><button class="btn pri big" type="submit" name="mode" value="tpl">Bắt đầu với danh sách mẫu</button></div>' +
      '<div class="acts"><button class="btn big" type="submit" name="mode" value="blank">Bắt đầu với danh sách trống</button></div>' +
      '</form></div>';
  }

  function render() {
    var fresh = !state.events.length && !wd();
    document.getElementById('tabs').style.display = fresh ? 'none' : '';
    if (fresh) app.innerHTML = renderWelcome();
    else app.innerHTML = tab === 'home' ? renderHome() : tab === 'events' ? renderEvents() : tab === 'calendar' ? renderCalendar() :
      tab === 'music' ? renderMusic() : tab === 'budget' ? renderBudget() : renderSettings();
    document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    var late = allActive().filter(function (x) { return !x.t.done && x.t.due && x.t.due <= todayStr(); }).length;
    document.title = (late ? '(' + late + ') ' : '') + 'Việc Cưới';
  }

  // ---------- thông báo & hộp thoại ----------
  function toast(msg, undo) {
    toastEl.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button>Hoàn tác</button>' : '');
    toastEl.classList.add('show');
    if (undo) toastEl.querySelector('button').onclick = function () { toastEl.classList.remove('show'); undo(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, undo ? 6000 : 2500);
  }
  function dialog(html, onSubmit) {
    dlg.innerHTML = '<form>' + html + '<div class="row"><button type="button" class="btn" id="dlgCancel">Huỷ</button>' +
      '<button type="submit" class="btn pri">Lưu</button></div></form>';
    var f = dlg.querySelector('form');
    dlg.querySelector('#dlgCancel').onclick = function () { dlg.close(); };
    f.onsubmit = function (e) {
      e.preventDefault();
      var data = {};
      new FormData(f).forEach(function (v, k) { data[k] = String(v).trim(); });
      dlg.close();
      onSubmit(data);
    };
    dlg.showModal();
    var first = f.querySelector('input,textarea,select'); if (first) first.focus();
  }

  function editTask(eid, tid) {
    var ev = findEv(eid), t = findTask(eid, tid);
    var opts = state.events.map(function (e) {
      return '<option value="' + e.id + '"' + (e.id === eid ? ' selected' : '') + '>' + esc(e.emoji) + ' ' + esc(e.title) + '</option>';
    }).join('');
    dialog('<b>Sửa việc</b><label>Tên việc</label><input type="text" name="title" required value="' + esc(t.title) + '">' +
      '<label>Thuộc sự kiện</label><select name="ev">' + opts + '</select>' +
      '<label>Hạn</label><input type="date" name="due" value="' + esc(t.due) + '">' +
      '<label>Ghi chú</label><textarea name="note" rows="3">' + esc(t.note) + '</textarea>', function (d) {
      if (!d.title) return;
      mutate(function () {
        t.title = d.title; t.note = d.note;
        if (d.due !== t.due) { t.due = d.due; t.dueEdited = true; }
        if (d.ev !== eid) {
          ev.tasks = ev.tasks.filter(function (x) { return x.id !== tid; });
          findEv(d.ev).tasks.push(t);
          openEv[d.ev] = true;
        }
      });
    });
  }
  function editSub(eid, tid, sid) {
    var t = findTask(eid, tid), s = t.subtasks.find(function (x) { return x.id === sid; });
    dialog('<b>Sửa việc con</b><label>Tên</label><input type="text" name="title" required value="' + esc(s.title) + '">' +
      '<label>Hạn</label><input type="date" name="due" value="' + esc(s.due) + '">', function (d) {
      if (d.title) mutate(function () { s.title = d.title; s.due = d.due; });
    });
  }
  function editEvent(eid) {
    var ev = eid ? findEv(eid) : { title: '', emoji: '📌' };
    dialog('<b>' + (eid ? 'Sửa sự kiện' : 'Thêm sự kiện') + '</b><label>Biểu tượng (emoji)</label><input type="text" name="emoji" maxlength="4" value="' + esc(ev.emoji) + '">' +
      '<label>Tên sự kiện</label><input type="text" name="title" required value="' + esc(ev.title) + '">', function (d) {
      if (!d.title) return;
      mutate(function () {
        if (eid) { ev.title = d.title; ev.emoji = d.emoji || '📌'; }
        else { var n = { id: uid(), title: d.title, emoji: d.emoji || '📌', hidden: false, tasks: [] }; state.events.push(n); openEv[n.id] = true; }
      });
    });
  }

  // ---------- xuất / nhập ----------
  function download(name, text, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function exportIcs() {
    var stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ViecCuoi//VI', 'CALSCALE:GREGORIAN'];
    function ev(id, date, summary, desc, alarms) {
      var d = date.replace(/-/g, ''), e = addDays(date, 1).replace(/-/g, '');
      L.push('BEGIN:VEVENT', 'UID:' + id + '@vieccuoi', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d, 'DTEND;VALUE=DATE:' + e,
        'SUMMARY:' + icsEsc(summary));
      if (desc) L.push('DESCRIPTION:' + icsEsc(desc));
      if (alarms) ['-P3D', '-P1D', 'PT9H'].forEach(function (tr) {
        L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(summary), 'TRIGGER:' + tr, 'END:VALARM');
      });
      L.push('END:VEVENT');
    }
    var n = 0;
    if (wd()) ev('wedding', wd(), '💍 Ngày cưới', '', false);
    allActive().forEach(function (x) {
      if (x.t.done) return;
      if (x.t.due) { ev(x.t.id, x.t.due, '☐ ' + x.t.title, x.ev.title + (x.t.note ? '\n' + x.t.note : ''), true); n++; }
      x.t.subtasks.forEach(function (s) {
        if (!s.done && s.due) { ev(s.id, s.due, '☐ ' + s.title, x.ev.title + ' › ' + x.t.title, true); n++; }
      });
    });
    state.budget.items.forEach(function (b) {
      var left = cost(b) - b.paid;
      if (b.payDue && left > 0) { ev(b.id, b.payDue, '💰 Trả ' + b.title + ': ' + money(left), b.note, true); n++; }
    });
    L.push('END:VCALENDAR');
    download('viec-cuoi.ics', L.join('\r\n'), 'text/calendar');
    toast('Đã xuất ' + n + ' việc ra lịch');
  }

  // ---------- sự kiện giao diện ----------
  function ctx(el) {
    var b = el.closest('[data-a]');
    return b ? { a: b.dataset.a, e: b.dataset.e, t: b.dataset.t, s: b.dataset.s, b: b.dataset.b, day: b.dataset.day, m: b.dataset.m, el: b } : null;
  }
  app.addEventListener('click', function (ev) {
    var c = ctx(ev.target);
    if (!c) return;
    var t = c.e && c.t ? findTask(c.e, c.t) : null;
    var evt = c.e ? findEv(c.e) : null;
    switch (c.a) {
      case 'toggle':
        mutate(function () {
          t.done = !t.done;
          t.doneAt = t.done ? todayStr() : '';
          t.subtasks.forEach(function (s) { s.done = t.done; });
        }); break;
      case 'togglesub':
        mutate(function () {
          var s = t.subtasks.find(function (x) { return x.id === c.s; });
          s.done = !s.done;
          t.done = t.subtasks.every(function (x) { return x.done; });
        }); break;
      case 'expand': openTask[c.t] = !openTask[c.t]; render(); break;
      case 'evopen': openEv[c.e] = !openEv[c.e]; render(); break;
      case 'edit': editTask(c.e, c.t); break;
      case 'editsub': editSub(c.e, c.t, c.s); break;
      case 'delsub':
        mutate(function () { t.subtasks = t.subtasks.filter(function (x) { return x.id !== c.s; }); }, 'Đã xoá việc con'); break;
      case 'dup':
        mutate(function () {
          var copy = JSON.parse(JSON.stringify(t));
          copy.id = uid(); copy.tpl = undefined; copy.title += ' (bản sao)'; copy.done = false;
          copy.subtasks.forEach(function (s) { s.id = uid(); s.done = false; });
          evt.tasks.splice(evt.tasks.indexOf(t) + 1, 0, copy);
        }, 'Đã nhân bản việc'); break;
      case 'hidetask':
        mutate(function () { t.hidden = !t.hidden; }, t.hidden ? 'Đã ẩn việc' : null); break;
      case 'deltask':
        mutate(function () { evt.tasks = evt.tasks.filter(function (x) { return x.id !== c.t; }); }, 'Đã xoá việc'); break;
      case 'evedit': editEvent(c.e); break;
      case 'evhide': mutate(function () { evt.hidden = !evt.hidden; }, evt.hidden ? 'Đã ẩn sự kiện' : null); break;
      case 'evdel':
        mutate(function () { state.events = state.events.filter(function (x) { return x.id !== c.e; }); }, 'Đã xoá sự kiện'); break;
      case 'evadd': editEvent(null); break;
      case 'tplload':
        mutate(function () { var n = applyTemplate(); toast(n ? 'Đã thêm ' + n + ' việc mẫu' : 'Không có việc mẫu nào thiếu'); }); break;
      case 'bdopen': openTask[c.b] = !openTask[c.b]; render(); break;
      case 'bdadd': editBudget(null); break;
      case 'bdedit': editBudget(c.b); break;
      case 'bddel':
        mutate(function () { state.budget.items = state.budget.items.filter(function (x) { return x.id !== c.b; }); }, 'Đã xoá khoản chi'); break;
      case 'bdpaid':
        mutate(function () { var b = state.budget.items.find(function (x) { return x.id === c.b; }); b.paid = cost(b); }, 'Đã đánh dấu trả đủ'); break;
      case 'bdtotal':
        dialog('<b>Tổng ngân sách</b><label>Số tiền (đ)</label><input type="text" inputmode="numeric" name="total" value="' + (state.budget.total || '') + '">',
          function (d) { mutate(function () { state.budget.total = num(d.total); }); }); break;
      case 'calprev': calM--; if (calM < 0) { calM = 11; calY--; } render(); break;
      case 'calnext': calM++; if (calM > 11) { calM = 0; calY++; } render(); break;
      case 'caltoday': var n = new Date(); calY = n.getFullYear(); calM = n.getMonth(); selDay = todayStr(); render(); break;
      case 'calday': selDay = c.day; calY = parse(c.day).getFullYear(); calM = parse(c.day).getMonth(); render(); break;
      case 'caladd': addTaskOnDay(c.day); break;
      case 'mopen': openTask[c.m] = !openTask[c.m]; render(); break;
      case 'madd': editMusic(null); break;
      case 'medit': editMusic(c.m); break;
      case 'mtoggle':
        mutate(function () { var m = state.music.items.find(function (x) { return x.id === c.m; }); m.done = !m.done; }); break;
      case 'mdel':
        mutate(function () { state.music.items = state.music.items.filter(function (x) { return x.id !== c.m; }); }, 'Đã xoá bài hát'); break;
      case 'ics': exportIcs(); break;
      case 'export':
        download('viec-cuoi-' + todayStr() + '.json', JSON.stringify(state, null, 2), 'application/json'); break;
      case 'import': document.getElementById('importFile').click(); break;
      case 'wipe':
        if (confirm('Xoá toàn bộ sự kiện và việc? Hành động này không hoàn tác được.')) {
          state = empty(); save(); tab = 'home'; render();
        } break;
    }
  });

  app.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target;
    if (f.id === 'startForm') {
      var mode = ev.submitter && ev.submitter.value;
      state.settings.weddingDate = f.date.value;
      if (mode === 'tpl') { applyTemplate(); openEv[state.events[0].id] = true; }
      else state.events.push({ id: uid(), title: 'Sự kiện đầu tiên', emoji: '📌', hidden: false, tasks: [] });
      save(); tab = mode === 'tpl' ? 'home' : 'events'; render(); return;
    }
    if (f.id === 'setForm') {
      mutate(function () {
        var changed = f.date.value !== state.settings.weddingDate;
        state.settings.names = f.names.value.trim();
        state.settings.weddingDate = f.date.value;
        if (changed) recomputeDue();
      });
      toast('Đã lưu cài đặt'); return;
    }
    var title = f.title && f.title.value.trim();
    if (!title) return;
    var c = ctx(f), evt = findEv(c.e);
    if (c.a === 'addtask') {
      mutate(function () {
        evt.tasks.push({ id: uid(), title: title, due: '', note: '', done: false, hidden: false, dueEdited: false, subtasks: [] });
      });
      var inp = app.querySelector('form[data-a="addtask"][data-e="' + c.e + '"] input'); if (inp) inp.focus();
    } else if (c.a === 'addsub') {
      mutate(function () {
        var t = findTask(c.e, c.t);
        t.subtasks.push({ id: uid(), title: title, due: '', done: false });
        t.done = false;
      });
      var inp2 = app.querySelector('form[data-a="addsub"][data-t="' + c.t + '"] input'); if (inp2) inp2.focus();
    }
  });

  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    tab = b.dataset.tab; render(); window.scrollTo(0, 0);
  });
  document.getElementById('importFile').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var s = JSON.parse(r.result);
        if (!s || !Array.isArray(s.events)) throw new Error('bad');
        if (!confirm('Nhập dữ liệu sẽ thay thế toàn bộ dữ liệu hiện tại. Tiếp tục?')) return;
        state = normalize(s);
        save(); render(); toast('Đã nhập dữ liệu');
      } catch (err) { toast('File không hợp lệ'); }
    };
    r.readAsText(file); e.target.value = '';
  });

  render();
})();
