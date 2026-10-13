
"use strict";


const S = {
  started: false,
  difficulty: "easy",
  flags: {},
  searchHistory: [],
  clock: { date: "2066-10-12", time: "09:23" },
  ui: {
    mail: { acct: "me", sel: null, acctSel: "me", filter: "" },
    cloud: { view: null },
    browser: { page: "home", query: "", results: null, pageUrl: "search.xd.net/home" },
    remote: { view: "desktop" },
    id: { mode: "press", pressLogged: false, backdoorLogged: false, query: "", archQuery: "", recheck: false, tapeDecrypted: false },
    voice: { sel: null, vpA: "", vpB: "", vpResult: "" },
    cms: { tab: "tips" },
    chat: { msgs: [], initialized: false },
    map: { view: "city" },
    obs: { view: "outside", unlocked: false, tried: [] },
  },
  windows: {},
  zTop: 100,
  audioCtx: null,
  _voiceAudio: null,
  _passCheck: null,
  _passOk: null,
  _passTries: 0,
  _passForceHint: "",
};

const $ = (sel) => document.querySelector(sel);
const has = (f) => !!S.flags[f];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");


let _audioUnlocked = false;
function unlockAudio() {
  if (_audioUnlocked) return;
  _audioUnlocked = true;
  try {
    const ctx = ac();
    if (ctx.state === "suspended") ctx.resume();
  } catch (e) {}
  try {
    const a = new Audio();
    a.play().then(() => a.pause()).catch(() => {});
  } catch (e) {}
}
function ac() {
  if (!S.audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    S.audioCtx = new AC();
  }
  if (S.audioCtx.state === "suspended") S.audioCtx.resume();
  return S.audioCtx;
}
function beep(freq, dur, vol = 0.08, when = 0) {
  try {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + when); o.stop(c.currentTime + when + dur + 0.05);
  } catch (e) {}
}
const ding = () => { beep(880, .12); beep(1318, .18, .06, .1); };
const beepErr = () => { beep(220, .2, .1); };
const beepRing = () => { beep(440, .4, .06); beep(440, .4, .06, .8); };
const beepGunshot = () => { beep(90, .35, .3); beep(60, .5, .25, .05); };

/* ---------------- Toast ---------------- */
["click", "touchstart", "keydown"].forEach(ev =>
  document.addEventListener(ev, unlockAudio, { once: false, passive: true })
);
function toast(title, body, kind = "", onClick = null, ms = 10000) {
  const area = $("#toast-area");
  const el = document.createElement("div");
  el.className = "toast " + kind;
  el.innerHTML = `<div class="t-title"><span>${toastGlyph(title)}</span></div><div class="t-body">${body}</div><button class="t-close" aria-label="关闭通知">✕</button>`;
  const dismiss = () => { el.classList.add("out"); setTimeout(() => el.remove(), 320); };
  el.onclick = () => { if (onClick) onClick(); dismiss(); };
  el.querySelector(".t-close").addEventListener("click", (e) => { e.stopPropagation(); dismiss(); });

  // —— 同屏已有其它提示时自动延长留存时间：避免两条同时弹出时来不及看清 ——
  const others = area.querySelectorAll(".toast:not(.out)").length;
  let remain = Math.max(ms, 8000) + others * 4000;   // 已有 n 条 → 本条 +4s·n
  let deadline = 0, timer = null;
  const arm = () => { deadline = Date.now() + remain; if (timer) clearTimeout(timer); timer = setTimeout(dismiss, remain); };
  const pause = () => { if (!timer) return; clearTimeout(timer); timer = null; remain = Math.max(2000, deadline - Date.now()); };
  const resume = () => { if (!timer) arm(); };
  el._toastExtend = (add) => { remain += add; if (timer) arm(); };

  area.appendChild(el);
  arm();
  if (S.difficulty !== "easy") ding();

  // 鼠标悬停暂停倒计时，移开后继续；先弹出的那条也随新提示一起延长
  el.addEventListener("mouseenter", pause);
  el.addEventListener("mouseleave", resume);
  if (others) area.querySelectorAll(".toast:not(.out)").forEach(t => { if (t !== el && t._toastExtend) t._toastExtend(4000); });

  return el;
}


const HIRE_MSGS = [
  { who: "me",   time: "09:47", text: "陈主编您好，我是新传2066届毕业生，投递了贵社实习记者岗。附上作品集《城中村拆迁手记》。" },
  { who: "boss", time: "09:52", text: "看完了。\n你这篇写的是老城区。\n三个月蹲点，40多个采访对象，最后被压稿。\n为什么？" },
  { who: "me",   time: "09:53", text: "因为稿子里提到了一家开发商。\n后来他们在我妈的店里查了三次消防。" },
  { who: "boss", time: "09:55", text: "稿子还在吗？" },
  { who: "me",   time: "09:55", text: "在。\n三个版本，原稿在境外网盘。" },
  { who: "boss", time: "09:56", text: "明天上午九点，编辑部。\n带原稿。" },
  { who: "me",   time: "09:56", text: "收到。" },
  { who: "boss", time: "09:58", text: "等一下。" },
  { who: "me",   time: "09:58", text: "您说。" },
  { who: "boss", time: "09:58", text: "我们这行有个规矩。\n你写的东西，一旦发出去，就收不回来。\n你可能会丢工作，丢朋友，丢你能安睡的房间。\n你还来吗？" },
  { who: "me",   time: "10:00", text: "来。\n我住的地方本来也不安静。" },
  { who: "boss", time: "10:01", text: "记一下，明天带身份证和银行卡复印件。\n人事流程得走。" },
  { who: "me",   time: "10:01", text: "好的陈主编。" },
  { who: "boss", time: "10:01", text: "别叫陈主编。" },
  { who: "me",   time: "10:01", text: "那叫什么？" },
  { who: "boss", time: "10:01", text: "大家都叫我陈姐。\n进了这个门，就没有主编了。\n只有还没被和谐掉的同事。" },
];
const HIRE_CHOICES = {
  0:  { correct: "陈主编您好，我是新传2066届毕业生，投递了贵社实习记者岗。附上作品集《城中村拆迁手记》。",
        wrong: "你好，我投了简历，什么时候有消息？",
        retort: "简历太多，说重点。你是谁？" },
  2:  { correct: "因为稿子里提到了一家开发商。\n后来他们在我妈的店里查了三次消防。",
        wrong: "有人压我的稿。",
        retort: "谁压的？说清楚。" },
  4:  { correct: "在。\n三个版本，原稿在境外网盘。",
        wrong: "应该在吧。",
        retort: "应该在？我要的是确定。" },
  6:  { correct: "收到。",
        wrong: "没问题！",
        retort: "……我说的是带原稿，不是口号。" },
  8:  { correct: "您说。",
        wrong: "嗯？",
        retort: "嗯什么，听好。" },
  10: { correct: "来。\n我住的地方本来也不安静。",
        wrong: "让我想想。",
        retort: "你犹豫了。这行不适合犹豫的人。" },
  12: { correct: "好的陈主编。",
        wrong: "好的，领导。",
        retort: "叫陈姐。这里没有领导。" },
};
function hcTimeFmt(t) {
  const h = parseInt(t.slice(0, 2), 10);
  return (h < 12 ? "上午 " : "下午 ") + t;
}
function scrollHire(box) { box.scrollTop = box.scrollHeight; }
function playHireChat() {
  const box = $("#hc-messages");
  const action = $("#hc-action");
  const inputBar = $("#hc-input-bar");
  if (!box) return;
  box.innerHTML = "";
  action.innerHTML = "";
  if (inputBar) inputBar.innerHTML = `<span class="hc-input-text" id="hc-input-text">...</span>`;

  let i = 0, prevTime = "", finished = false;
  function addTs(t) {
    const d = document.createElement("div");
    d.className = "hc-ts";
    d.textContent = hcTimeFmt(t);
    box.appendChild(d);
  }
  function addTyping() {
    const d = document.createElement("div");
    d.className = "hc-row boss";
    d.dataset.typing = "1";
    d.innerHTML = `<div class="hc-avatar hc-boss small">陈</div><div class="hc-typing"><i></i><i></i><i></i></div>`;
    box.appendChild(d);
    scrollHire(box);
  }
  function addBubble(who, text) {
    const row = document.createElement("div");
    row.className = "hc-row " + (who === "me" ? "me" : "boss");
    row.innerHTML = `<div class="hc-avatar ${who === "me" ? "hc-me" : "hc-boss"} small">${who === "me" ? "沈" : "陈"}</div>
      <div class="hc-bubble">${esc(text).replace(/\n/g, " ")}</div>`;
    box.appendChild(row);
    scrollHire(box);
  }
  function showChoices(idx) {
    const ch = HIRE_CHOICES[idx];
    if (!ch) return;
    if (inputBar) inputBar.innerHTML = `<span class="hc-input-text" style="color:#8a94a6">选择你要发送的回复：</span>`;
    action.innerHTML = `<div class="hc-choices">
      <button class="btn hc-choice" data-choice="correct">${esc(ch.correct).replace(/\n/g, "<br>")}</button>
      <button class="btn hc-choice" data-choice="wrong">${esc(ch.wrong)}</button>
    </div>`;
    action.querySelectorAll(".hc-choice").forEach(b => {
      b.addEventListener("click", () => {
        action.innerHTML = "";
        if (inputBar) inputBar.innerHTML = `<span class="hc-input-text">...</span>`;
        if (b.dataset.choice === "correct") {
          addBubble("me", ch.correct);
          beep(660, .06, .04);
          i++;
          setTimeout(next, 350);
        } else {
          addBubble("me", ch.wrong);
          beepErr();
          setTimeout(() => {
            addTyping();
            setTimeout(() => {
              const t = box.querySelector('[data-typing="1"]');
              if (t) t.remove();
              addBubble("boss", ch.retort);
              setTimeout(() => showChoices(idx), 500);
            }, 700);
          }, 650);
        }
      });
    });
    scrollHire(box);
  }
  function next() {
    if (i >= HIRE_MSGS.length) {
      if (finished) return;
      finished = true;
      action.innerHTML = `<button class="btn btn-primary btn-lg" data-action="hire-accept">明日赴约 · 入职</button>`;
      beep(880, .12, .06);
      return;
    }
    const m = HIRE_MSGS[i];
    if (m.time !== prevTime) { addTs(m.time); prevTime = m.time; }
    if (m.who === "me") {
      if (HIRE_CHOICES[i]) { showChoices(i); return; }
      setTimeout(() => {
        addBubble("me", m.text);
        i++;
        setTimeout(next, 320);
      }, 450);
    } else {
      addTyping();
      setTimeout(() => {
        const t = box.querySelector('[data-typing="1"]');
        if (t) t.remove();
        addBubble("boss", m.text);
        i++;
        setTimeout(next, 420);
      }, 700 + Math.random() * 450);
    }
  }
  next();
}


const APPS = {
  cms:     { name: "星都观察者·新闻后台", glyph: "闻", w: 720, h: 560 },
  mail:    { name: "邮箱客户端",          glyph: "邮", w: 780, h: 560 },
  browser: { name: "星搜 · 星都公共信息网", glyph: "搜", w: 840, h: 580 },
  cloud:   { name: "星云网盘 · 共享",     glyph: "盘", w: 680, h: 520 },
  remote:  { name: "远程连接 · LIN-PC",  glyph: "远", w: 700, h: 540 },
  chat:    { name: "加密频道 · 加密用户BC",     glyph: "密", w: 560, h: 620 },
  map:     { name: "星途地图",            glyph: "图", w: 720, h: 680 },
  id:      { name: "星都居民ID系统",      glyph: "证", w: 660, h: 560 },
  voice:   { name: "语音助手 · 星灵",     glyph: "声", w: 660, h: 620 },
  log:     { name: "系统监控 · 日志",     glyph: "监", w: 640, h: 460 },
  obj:     { name: "任务目标",            glyph: "◎",  w: 500, h: 500 },
  doc:     { name: "城中村拆迁手记 · 试读", glyph: "文", w: 780, h: 640 },
};

function openApp(appId) {
  if (appId === "obj" && S.difficulty !== "easy") {
    toast(" 普通难度", "任务目标与提示已关闭。卡住的话……攻略文件在游戏目录里。", "", null, 6000);
    return;
  }
  if (appId === "chat" && S.flags.chat_unread) {
    S.flags.chat_unread = false;
    renderIcons();
  }
  if (S.windows[appId]) { focusWin(appId); return; }
  if (appId === "mail") S.ui.mail.sel = null;
  const a = APPS[appId];
  const el = document.createElement("div");
  el.className = "window active";
  el.dataset.app = appId;
  const offset = Object.keys(S.windows).length * 26;
  const x = Math.max(40, Math.min(90 + offset, window.innerWidth - a.w - 40));
  const y = Math.max(20, Math.min(40 + offset, window.innerHeight - a.h - 70));
  el.style.cssText = `left:${x}px;top:${y}px;width:${a.w}px;height:${a.h}px`;
  el.innerHTML = `
    <div class="win-titlebar">
      <div class="win-title">${miniIcon(appId)}${a.name}</div>
      <div class="win-btns">
        <button class="win-btn" data-action="win-min" data-arg="${appId}" aria-label="最小化"><svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2.5 6h7"/></svg></button>
        <button class="win-btn" data-action="win-max" data-arg="${appId}" aria-label="最大化"><svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2.5" y="2.5" width="7" height="7" rx="0.5"/></svg></button>
        <button class="win-btn close" data-action="win-close" data-arg="${appId}" aria-label="关闭"><svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg></button>
      </div>
    </div>
    <div class="win-body" data-body="${appId}"><div class="app-loading"><div class="al-ring"></div>正在加载…</div></div>
    <div class="win-resize" title="拖拽调整大小"></div>`;
  $("#window-layer").appendChild(el);
  S.windows[appId] = { el, minimized: false };
  makeDraggable(el, el.querySelector(".win-titlebar"));
  makeResizable(el, el.querySelector(".win-resize"));
  el.addEventListener("pointerdown", () => focusWin(appId));
  focusWin(appId);
  beep(700, .04, .02);
  setTimeout(() => { if (S.windows[appId]) refreshApp(appId); }, 200 + Math.random() * 220);
  updateTaskbar();
}
function closeWin(appId) {
  if (!S.windows[appId]) return;
  if (appId === "voice") { stopVoiceAudio(); S.ui.voice.sel = null; }
  const el = S.windows[appId].el;
  delete S.windows[appId];
  el.classList.add("closing");
  beep(420, .05, .02);
  setTimeout(() => el.remove(), 150);
  updateTaskbar();
}
function focusWin(appId) {
  const w = S.windows[appId]; if (!w) return;
  if (w.minimized) { w.minimized = false; w.el.style.display = ""; }
  w.el.classList.add("active");
  w.el.style.zIndex = ++S.zTop;
  Object.entries(S.windows).forEach(([id, o]) => { if (id !== appId) o.el.classList.remove("active"); });
  updateTaskbar();
}
function makeDraggable(el, handle) {
  if (!handle) return;
  let sx, sy, ox, oy, dragging = false;
  handle.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    dragging = true; sx = e.clientX; sy = e.clientY;
    ox = el.offsetLeft; oy = el.offsetTop;
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    el.style.left = Math.max(-100, ox + e.clientX - sx) + "px";
    el.style.top = Math.max(0, oy + e.clientY - sy) + "px";
  });
  handle.addEventListener("pointerup", () => dragging = false);
  handle.addEventListener("pointercancel", () => dragging = false);
}
function makeResizable(el, handle) {
  if (!handle) return;
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX, sy = e.clientY;
    const ow = el.offsetWidth, oh = el.offsetHeight;
    try { handle.setPointerCapture(e.pointerId); } catch (err) {}
    const move = (ev) => {
      el.style.width = Math.max(360, ow + ev.clientX - sx) + "px";
      el.style.height = Math.max(260, oh + ev.clientY - sy) + "px";
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  });
}
function updateTaskbar() {
  document.body.classList.toggle("has-win", Object.keys(S.windows).length > 0);
  const tb = $("#tb-windows"); tb.innerHTML = "";
  Object.entries(S.windows).forEach(([id, w]) => {
    const a = APPS[id];
    const b = document.createElement("div");
    b.className = "tb-win" + (w.el.classList.contains("active") && !w.minimized ? " active" : "");
    b.innerHTML = `${miniIcon(id)}<span>${a.name.split("·")[0].trim()}</span>`;
    b.onclick = () => {
      if (w.minimized) focusWin(id);
      else if (w.el.classList.contains("active")) { w.minimized = true; w.el.style.display = "none"; updateTaskbar(); }
      else focusWin(id);
    };
    tb.appendChild(b);
  });
}
function refreshAll() { Object.keys(S.windows).forEach(refreshApp); renderIcons(); renderObjectives(); }


const ICON_COLORS = {
  cms: "#5aa9e6", mail: "#e6b45a", browser: "#52d0a8", cloud: "#7f9ff0",
  remote: "#f08a72", chat: "#b98af0", map: "#4ae0c0", id: "#e6d05a", voice: "#56c8ea",
  log: "#8a9aa8", obj: "#9b8cf5",
};
function iconColorStyle(id) {
  const c = ICON_COLORS[id] || "#5aa9e6";
  const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
  return `--ic:${c};--icg:rgba(${r},${g},${b},.45)`;
}

const ICON_SVG = {
  cms: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h13a1 1 0 0 1 1 1v13H5a1 1 0 0 1-1-1V5z"/><path d="M8 9h6M8 12h6M8 15.5h4"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/></svg>`,
  browser: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>`,
  cloud: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 18a4.2 4.2 0 0 1-.5-8.4 5.5 5.5 0 0 1 10.7-1.4A4.5 4.5 0 0 1 17.5 18h-10z"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>`,
  voice: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>`,
  id: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10.5" r="1.8"/><path d="M5.5 16c.6-1.8 1.9-2.5 3.5-2.5s2.9.7 3.5 2.5M15 9.5h4M15 13h4"/></svg>`,
  log: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>`,
  obj: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>`,
  remote: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/></svg>`,
  chat: `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/></svg>`
};



const SVG_LIB = {
  "search": "<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"M20 20l-4.2-4.2\"/>",
  "folder": "<path d=\"M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/>",
  "file": "<path d=\"M7 3h7l4 4v14H7z\"/><path d=\"M14 3v4h4\"/><path d=\"M10 12h6M10 16h6\"/>",
  "photo": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><circle cx=\"9\" cy=\"10\" r=\"1.6\"/><path d=\"M4 18l5-5 4 4 3-3 4 4\"/>",
  "note": "<path d=\"M5 4h11l3 3v13H5z\"/><path d=\"M16 4v3h3\"/><path d=\"M8 12h8M8 16h6\"/>",
  "table": "<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"1.5\"/><path d=\"M4 10h16M10 4v16\"/>",
  "chat": "<path d=\"M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z\"/><path d=\"M8 10h8M8 13h5\"/>",
  "lock": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"9\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 0 1 8 0v3\"/><circle cx=\"12\" cy=\"15.5\" r=\"1.3\"/>",
  "unlock": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"9\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 0 1 7.8-1.2\"/><circle cx=\"12\" cy=\"15.5\" r=\"1.3\"/>",
  "key": "<circle cx=\"8\" cy=\"8\" r=\"4.5\"/><path d=\"M11.5 11.5L20 20M15 15l2.5-2.5\"/>",
  "cash": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M9.5 9.5c0-1.1 1.1-1.5 2.5-1.5s2.5.4 2.5 1.5-1 1.3-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.4 2.5-1.5\"/>",
  "usb": "<rect x=\"8\" y=\"3\" width=\"8\" height=\"6\" rx=\"1.5\"/><path d=\"M6 9h12v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z\"/>",
  "recycle": "<path d=\"M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13\"/><path d=\"M10 11v6M14 11v6\"/>",
  "alert": "<path d=\"M12 3L2.5 20h19z\"/><path d=\"M12 10v4M12 16.5v.1\"/>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 11v5M12 7.5v.1\"/>",
  "danger": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 8v5M12 16v.1\"/>",
  "check": "<path d=\"M5 12l5 5 9-10\"/>",
  "pin": "<path d=\"M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z\"/><circle cx=\"12\" cy=\"10\" r=\"2.5\"/>",
  "star": "<path d=\"M12 3l2.6 5.6 6.4.7-4.7 4.2 1.3 6-5.6-3.3-5.6 3.3 1.3-6L3 9.3l6.4-.7z\"/>",
  "fire": "<path d=\"M12 3c1 4-4 5-4 10a4 4 0 0 0 8 0c0-2-1-3-1-3s2 1 2 3a6 6 0 0 1-12 0c0-5 7-7 7-10z\"/>",
  "user": "<circle cx=\"12\" cy=\"8\" r=\"3.5\"/><path d=\"M5 20c1-3.5 3.5-5 7-5s6 1.5 7 5\"/>",
  "heart": "<path d=\"M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z\"/>",
  "child": "<circle cx=\"12\" cy=\"9\" r=\"3.5\"/><path d=\"M5.5 20c1-4 3.5-6 6.5-6s5.5 2 6.5 6\"/>",
  "school": "<path d=\"M3 10l9-5 9 5-9 5z\"/><path d=\"M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5\"/>",
  "plane": "<path d=\"M3 11l18-7-7 18-2-8z\"/>",
  "gene": "<path d=\"M8 4c4 0 8 2 8 8s-4 8-8 8M16 4c-4 0-8 2-8 8s4 8 8 8\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\"/>",
  "lab": "<path d=\"M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3\"/><path d=\"M8 15h8\"/>",
  "hospital": "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><path d=\"M12 8v6M9 11h6\"/>",
  "globe": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M3.5 12h17M12 3.5c2.5 2.3 3.8 5 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5-3.8-8.5s1.3-6.2 3.8-8.5z\"/>",
  "phone": "<path d=\"M6 3h4l1.5 5-2.5 2a12 12 0 0 0 5 5l2-2.5 5 1.5v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z\"/>",
  "camera": "<rect x=\"3\" y=\"7\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M8 7l1.5-3h5L16 7\"/><circle cx=\"12\" cy=\"13.5\" r=\"3.5\"/>",
  "video": "<rect x=\"3\" y=\"6\" width=\"13\" height=\"12\" rx=\"2\"/><path d=\"M16 11l5-3v8l-5-3z\"/>",
  "calendar": "<rect x=\"4\" y=\"5\" width=\"16\" height=\"16\" rx=\"2\"/><path d=\"M4 9h16M8 3v4M16 3v4\"/>",
  "trophy": "<path d=\"M8 4h8v5a4 4 0 0 1-8 0z\"/><path d=\"M8 5H4v2a4 4 0 0 0 5 4M16 5h4v2a4 4 0 0 1-5 4M12 13v5M9 21h6M10 18h4\"/>",
  "shield": "<path d=\"M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6z\"/>",
  "eye": "<path d=\"M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/>",
  "fish": "<path d=\"M3 12c4-3 9-4.5 14-4.5l4 4.5-4 4.5c-5 0-10-1.5-14-4.5z\"/><circle cx=\"17.5\" cy=\"12\" r=\".6\"/>",
  "moon": "<path d=\"M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z\"/>",
  "candle": "<path d=\"M12 4l1.5 2h-3z\"/><rect x=\"9\" y=\"6\" width=\"6\" height=\"10\" rx=\"2\"/><path d=\"M9 16h6l-1 5h-4z\"/><path d=\"M12 9v3\"/>",
  "ship": "<path d=\"M3 13h18l-3-6H6z\"/><path d=\"M4 17l1 4h14l1-4\"/><path d=\"M12 7V3\"/>",
  "wave": "<path d=\"M3 10c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2M3 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2\"/>",
  "home": "<path d=\"M4 11l8-7 8 7\"/><path d=\"M6 10v10h12V10\"/>",
  "factory": "<path d=\"M3 21h18M4 21V10l5 4V10l5 4V7h6v14\"/>",
  "snow": "<path d=\"M12 3v18M5 6.5l14 11M19 6.5l-14 11\"/>",
  "brain": "<path d=\"M12 4s6 6 6 10a6 6 0 0 1-12 0c0-4 6-10 6-10z\"/>",
  "book": "<path d=\"M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z\"/><path d=\"M7 4v14\"/>",
  "paw": "<circle cx=\"8\" cy=\"9\" r=\"1.8\"/><circle cx=\"12\" cy=\"6.5\" r=\"1.8\"/><circle cx=\"16\" cy=\"9\" r=\"1.8\"/><path d=\"M7 11c0 2 2 3.5 5 3.5s5-1.5 5-3.5c0-1 .8-2 2-2M12 14.5V19\"/>",
  "pen": "<path d=\"M4 20l1-4L16 5l3 3L8 19z\"/><path d=\"M14 7l3 3\"/>",
  "send": "<path d=\"M12 16V5M7 10l5-5 5 5\"/><path d=\"M4 19h16\"/>",
  "clipboard": "<rect x=\"6\" y=\"4\" width=\"12\" height=\"17\" rx=\"2\"/><path d=\"M9 4a3 3 0 0 1 6 0\"/><path d=\"M9 10h6M9 14h6\"/>",
  "backdoor": "<circle cx=\"12\" cy=\"12\" r=\"7\"/><path d=\"M12 8v4l3 2\"/>",
  "flashlight": "<rect x=\"9\" y=\"3\" width=\"6\" height=\"7\" rx=\"1.5\"/><path d=\"M10 10l-1 11h6l-1-11\"/><path d=\"M10.5 14h3\"/>",
  "satellite": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 9L9 6M12 15l4 4M12 9v-4M12 15v5M9 12H4M15 12h5\"/>",
  "tools": "<path d=\"M14 4l6 6-3 3-6-6z\"/><path d=\"M11 7l-7 7 3 3 7-7\"/>",
  "refresh": "<path d=\"M20 12a8 8 0 1 1-2.3-5.6M20 3v5h-5\"/>",
  "bolt": "<path d=\"M13 3L5 13h6l-1 8 8-10h-6z\"/>",
  "web": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M3.5 12h17M12 3.5c2.5 2.3 3.8 5 3.8 8.5s-1.3 6.2-3.8 8.5\"/>",
  "close": "<path d=\"M6 6l12 12M18 6L6 18\"/>",
  "report": "<path d=\"M4 5h13a1 1 0 0 1 1 1v13H5a1 1 0 0 1-1-1V5z\"/><path d=\"M8 9h6M8 12h6M8 15.5h4\"/>",
  "mic": "<rect x=\"9\" y=\"3\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6\"/>",
  "mute": "<path d=\"M12 4l-4 4H5v8h3l4 4z\"/><path d=\"M17 10l4 4M21 10l-4 4\"/>",
  "scale": "<path d=\"M12 4v16M8 20h8M6 6h12M6 6l-2 5a3 3 0 0 0 6 0zM18 6l2 5a3 3 0 0 1-6 0z\"/>",
  "target": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
  "game": "<rect x=\"3\" y=\"7\" width=\"18\" height=\"10\" rx=\"2\"/><path d=\"M7 10v4M5 12h4M15 11h.1M18 13h.1\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7.5V12l3 2\"/>",
  "building": "<rect x=\"5\" y=\"4\" width=\"14\" height=\"17\" rx=\"1.5\"/><path d=\"M9 8h6M9 12h6M9 16h6\"/>",
  "spark": "<path d=\"M12 3a5.5 5.5 0 0 0-3 10c.6.6 1 1.3 1 2h4c0-.7.4-1.4 1-2a5.5 5.5 0 0 0-3-10z\"/><path d=\"M9 18h6M10 21h4\"/>",
  "atom": "<circle cx=\"12\" cy=\"12\" r=\"2\"/><ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"4\"/><ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"4\" transform=\"rotate(60 12 12)\"/><ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"4\" transform=\"rotate(120 12 12)\"/>",
  "dish": "<path d=\"M3 13h18a9 9 0 0 1-18 0z\"/><path d=\"M7 13a5 5 0 0 1 10 0M12 13v-4\"/>",
  "id": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2.5\"/><circle cx=\"9\" cy=\"10.5\" r=\"1.8\"/><path d=\"M5.5 16c.6-1.8 1.9-2.5 3.5-2.5s2.9.7 3.5 2.5M15 9.5h4M15 13h4\"/>",
  "map": "<path d=\"M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z\"/><path d=\"M9 4v14M15 6v14\"/>",
  "cloud": "<path d=\"M7.5 18a4.2 4.2 0 0 1-.5-8.4 5.5 5.5 0 0 1 10.7-1.4A4.5 4.5 0 0 1 17.5 18h-10z\"/>",
  "monitor": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"1.5\"/><path d=\"M9 20h6M12 16v4\"/>",
  "letter": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2.5\"/><path d=\"M3.5 7l8.5 6 8.5-6\"/>",
  "doc": "<path d=\"M7 3h7l4 4v14H7z\"/><path d=\"M14 3v4h4\"/><path d=\"M10 12h6M10 16h6\"/>",
  "carousel": "<rect x=\"3\" y=\"6\" width=\"18\" height=\"12\" rx=\"3\"/><path d=\"M8 6v12M16 6v12\"/><path d=\"M3 10h18\"/>",
  "mirror": "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><path d=\"M9 4h6M8 9c1-1.5 7-1.5 8 0\"/>",
  "person": "<circle cx=\"12\" cy=\"8\" r=\"3.5\"/><path d=\"M5 20c1-3.5 3.5-5 7-5s6 1.5 7 5\"/>",
  "flag": "<path d=\"M6 21V4M6 5h11l-2 3 2 3H6\"/>",
  "menu": "<path d=\"M4 7h16M4 12h16M4 17h16\"/>",
  "bar": "<path d=\"M4 20V10M10 20V4M16 20v-7M21 20H3\"/>",
  "mouse": "<rect x=\"8\" y=\"3\" width=\"8\" height=\"14\" rx=\"4\"/><path d=\"M12 3v5\"/>",
};
const GLYPH2ICON = {
  "搜": "search",
  "历": "calendar",
  "警": "alert",
  "学": "school",
  "飞": "plane",
  "幼": "child",
  "星": "star",
  "单": "clipboard",
  "球": "globe",
  "医": "hospital",
  "因": "gene",
  "研": "lab",
  "培": "lab",
  "记": "note",
  "童": "child",
  "止": "close",
  "友": "user",
  "城": "building",
  "目": "eye",
  "热": "fire",
  "厂": "factory",
  "位": "pin",
  "雪": "snow",
  "脑": "brain",
  "表": "table",
  "冠": "trophy",
  "书": "book",
  "月": "moon",
  "男": "person",
  "烛": "candle",
  "钉": "tools",
  "船": "ship",
  "匿": "eye",
  "眼": "eye",
  "鱼": "fish",
  "水": "wave",
  "浪": "wave",
  "父": "person",
  "屋": "home",
  "讯": "chat",
  "犬": "paw",
  "猫": "paw",
  "爱": "heart",
  "工": "tools",
  "护": "shield",
  "标": "pin",
  "夹": "folder",
  "云": "cloud",
  "悬": "mouse",
  "传": "send",
  "图": "photo",
  "马": "carousel",
  "镜": "mirror",
  "币": "cash",
  "盘": "usb",
  "钥": "key",
  "开": "unlock",
  "文": "file",
  "邮": "letter",
  "笔": "pen",
  "锁": "lock",
  "闻": "report",
  "音": "mic", "声": "mic",
  "静": "mute",
  "决": "scale",
  "提": "spark",
  "话": "phone",
  "影": "video",
  "望": "satellite",
  "网": "web",
  "屏": "monitor",
  "暗": "moon",
  "游": "game",
  "速": "bolt",
  "维": "tools",
  "刷": "refresh",
  "洞": "backdoor",
  "照": "flashlight",
  "密": "lock",
  "回": "recycle",
  "删": "close",
  "简": "file",
  "科": "atom",
  "食": "dish",
  "宠": "paw",
  "寻": "search",
  "百": "book",
  "生": "spark",
  "卫": "satellite",
  "◎": "target",
  "✓": "check",
};
const LOGO2ICON = {
  "卫": "hospital",
  "生": "spark",
  "医": "hospital",
  "因": "gene",
  "百": "book",
  "图": "map",
  "食": "dish",
  "宠": "paw",
  "寻": "search",
  "科": "atom",
  "ID": "id",
  "星": "star",
  "观": "eye",
};
function svgIcon(name, color) {
  const body = SVG_LIB[name] || "";
  if (!body) return "";
  const st = color ? ' stroke="' + color + '"' : ' stroke="currentColor"';
  return '<svg viewBox="0 0 24 24" fill="none"' + st + ' stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;display:inline-block;vertical-align:-0.16em" aria-hidden="true">' + body + '</svg>';
}
function gic(g) {
  const n = GLYPH2ICON[g];
  if (n && SVG_LIB[n]) return svgIcon(n);
  return g;
}
function toastGlyph(title) {
  const m = /^([\u4e00-\u9fa5◎])\s+/.exec(title);
  if (m && GLYPH2ICON[m[1]] && SVG_LIB[GLYPH2ICON[m[1]]]) {
    return '<span class="t-ic">' + svgIcon(GLYPH2ICON[m[1]]) + '</span>' + esc(title.slice(m[0].length));
  }
  return esc(title);
}

function iconSVG(id) { return ICON_SVG[id] || ""; }
function miniIcon(id) {
  const c = ICON_COLORS[id] || "#5aa9e6";
  const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
  return `<span class="mini-ic" style="--ic:${c};--icg:rgba(${r},${g},${b},.45)">${iconSVG(id)}</span>`;
}
function renderIcons() {
  if (!S.started) return;
  const unread = inbox.filter(m => m.unread).length;
  const icons = [
    { id: "cms", glyph: "闻", label: "星都观察者<br>新闻后台", badge: 0 },
    { id: "mail", glyph: "邮", label: "邮箱客户端", badge: unread },
    { id: "browser", glyph: "搜", label: "星搜 · 公共信息网", badge: 0 },
    { id: "cloud", glyph: "盘", label: "星云网盘<br>共享文件", badge: 0 },
    { id: "map", glyph: "图", label: "星途地图", badge: 0 },
    { id: "voice", glyph: "声", label: "语音助手 · 星灵", badge: 0 },
    { id: "id", glyph: "证", label: "居民ID系统", badge: 0 },
    { id: "log", glyph: "监", label: "系统监控<br>日志", badge: 0 },
  ];
  if (has("remote_granted")) icons.splice(4, 0, { id: "remote", glyph: "远", label: "远程连接 LIN-PC", badge: 0 });
  if (has("remote_granted")) icons.splice(5, 0, { id: "chat", glyph: "密", label: "加密频道 · 加密用户BC", badge: has("chat_unread") ? 1 : 0 });
  const area = $("#icon-area"); area.innerHTML = "";
  icons.forEach(ic => {
    const d = document.createElement("div");
    d.className = "d-icon" + (ic.badge ? " has-badge" : "");
    if (ic.badge) d.dataset.badge = ic.badge;
    d.style.cssText = iconColorStyle(ic.id);
    d.innerHTML = `<div class="di-glyph">${iconSVG(ic.id)}</div><div class="di-label">${ic.label}</div>`;
    d.onclick = () => { openApp(ic.id); };
    area.appendChild(d);
  });
  const sm = $("#sm-app-list"); sm.innerHTML = "";
  icons.forEach(ic => {
    const d = document.createElement("div");
    d.className = "sm-item";
    d.style.cssText = iconColorStyle(ic.id);
    d.innerHTML = `<div class="si-glyph">${iconSVG(ic.id)}</div>${APPS[ic.id].name}`;
    d.onclick = () => { openApp(ic.id); $("#start-menu").classList.add("hidden"); };
    sm.appendChild(d);
  });
}


function setClock(t) {
  if (S.clock.time !== t) showTimeBanner(t);
  S.clock.time = t;
  const el = $("#clock-time"); if (el) el.textContent = t;
}
function setClockDate(d) {
  if (S.clock.date !== d) { showTimeBanner(null, d); }
  S.clock.date = d;
  const el = $("#clock-date"); if (el) el.textContent = d;
}
let _timeBannerT = null;
function showTimeBanner(time, date) {
  let b = $("#time-banner");
  if (!b) { b = document.createElement("div"); b.id = "time-banner"; b.className = "time-banner"; document.body.appendChild(b); }
  const d = date || S.clock.date || "";
  const t = time || S.clock.time || "";
  b.innerHTML = `<span class="tb-date">${d}</span> &nbsp;${t}`;
  b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
  clearTimeout(_timeBannerT);
  _timeBannerT = setTimeout(() => b.classList.remove("show"), 5500);
}


let inbox = [
  {
    id: "m_anon", from: "星空之下（匿名求助）", time: "09:23", unread: true,
    subject: "【求助】我的父母消失了",
    body: `沈记者您好：

我叫林北辰，今年18岁。我父母10月8号说去邻市临港市，参加什么「智慧城市交流会」，说好两天就回来。可是到今天第4天了，人没回来，手机也全部关机。我打到他们公司去问，公司说他们请了年假——不可能的，我妈的年假从来都攒着不舍得用。


我在家整理东西的时候，发现了两张去临港市的高铁票，10月8日的。但是座位号是空的。我查过了，座位号是空的，就说明他们根本没有上那班车。那他们到底去了哪里？？为什么票买了又不坐？？

还有，楼下便利店的店员叔叔说，前几天有个穿黑色西装的男人一直在跟他打听我爸妈。我现在锁着门不敢出门。

对不起，我打字很乱，逻辑也乱，我手一直在抖。真的求求您帮帮我。

网盘链接在下面，是我找到的一些东西。

——林北辰`,
    actions: [
      { label: " 打开星云网盘链接", act: "open-cloud" },
      { label: " 回复北辰：我愿意帮你", act: "reply-beichen" },
    ]
  },
  {
    id: "m_chen1", from: "陈姐（主编）", time: "09:10", unread: false,
    subject: "到岗第一件事：看好你的权限",
    body: `新人，到了先自己熟悉线报后台和公共信息网，别指望有人手把手教。

ID系统的记者权限我给你开好了：账号 GAZ-0307，密码 observer2066。只许查和稿件有关的人，查别的被我抓到，检讨你自己写。

——陈姐`,
    actions: []
  },
  {
    id: "m_reader", from: "热心市民王女士", time: "昨天", unread: false,
    subject: "举报：隔壁邻居家好像多了一个孩子",
    body: `记者同志，我要举报。我家对门那家人，去年明明只有一个儿子去参加成人礼，可我总在电梯里碰到两个一模一样的孩子。他们家是不是有什么问题？这种事你们管不管？

（注：依据《邻里和谐公约》第3条，此类来信不予受理，亦不予回复。）`,
    actions: []
  },
  {
    id: "m_ad", from: "星元支付", time: "昨天", unread: false,
    subject: "【优惠】双11提前购，信用积分满600享5折！",
    body: `亲爱的用户：星都信用积分体系已全面升级！积分高于600点的优质公民，可在本月享受公共出行5折优惠。积分过低将影响出行与购物额度。即刻查询您的积分，为文明加分！`,
    actions: []
  },
];

const pendingMails = {
  beichen1: {
    id: "m_beichen1", from: "林北辰", time: "09:41", unread: true,
    subject: "回复：我愿意帮你（远程权限）",
    body: `真的吗？！谢谢您谢谢您……我这四天基本没睡，一闭眼就是我爸的脸。

权限拿到了。您用桌面上的「远程连接」：

地址：192.168.3.107
临时密码：bc1027


——北辰`,
    actions: [{ label: " 打开远程连接", act: "open-remote" }]
  },
  witness: {
    id: "m_witness", from: "热心市民张阿姨", time: "10-12 11:36", unread: true,
    subject: "回复寻人栏目：我肯定看见你爸妈了！！",
    body: `记者同志！你前两天广播里说的那个失踪案例，我绝对没看错！

昨天下午4点多，我在星空超市（星都万浪城店）看见林家两口子了！推着购物车，买了好多速冻饺子，看着挺正常的呀，一点不像是被绑架的样子。我还想上前打个招呼，人多，一下就没影了。

我是老实人，从来不说假话。你在再广播一下，让他们家里人来万浪城找找！能帮到人我心里高兴。

——3栋 张阿姨`,
    actions: []
  },
  gov_lead: {
    id: "m_gov_lead", from: "未知发件人", time: "10-13 23:59", unread: true,
    subject: "（无主题）",
    body: `别问我是谁。观测站的老张让我把这扇门留给你：
政务内网管理后台：gov.xd.net/admin
认证已在管理员会话中预留，直接进入。文件用他墙上的数字解。
——匿名`,
    actions: []
  },
  chen2: {
    id: "m_chen2", from: "陈姐（主编）", time: "10-14 22:40", unread: true,
    subject: "你最近在查什么？",
    body: `我看你这两天神神叨叨的，工位上贴满了打印件。

我只说一次：星都这座城市，有些东西你拍到就是你的，有些东西你看到，就不是你的了。

注意安全。真查到什么，先跟我说。

——陈姐`,
    actions: []
  },
};

function deliverMail(key, delay = 1800) {
  setTimeout(() => {
    inbox.push(JSON.parse(JSON.stringify(pendingMails[key])));
    const m = pendingMails[key];
    const tb = $("#taskbar");
    if (tb) { tb.classList.add("tb-flash"); setTimeout(() => tb.classList.remove("tb-flash"), 3200); }
    beep(988, .3, .12);
    toast("新邮件 · " + m.from, esc(m.subject), "", () => {
      openApp("mail");
      S.ui.mail.acct = "me"; S.ui.mail.acctSel = "me"; S.ui.mail.sel = m.id;
      refreshAll();
    });
    renderIcons();
    if (S.windows.mail) refreshApp("mail");
  }, delay);
}
function mailFilter(v) {
  const prev = document.getElementById("mail-filter");
  const pos = prev ? prev.selectionStart : null;
  S.ui.mail.filter = v || "";
  refreshApp("mail");
  const inp = document.getElementById("mail-filter");
  if (inp) {
    inp.focus();
    const p = (pos === null || pos === undefined) ? inp.value.length : pos;
    inp.setSelectionRange(p, p);
  }
}


function chatInit() {
  if (S.ui.chat.initialized) return;
  S.ui.chat.initialized = true;
  const initial = [
    { who: "sys", text: "—— 加密频道已建立 · 端到端加密 · 10月12日 ——" },
    { who: "them", sender: "加密用户BC", text: "沈记者？在吗……能听到吗。这个频道是双向加密的，应该比邮箱安全。" },
    { who: "me", text: "能听到。有发现随时告诉我。" },
    { who: "them", sender: "加密用户BC", text: "嗯。对了……你要是想打开我爸的保险箱，密码提示是「我第一次开口说话的日子」。我问过我妈了——2049年3月12日，我第一次开口叫妈妈。" },
    { who: "them", sender: "加密用户BC", voice: "……嗯，我在。我在家，门窗都锁好了。" },
  ];
  S.ui.chat.msgs = initial.concat(S.ui.chat.msgs);
}
function chatPush(who, text, sender) {
  S.ui.chat.msgs.push(sender ? { who, text, sender } : { who, text });
  if (S.windows.chat) refreshApp("chat");
}
function chatSys(text) {
  S.ui.chat.msgs.push({ who: "sys", text });
  if (S.windows.chat) refreshApp("chat");
}


const evidences = [
  {
    id: "v1", icon: "", name: "北辰的求助语音留言", meta: "来源：寻人栏目留言箱 · 10月12日",
    need: () => true,
    transcript: `「……你们是寻人栏目的吧。我叫林北辰。我爸妈10月8号去的临港市，说是交流会，到现在没回来，手机全关机。

我找到了两张高铁票——日期是10月8号，但座位号是空的。您明白吗？他们根本没上车。

便利店的人说有个穿黑西装的男人在打听我爸妈。我不敢报警……求求您回我。」`
  },
  {
    id: "v2", icon: "", name: "老城区网吧 · 自动应答录音", meta: "来源：星途街景拨号 · 录制",
    need: () => has("invite_known"),
    transcript: `（拨号音。三声长铃。）

「……您拨打的地下专线仍然在运营。老朋友，暗涌的门为你留着一道缝——

邀请码是……二零四八。」

（录音结束。你按下录音键的手心全是汗。）`
  },
  {
    id: "v3", icon: "", name: "《B_契约.mp4》音轨", meta: "来源：LIN-PC · 保险箱 · U盘B",
    need: () => has("video_watched"),
    transcript: `「小林B，你知道你父母为什么把你送到这里来吗？」

「因为他们选了那个废物。」

「你很聪明。我们来做个交易。你帮我们做一件事，我让你活着出去。」

（画外音识别：男性，中年，缓慢而礼貌——与评估报告主笔「李某某」的声纹特征匹配度 97.2%）`
  },
  {
    id: "v4", icon: "声", name: "北辰 · 加密频道语音样本", meta: "来源：加密频道 · 自动采样",
    need: () => has("remote_granted"),
    transcript: `（三秒语音样本，采集自加密频道。）

「……嗯，我在。我在家，门窗都锁好了。」

——声纹基线已建立：样本主体 A（林北辰）。`
  },
  {
    id: "v5", icon: "", name: "李医生_自述（母体档案库）", meta: "来源：ID系统 · 隐藏复核窗口",
    need: () => has("truth_known"),
    transcript: `「……我受够了。他们强迫我在评估报告上做手脚，让那些『多余』的孩子看起来有心理问题……我做过最坏的一件事，就是把一个本来很健康的小男孩标记成『反社会』，因为他父母不肯给贿赂金……那个男孩好像姓林……我……我每天晚上都做噩梦……后来我才知道，是辰天法务部的律师告诉我，只要把低分孩子改成冗余体，他们就能顺利处理掉。辰天说，这是为了星都的『人口优化』……」

（录音中断。）

—— 一声枪响。`
  },
];
const VOICE_AUDIO = { v1: "assets/voice_v1.wav", v2: "assets/voice_v2.wav", v3: "assets/voice_v3.wav", v4: "assets/voice_v4.wav", v5: "assets/voice_v5.wav" };
function stopVoiceAudio() {
  if (S._voiceAudio) { try { S._voiceAudio.pause(); S._voiceAudio = null; } catch (e) {} }
  if (S._voiceScrollT) { clearInterval(S._voiceScrollT); S._voiceScrollT = null; }
}
function playVoiceAudio(src) {
  try {
    unlockAudio();
    const a = new Audio(src);
    a.volume = 1.0;
    S._voiceAudio = a;
    a.onended = () => {
      if (S._voiceAudio === a) S._voiceAudio = null;
      if (S._voiceScrollT) { clearInterval(S._voiceScrollT); S._voiceScrollT = null; }
      if (S.windows.voice && S.ui.voice.sel) { S.ui.voice.sel = null; refreshApp("voice"); }
    };
    a.play().catch(() => {});
    S._voiceScrollT = setInterval(() => {
      const tr = document.getElementById("voice-transcript");
      if (tr && tr.scrollHeight > tr.clientHeight) tr.scrollTop += 2;
    }, 350);
  } catch (e) {}
}
function playEvidence(ev) {
  stopVoiceAudio();
  if (VOICE_AUDIO[ev.id]) { playVoiceAudio(VOICE_AUDIO[ev.id]); return; }
  if (ev.id === "v5") { beep(300, .6, .04); beep(280, .8, .03, .4); setTimeout(beepGunshot, 1800); return; }
  if (ev.id === "v2") { beepRing(); beep(520, .12, .06, 1.9); beep(620, .12, .06, 2.1); return; }
  beep(300, .5, .04); beep(340, .6, .03, .3); beep(280, .8, .03, .6);
}
const VP_RULES = [
  { a: "v3", b: "v4", r: "diff", text: "<span class='diff'>声纹不一致。</span>《B_契约.mp4》中的少年与加密频道里的北辰<b>不是同一个人</b>。你的手里，确实有两个「林北辰」。" },
  { a: "v3", b: "v1", r: "diff", text: "<span class='diff'>声纹不一致。</span>《B_契约.mp4》里被胁迫的少年，与北辰最初求助留言里的声音<b>不是同一个人</b>。你的手里，确实有两个「林北辰」。" },
  { a: "v1", b: "v4", r: "same", text: "<span class='same'>声纹一致。</span>求助留言与频道语音来自同一人：林北辰（A）。" },
  { a: "v3", b: "v5", r: "same", text: "<span class='same'>声纹一致。</span>视频里穿白大褂的男子，与母体档案库里的「李医生」是同一人。" },
  { a: "v2", b: "*", r: "diff", text: "<span class='diff'>声纹不一致。</span>一段是合成语音，一段是人声。没有可比性。" },
  { a: "v5", b: "*", r: "diff", text: "<span class='diff'>声纹不一致。</span>两段音频来自不同的人。" },
];


const SEARCH_DB = [
  {
    keys: ["生命延续中心"],
    onSearch: () => setFlag("s_center"),
    results: () => [
      { url: "www.xdhealth.gov.cn/topic/crlcs", title: "星都市卫生局 —— 致家长：关于「成人礼测试」", page: "gov_health" },
      { url: "www.clc.xd.gov.cn", title: "生命延续中心（官网）· 为未来播种", page: "center_official" },
    ]
  },
  {
    keys: ["成人礼", "智力测试", "科学筛选"],
    onSearch: () => setFlag("s_test"),
    results: () => [
      { url: "www.xdhealth.gov.cn/topic/crlcs", title: "星都市卫生局 —— 「成人礼测试」制度介绍", page: "gov_health" },
      { url: "anyong.onion/t/88124", title: "【暗涌·缓存】我发现了双子计划的真相！所谓的「海外深造」其实是……", page: "forum", flag: "快照缓存 · 需邀请码", locked: true,
        snippet: "……所谓的「海外深造」其实是——（快照至此截断。完整内容需要邀请码才能访问。）" },
    ]
  },
  {
    keys: ["双子计划", "双子"],
    onSearch: () => {},
    results: () => [
      { url: "baike.xd.net/双子计划", title: "双子计划（词条正在接受内容审查）", page: "wiki_missing" },
      { url: "anyong.onion/t/88124", title: "【暗涌·缓存】我发现了双子计划的真相！", page: "forum", flag: "快照缓存 · 需邀请码", locked: true },
    ]
  },
  {
    keys: ["双生子悖论"],
    onSearch: () => {},
    results: () => [
      { url: "novel.xd.net/shuangzi", title: "《双生子悖论》 —— 星都科幻文库（连载中）", page: "novel" },
      { url: "search.xd.net", title: "（其余结果与某支付公司的营销活动有关，已过滤）", page: "filtered_promo" },
    ]
  },
  {
    keys: ["克隆", "备份体", "合成人"],
    onSearch: () => {},
    results: () => [
      { url: "www.clc.xd.gov.cn", title: "生命延续中心（官网）· 备份体培育与托管", page: "center_official" },
      { url: "baike.xd.net/双子计划", title: "双子计划（词条正在接受内容审查）", page: "wiki_missing" },
    ]
  },
  {
    keys: ["优选体", "冗余体"],
    onSearch: () => {},
    results: () => [
      { url: "baike.xd.net/海外深造", title: "海外深造 —— 星都百科（民间传闻版本）", page: "rumor_destroy" },
    ]
  },
  {
    keys: ["林母", "林父", "林太太", "林先生"],
    onSearch: () => {},
    results: () => [
      { url: "social.xd.net/linbeichen", title: "北辰_星辰 的个人主页 —— 星都社交（提及家人）", page: "social_beichen" },
      { url: "people.xd.net/search?missing=1", title: "【星都观察者】寻人栏目 · 登记须知", page: "missing" },
    ]
  },
  {
    keys: ["失踪", "寻人", "立案"],
    onSearch: () => {},
    results: () => [
      { url: "people.xd.net/search?missing=1", title: "【星都观察者】寻人栏目 · 登记须知与本周登记", page: "missing" },
    ]
  },
  {
    keys: ["万浪城", "商场", "超市"],
    onSearch: () => {},
    results: () => [
      { url: "map.xd.net/place/wanlang", title: "万浪城 · 星都店 —— 星途地图", page: "mall" },
      { url: "dianping.xd.net", title: "万浪城商圈美食排行榜（已归档）", page: "mall", flag: "信息可能过期" },
    ]
  },
  {
    keys: ["美食", "餐厅", "小吃", "旅游", "宠物", "领养", "天气"],
    onSearch: () => {},
    results: () => [
      { url: "food.xd.net", title: "星都十大必吃餐厅（2066版 · 网友票选）", page: "food",
        snippet: "第一名：老青云牛肉面（青云路12号附近）……本榜单与任何失踪事件无关。" },
      { url: "pet.xd.net", title: "星都宠物领养中心 —— 给流浪动物一个家", page: "pet",
        snippet: "本月待领养：柯基×3、狸花猫×7。温馨提示：养宠前请确认您的信用积分达到饲养门槛。" },
    ]
  },
  {
    keys: ["薛定谔", "阿尔茨海默", "痴呆"],
    onSearch: () => {},
    results: () => [
      { url: "baike.xd.net/薛定谔-阿尔茨海默复合症", title: "薛定谔-阿尔茨海默复合症 —— 星都百科", page: "wiki_disease" },
    ]
  },
  {
    keys: ["林北辰", "北辰"],
    onSearch: () => {},
    results: () => [
      { url: "social.xd.net/linbeichen", title: "北辰_星辰 的个人主页 —— 星都社交", page: "social_beichen" },
      { url: "people.xd.net/search?missing=1", title: "【星都观察者】寻人栏目 · 本周登记", page: "missing" },
    ]
  },
  {
    keys: ["临港市", "临港"],
    onSearch: () => setFlag("s_lingang"),
    results: () => [
      { url: "baike.lg.gov.cn", title: "临港市 —— 城市百科", page: "lg_baike" },
      { url: "observer.xd.news/2066/1012", title: "【星都观察者】智慧城市交流会在临港开幕，与会名单「不予公开」", page: "news_meeting" },
    ]
  },
  {
    keys: ["化工厂", "3号仓库", "三号仓库", "东郊"],
    onSearch: () => { if (has("clue_warehouse")) setFlag("s_factory"); },
    results: () => has("clue_warehouse") ? [
      { url: "map.xd.net/place/lingang_factory", title: "临港市东郊 · 废弃化工厂（含3号仓库） —— 星途地图", page: "factory" },
      { url: "anyong.onion/t/90021", title: "【暗涌】献给所有被遗忘的「冗余体」", page: "forum", flag: "需邀请码", locked: true },
    ] : [ { url: "search.xd.net", title: "（未找到精确结果。也许该先找到确切的地址。）", page: "notfound_place" } ]
  },
  {
    keys: ["销毁", "焚烧", "冷冻", "意识格式化"],
    onSearch: () => {},
    results: () => [
      { url: "anyong.onion/t/90021", title: "【暗涌·传闻】「冗余体」最后去了哪里？", page: "rumor_destroy", flag: "需邀请码", locked: true },
    ]
  },
  {
    keys: ["北纬39", "116°23", "红星路", "老城区"],
    onSearch: () => { setFlag("map_34"); setFlag("s_map34"); },
    results: () => [
      { url: "map.xd.net/place/hongxing34", title: "老城区 · 红星路34号 —— 星途地图（有街景）", page: "map_34" },
    ]
  },
  {
    keys: ["信用积分", "积分"],
    onSearch: () => {},
    results: () => [
      { url: "observer.xd.news/special/credit", title: "【星都观察者】信用积分覆盖率98%：被量化的市民与被关停的申诉", page: "credit" },
    ]
  },
  {
    keys: ["李医生", "李某某"],
    onSearch: () => {},
    results: () => has("truth_known") ? [
      { url: "id.xd.gov/leak/cache", title: "（匿名缓存）内部通报 · 评估员李某某", page: "li_doctor" },
    ] : [ { url: "search.xd.net", title: "（公开信息中查无此人。）", page: "notfound_li" } ]
  },
  {
    keys: ["智慧城市交流会"],
    onSearch: () => {},
    results: () => [
      { url: "observer.xd.news/2066/1012", title: "【星都观察者】智慧城市交流会在临港开幕，与会名单「不予公开」", page: "news_meeting" },
    ]
  },
  {
    keys: ["暗涌", "地下论坛"],
    onSearch: () => {},
    results: () => [
      { url: "anyong.onion", title: "暗涌 ANYONG —— 加密论坛（需邀请码）", page: "forum", flag: "", locked: true },
    ]
  },
  {
    keys: ["政务内网", "政府后台", "内部系统", "星都政务"],
    onSearch: () => { if (has("dm_read")) setFlag("gov_search_ready"); },
    results: () => {
      if (!has("dm_read")) {
        return [ { url: "search.xd.net", title: "（该关键词需要更高权限。）", page: "noresult" } ];
      }
      if (!has("obs_unlocked")) {
        return [ { url: "search.xd.net", title: "（该关键词需要先在天象观测站获取密码本。）", page: "notfound_gov" } ];
      }
      return [
        { url: "gov.xd.net/admin", title: "星都政务内网 · 管理后台（检测到弱口令漏洞）", page: "gov_hack" },
      ];
    }
  },
  {
    keys: ["邀请码"],
    onSearch: () => {},
    results: () => [
      { url: "anyong.onion/faq", title: "【暗涌FAQ】邀请码每月轮换，外人无从获取", page: "forum", flag: "需邀请码", locked: true,
        snippet: "邀请码不对外发放。老成员之间的暗号，往往藏在「老地方」——一部老电话、一个旧坐标、一句只有自己人懂的话。" },
    ]
  },
  {
    keys: ["张", "D_张", "张叔叔"],
    onSearch: () => has("forum_open"),
    results: () => has("forum_open") ? [
      { url: "anyong.onion/u/d_zhang", title: "D_张 —— 暗涌用户资料", page: "forum_zhang" },
    ] : [ { url: "search.xd.net", title: "（关于「张」的公开信息极少。）", page: "notfound_zhang" } ]
  },
  {
    keys: ["天象观测站", "观测站", "天文台", "市郊观测站"],
    onSearch: () => { if (has("dm_read")) setFlag("obs_searchable"); },
    results: () => {
      if (!has("dm_read")) {
        return [
          { url: "map.xd.net/place/observatory", title: "星都市郊 · 天象观测站（已废弃） —— 星途地图", page: "obs_locked" },
        ];
      }
      return [
        { url: "map.xd.net/place/observatory", title: "星都市郊 · 天象观测站 —— 星途地图（D_张情报关联地点）", page: "observatory" },
        { url: "bbs.xd.net/thread/obs_2031", title: "【城市记忆】2031年落成的市郊观测站，为何三年后突然废弃？", page: "obs_article" },
      ];
    }
  },
  {
    keys: ["星都日报"],
    onSearch: () => {},
    results: () => [
      { url: "observer.xd.news", title: "星都观察者 —— 独立调查媒体", page: "daily" },
    ]
  },
];


function recordSearch(q) {
  const h = S.searchHistory = S.searchHistory || [];
  const i = h.indexOf(q);
  if (i !== -1) h.splice(i, 1);
  h.unshift(q);
  if (h.length > 8) h.length = 8;
}
function searchHistoryHtml() {
  const h = S.searchHistory || [];
  if (!h.length) return "";
  return `<div class="search-history">
    <div class="sh-head">最近搜索
      <button class="sh-clear" data-action="clear-search-history">清空</button>
    </div>
    <div class="sh-list">${h.map(t => `<a class="sh-item" data-action="quick-search" data-arg="${esc(t)}">${esc(t)}</a>`).join("")}</div>
  </div>`;
}

function searchSync(q) {
  let results = null;
  for (const entry of SEARCH_DB) {
    if (entry.keys.some(k => q.includes(k) || k.includes(q))) {
      if (entry.onSearch) entry.onSearch();
      results = entry.results();
      break;
    }
  }
  return results;
}
function doSearch(q) {
  q = (q || "").trim();
  if (!q) return;
  recordSearch(q);
  const token = (S.searchToken = (S.searchToken || 0) + 1);
  S.ui.browser.query = q;
  S.ui.browser.results = "searching";
  S.ui.browser.page = "results";
  refreshAll();
  beep(480, .05, .03);
  setTimeout(() => {
    if (token !== S.searchToken || !S.windows.browser) return;
    S.ui.browser.results = searchSync(q);
    refreshApp("browser");
    ding();
  }, 600 + Math.random() * 500);
}


function browserChrome(inner) {
  const url = S.ui.browser.pageUrl || "sos.xd.net/home";
  const isHome = S.ui.browser.page === "home";
  return `<div class="browser-top">
      <div class="browser-nav">
        <button data-action="browser-back" title="后退" ${isHome ? "disabled" : ""}>←</button>
        <button data-action="browser-forward" title="前进" disabled>→</button>
        <button data-action="browser-refresh" title="刷新">↻</button>
        <button data-action="go-home" title="主页">⌂</button>
      </div>
      <div class="browser-addr">
        <span class="lock" style="font-style:normal;font-size:10px">SSL</span>
        <span class="url">${esc(url)}</span>
        <span class="sep">|</span>
        <span style="color:#9aa0a6;font-size:10px">星都公共信息网 · 已通过舆情安全过滤</span>
      </div>
    </div>
    <div class="browser-page">${inner}</div>`;
}


const HOT_SEARCHES = [
  { text: "星都市成人礼测试本周开启", tag: "boil" },
  { text: "生命延续中心公布年度报告", tag: "hot" },
  { text: "临港市智慧城市交流会闭幕", tag: "" },
  { text: "信用积分体系覆盖率突破98%", tag: "" },
  { text: "秋季大气质量优良天数创新高", tag: "" },
  { text: "星都观察者：一则寻人启事背后", tag: "new" },
];
function hotSearchHtml() {
  return `<div class="se-hot">
    <div class="se-hot-head">
      <div class="se-hot-title">星搜热搜</div>
      <div class="se-hot-more">换一换 ↻</div>
    </div>
    <div class="se-hot-grid">
      ${HOT_SEARCHES.map((h, i) => `
        <div class="se-hot-item" data-action="quick-search" data-arg="${esc(h.text)}">
          <span class="se-hot-rank">${i + 1}</span>
          <span class="se-hot-text">${esc(h.text)}</span>
          ${h.tag ? `<span class="se-hot-tag ${h.tag}">${h.tag === "boil" ? "沸" : h.tag === "hot" ? "热" : "新"}</span>` : ""}
        </div>`).join("")}
    </div>
  </div>`;
}


function relatedSearchesHtml(query) {
  const base = (query || "").replace(/[「」""']/g, "").trim();
  const related = [
    base + " 是什么",
    base + " 最新消息",
    base + " 官方网站",
    base + " 怎么查",
    base + " 相关政策",
    "星都市 " + base,
  ];
  return `<div class="se-related">
    <div class="se-related-title">相关搜索</div>
    <div class="se-related-list">
      ${related.map(r => `<span class="se-related-item" data-action="quick-search" data-arg="${esc(r)}">${esc(r)}</span>`).join("")}
    </div>
  </div>`;
}


function paginationHtml() {
  return `<div class="se-pagination">
    <span class="se-page active">1</span>
    <span class="se-page">2</span>
    <span class="se-page">3</span>
    <span class="se-page">4</span>
    <span class="se-page">5</span>
    <span class="se-page-dots">…</span>
    <span class="se-page">下一页 ›</span>
  </div>`;
}


function faviconFor(url) {
  if (!url) return "星";
  const domain = url.replace(/^https?:\/\//, "").split("/")[0];
  return domain.charAt(0).toUpperCase();
}





function logoGlyph(t) {
  const n = LOGO2ICON[t];
  if (n && SVG_LIB[n]) return svgIcon(n);
  return t || "";
}

function msNav(opts) {
  const { brand, sub, logoText, logoColor, links = [], active = "", showSearch = true, navAction = "go-home" } = opts;
  const linksHtml = links.map(l => {
    const isObj = (typeof l === "object");
    const txt = isObj ? l.t : l;
    const act = isObj ? (l.act || navAction) : navAction;
    const arg = isObj ? (l.arg || l.t) : "";
    return `<a class="${txt === active ? "active" : ""}" data-action="${act}" ${arg ? `data-arg="${esc(arg)}"` : ""}>${txt}</a>`;
  }).join("");
  return `<div class="ms-nav">
    <div class="ms-nav-brand">
      <div class="ms-nav-logo" style="background:${logoColor || "#1a73e8"}">${logoGlyph(logoText)}</div>
      <div>
        <div class="ms-nav-title">${brand}</div>
        ${sub ? `<div class="ms-nav-sub">${sub}</div>` : ""}
      </div>
    </div>
    <div class="ms-nav-links">${linksHtml}</div>
    <div class="ms-nav-actions">
      ${showSearch ? `<div class="ms-nav-search"><span>${svgIcon("search")}</span><input placeholder="站内搜索" readonly></div>` : ""}
      <button class="ms-nav-btn primary">登录</button>
    </div>
  </div>`;
}


function msHero(opts) {
  const { color = "blue", tag, title, desc, actions = [] } = opts;
  const actionsHtml = actions.map(a =>
    `<button class="ms-hero-btn ${a.style || "white"}" data-action="${a.act || "go-home"}" ${a.arg ? `data-arg="${a.arg}"` : ""}>${a.text}</button>`
  ).join("");
  return `<div class="ms-hero ${color}">
    <div class="ms-hero-content">
      ${tag ? `<div class="ms-hero-tag">${tag}</div>` : ""}
      <h1>${title}</h1>
      ${desc ? `<p>${desc}</p>` : ""}
      ${actionsHtml ? `<div class="ms-hero-actions">${actionsHtml}</div>` : ""}
    </div>
  </div>`;
}


function msStats(stats) {
  return `<div class="ms-stats">${stats.map(s => `
    <div class="ms-stat ${s.trend || ""}">
      <div class="ms-stat-icon">${gic(s.icon || "")}</div>
      <div class="ms-stat-num">${s.num}<span class="unit">${s.unit || ""}</span></div>
      <div class="ms-stat-label">${s.label}</div>
    </div>`).join("")}</div>`;
}


function msCards(cards) {
  return `<div class="ms-cards">${cards.map(c => `
    <div class="ms-card" data-action="${c.act || "go-home"}" ${c.arg ? `data-arg="${c.arg}"` : ""}>
      <div class="ms-card-icon ${c.iconColor || "blue"}">${gic(c.icon || "")}</div>
      <div class="ms-card-title">${c.title}</div>
      <div class="ms-card-desc">${c.desc || ""}</div>
      <div class="ms-card-arrow">了解更多 →</div>
    </div>`).join("")}</div>`;
}


function msSection(title, sub, content) {
  return `<div class="ms-section">
    <div class="ms-section-title">${title}</div>
    ${sub ? `<div class="ms-section-sub">${sub}</div>` : ""}
    ${content}
  </div>`;
}


function msAlert(type, icon, text) {
  return `<div class="ms-alert ${type}">
    <div class="ms-alert-icon">${gic(icon)}</div>
    <div>${text}</div>
  </div>`;
}


function msProgress(label, value, color = "blue") {
  return `<div class="ms-progress">
    <div class="ms-progress-label"><span class="name">${label}</span><span class="val">${value}%</span></div>
    <div class="ms-progress-bar"><div class="ms-progress-fill ${color}" style="width:${value}%"></div></div>
  </div>`;
}


function msFooter(opts) {
  const { brand, cols = [], copyright } = opts;
  const colsHtml = cols.map(c => `
    <div class="ms-footer-col">
      <h4>${c.title}</h4>
      ${c.links.map(l => `<a data-action="go-home">${l}</a>`).join("")}
    </div>`).join("");
  return `<div class="ms-footer">
    <div class="ms-footer-top">
      <div class="ms-footer-col">
        <div class="ms-footer-brand">${brand}</div>
        <div style="font-size:11px;margin-top:8px;line-height:1.8">${copyright || ""}</div>
      </div>
      ${colsHtml}
    </div>
  </div>`;
}


function obsNav(active = "深度调查") {
  const links = [
    { t: "首页", p: "daily" },
    { t: "深度调查", p: "news_meeting" },
    { t: "寻人启事", p: "missing" },
    { t: "评论", p: "obs_comments" },
    { t: "专栏", p: "daily" },
    { t: "关于我们", p: "obs_about" }
  ];
  const linksHtml = links.map(l =>
    `<a class="${l.t === active ? "active" : ""}" data-action="open-page" data-arg="${l.p}">${l.t}</a>`
  ).join("");
  return `<div class="obs-nav">
    <div class="obs-nav-inner">
      <div class="obs-brand">
        <div class="obs-logo" style="font-size:22px">${svgIcon("eye")}</div>
        <div>
          <div class="obs-brand-name">星都观察者</div>
          <div class="obs-brand-sub">XINGDU OBSERVER · 独立调查媒体</div>
        </div>
      </div>
      <nav class="obs-links">${linksHtml}</nav>
      <div class="obs-nav-search"><span>${svgIcon("search")}</span><input placeholder="搜索报道" readonly></div>
    </div>
    <div class="obs-accent"></div>
  </div>`;
}
function obsFooter(copyrightLine) {
  return `<div class="obs-footer">
    <div class="obs-footer-inner">
      <div>
        <div class="obs-footer-brand">星都观察者</div>
        <div class="obs-footer-note">独立 · 核实 · 不删稿。本站为民间信息互助通道，内容未经官方审核。</div>
      </div>
      <div class="obs-footer-cols">
        <div><h5>频道</h5><a data-action="go-home">深度调查</a><a data-action="go-home">寻人启事</a><a data-action="go-home">评论</a></div>
        <div><h5>关于</h5><a data-action="go-home">团队</a><a data-action="go-home">投稿</a><a data-action="go-home">联系方式</a></div>
      </div>
    </div>
    <div class="obs-footer-bottom">© 2066 星都Observer · ${copyrightLine || "民间信源，仅供参考"}</div>
  </div>`;
}


const GOV_LINKS = [
  { t: "首页", act: "gov-sub", arg: "home" },
  { t: "政务公开", act: "gov-sub", arg: "open" },
  { t: "政策法规", act: "gov-sub", arg: "law" },
  { t: "成人礼测试", act: "gov-sub", arg: "crlcs" },
  { t: "公共卫生", act: "gov-sub", arg: "health" },
  { t: "互动交流", act: "gov-sub", arg: "talk" }
];
const CENTER_LINKS = [
  { t: "首页", act: "center-sub", arg: "home" },
  { t: "中心简介", act: "center-sub", arg: "intro" },
  { t: "业务服务", act: "center-sub", arg: "service" },
  { t: "双子计划", act: "center-sub", arg: "twin" },
  { t: "海外深造", act: "center-sub", arg: "abroad" },
  { t: "联系我们", act: "center-sub", arg: "contact" }
];
const GOV_SUB_TITLE = { home: "首页", crlcs: "成人礼测试", open: "政务公开", law: "政策法规", health: "公共卫生", talk: "互动交流" };
const CENTER_SUB_TITLE = { home: "首页", intro: "中心简介", service: "业务服务", twin: "双子计划", abroad: "海外深造", contact: "联系我们" };

function govFrame(activeKey, bodyHtml) {
  return browserChrome(`
    ${msNav({ brand: "星都市卫生局", sub: "XINGDU MUNICIPAL HEALTH BUREAU", logoText: "卫", logoColor: "#188038", links: GOV_LINKS, active: GOV_SUB_TITLE[activeKey] || "成人礼测试" })}
    <div style="padding:28px 36px;background:#fff;max-width:900px;margin:0 auto">${bodyHtml}</div>
    ${msFooter({ brand: "星都市卫生局", cols: [{ title: "政务服务", links: ["办事指南", "在线申报", "结果查询", "表格下载"] }, { title: "信息公开", links: ["机构职能", "政策文件", "统计数据", "财政信息"] }, { title: "互动交流", links: ["局长信箱", "在线咨询", "投诉举报", "意见征集"] }], copyright: "星都市卫生局 版权所有 · 本页面内容已经三轮舆情安全审核" })}
  `);
}
function govSubPage(sub) {
  if (sub === "open") return govFrame("open", `
    <div class="ms-section-title">政务公开 · 机构职能</div>
    <p style="font-size:14px;color:#3c4043;line-height:2;margin:12px 0 18px">星都市卫生局下设青少年发展处、公共卫生处、政策法规处。本局核心职能：组织18周岁「成人礼测试」、维护公民健康档案、统筹「海外深造」送行服务。</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr style="background:#f1f3f4"><th style="padding:10px;border:1px solid #e8eaed;text-align:left">公开目录</th><th style="padding:10px;border:1px solid #e8eaed;text-align:left">更新时间</th></tr>
      <tr><td style="padding:10px;border:1px solid #e8eaed">本局职能配置、内设机构</td><td style="padding:10px;border:1px solid #e8eaed">2066-09-01</td></tr>
      <tr><td style="padding:10px;border:1px solid #e8eaed">成人礼测试实施方案</td><td style="padding:10px;border:1px solid #e8eaed">2066-09-15</td></tr>
      <tr><td style="padding:10px;border:1px solid #e8eaed">「海外深造」安置名单</td><td style="padding:10px;border:1px solid #e8eaed;color:#9aa0a6">依《隐私条例》不予公开</td></tr>
    </table>`);
  if (sub === "law") return govFrame("law", `
    <div class="ms-section-title">政策法规</div>
    <div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">
      <div style="padding:16px;border:1px solid #e8eaed;border-radius:8px"><b style="font-size:14px">《星都市成人礼测试条例》</b><div style="font-size:12.5px;color:#5f6368;margin-top:6px">18周岁统一测试，综合评定智力、创造与心理稳定性。测试结果为工作秘密。</div></div>
      <div style="padding:16px;border:1px solid #e8eaed;border-radius:8px"><b style="font-size:14px">《优选体管理办法》</b><div style="font-size:12.5px;color:#5f6368;margin-top:6px">通过测试者授予「优选体」资格，优先分配公共资源与教育机会。</div></div>
      <div style="padding:16px;border:1px solid #e8eaed;border-radius:8px"><b style="font-size:14px">《未通过人员海外安置细则》</b><div style="font-size:12.5px;color:#5f6368;margin-top:6px">未通过测试者由政府统一安排「海外深造」，费用全免，家属无需办理探望手续。</div></div>
    </div>`);
  if (sub === "health") return govFrame("health", `
    <div class="ms-section-title">公共卫生</div>
    <p style="font-size:14px;color:#3c4043;line-height:2;margin:12px 0">全市居民免费建立电子健康档案，18岁前完成全程疫苗接种与年度体检。新生婴儿出生即进行基因建档，数据与成人礼测试系统联网。</p>
    ${msAlert("success", "", "本年度适龄青少年基因建档率 100%，健康档案完整率 99.3%。")}`);
  if (sub === "talk") return govFrame("talk", `
    <div class="ms-section-title">互动交流 · 局长信箱</div>
    <p style="font-size:13px;color:#5f6368;line-height:1.9;margin:12px 0">您的来信将在 15 个工作日内回复。所有公开发布的回复已经三轮舆情安全审核。涉及测试分数、安置名单的问题恕不答复。</p>
    <div style="padding:16px;background:#f8f9fa;border-radius:8px;font-size:13px;color:#9aa0a6">局长信箱：juzhang@health.xd.gov　（当前在线咨询排队：2,847 人）</div>`);
  return govFrame("crlcs", `
    <div class="ms-section-title">成人礼测试 · 您需要了解的一切</div>
    <p style="font-size:14px;color:#3c4043;line-height:2;margin:12px 0">综合考量智力水平、创造力、心理稳定性等维度，科学发现每个孩子的天赋方向。通过测试的优选体将被正式授予公民资格；未通过者由政府统一安排「海外深造」，费用全免。</p>
    <div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:10px">
      <div style="flex:1;min-width:300px">
        <h4 style="font-size:15px;margin-bottom:10px;color:#202124">测试维度</h4>
        ${msProgress("智力水平", 40, "blue")}
        ${msProgress("创造力", 30, "green")}
        ${msProgress("心理稳定性", 30, "orange")}
      </div>
      <div style="flex:1;min-width:300px">
        <h4 style="font-size:15px;margin-bottom:10px;color:#202124">温馨提示</h4>
        ${msAlert("info", "", "测试的具体分数、评分细则及各维度权重属于工作秘密，家长无需了解。")}
        ${msAlert("success", "", "请各位家长放心：政府的每一项安排，都是为了孩子好。")}
      </div>
    </div>`);
}
function centerFrame(activeKey, bodyHtml) {
  return browserChrome(`
    ${msNav({ brand: "生命延续中心", sub: "CENTER FOR LIFE CONTINUITY", logoText: "生", logoColor: "#1a73e8", links: CENTER_LINKS, active: CENTER_SUB_TITLE[activeKey] || "首页" })}
    <div style="padding:28px 36px;background:#fff;max-width:900px;margin:0 auto">${bodyHtml}</div>
    ${msFooter({ brand: "生命延续中心", cols: [{ title: "业务", links: ["评估服务", "档案调阅", "双子计划", "新闻动态"] }, { title: "支持", links: ["家属服务", "常见问题", "联系我们"] }], copyright: "生命延续中心 版权所有 · 本中心为国家级生命科学研究机构" })}
  `);
}
function centerSubPage(sub) {
  if (sub === "intro") return centerFrame("intro", `
    <div class="ms-section-title">中心简介</div>
    <p style="font-size:14px;color:#3c4043;line-height:2;margin:12px 0">生命延续中心成立于2058年，是国家级生命科学研究机构。我们以「让每一份基因都被认真对待」为使命，承担青少年发展评估、健康数据管理与「海外深造」送行服务。</p>`);
  if (sub === "service") return centerFrame("service", `
    <div class="ms-section-title">业务服务流程</div>
    <div style="font-size:14px;color:#3c4043;line-height:2;margin-top:10px">① 18岁统一评估 → ② 出具《评估报告》 → ③ 通过者进入优选通道 → ④ 未通过者由中心统一安排「海外深造」送行。全程家属无需介入，费用全免。</div>`);
  if (sub === "twin") return centerFrame("twin", `
    <div class="ms-section-title">双子计划</div>
    ${msAlert("info", "", "「双子计划」为中心重点项目，相关资料依《中心保密规定》不在本网站公开。如需调阅，请凭员工二级以上权限登录内部系统。")}`);
  if (sub === "abroad") return centerFrame("abroad", `
    <div class="ms-section-title">海外深造项目</div>
    <p style="font-size:14px;color:#3c4043;line-height:2;margin:12px 0">未通过成人礼测试的青少年，由中心统一赴海外深造。截至本年度，送行服务满意度连续五年保持 100%。家长无需办理签证与探望，孩子的一切由中心安排妥当。</p>`);
  if (sub === "contact") return centerFrame("contact", `
    <div class="ms-section-title">联系我们</div>
    <p style="font-size:14px;color:#3c4043;line-height:2;margin:12px 0">地址：星都市高新区生命科学园区 1 号院　总机：0-800-XXX-XXXX　家属服务专线：工作日 9:00–17:00</p>
    ${msAlert("info", "", "「海外深造」送行期间，家属无法与当事人直接联系，这是项目的标准安排，请您放心。")}`);
  return centerFrame("home", "");
}

const PAGES = {
  home: () => browserChrome(`
    <div class="se-home">
      <div class="se-logo">
        <span class="c1">星</span><span class="c2">搜</span>
      </div>
      <div class="se-logo-sub">XINGDU SEARCH · 星都公共信息网</div>
      <div class="se-searchbox">
        <span class="sb-icon">${svgIcon("search")}</span>
        <input id="search-input" placeholder="搜索星都的一切…" autocomplete="off">
        <div class="sb-tools">
          <span title="语音搜索">${svgIcon("mic")}</span>
          <span title="拍照搜索">${svgIcon("camera")}</span>
        </div>
        <div class="sb-divider"></div>
        <button class="sb-btn" data-action="do-search">搜索</button>
      </div>
      <div class="se-buttons">
        <button data-action="do-search" data-arg="生命延续中心">星搜一下</button>
        <button data-action="quick-search" data-arg="成人礼测试">手气不错</button>
      </div>
      ${hotSearchHtml()}
      ${searchHistoryHtml()}
    </div>`),
  results: () => {
    const rs = S.ui.browser.results;
    const q = S.ui.browser.query;
    const topBar = `<div class="se-results-top">
      <div class="se-logo-sm" data-action="go-home">
        <span class="c1">星</span><span class="c2">搜</span>
      </div>
      <div class="se-searchbox">
        <span class="sb-icon">${svgIcon("search")}</span>
        <input id="search-input" value="${esc(q)}" placeholder="搜索星都的一切…">
        <div class="sb-tools"><span title="语音搜索">${svgIcon("mic")}</span><span title="拍照搜索">${svgIcon("camera")}</span></div>
        <div class="sb-divider"></div>
        <button class="sb-btn" data-action="do-search">搜索</button>
      </div>
    </div>
    <div class="se-tabs">
      <span class="se-tab active">网页</span>
      <span class="se-tab">资讯</span>
      <span class="se-tab">${svgIcon("video")} 视频</span>
      <span class="se-tab">${svgIcon("photo")} 图片</span>
      <span class="se-tab">知道</span>
      <span class="se-tab">${svgIcon("book")} 文库</span>
      <span class="se-tab">${svgIcon("pin")} 地图</span>
    </div>`;

    if (rs === "searching") {
      return browserChrome(`${topBar}
        <div class="se-loading">
          <div class="sl-spinner"></div>
          星搜正在为您搜索「${esc(q)}」……<br>
          <span style="font-size:11px;color:#9aa0a6">已通过舆情安全预检 · 正在聚合全网结果</span>
        </div>`);
    }

    let body;
    if (rs === null || rs.length === 0) {
      body = `<div class="se-results-body">
        <div style="padding:40px 0;text-align:center">
          <div style="font-size:40px;margin-bottom:12px">${svgIcon("search")}</div>
          <div style="font-size:15px;color:#3c4043;margin-bottom:8px">抱歉，未找到与「<b style="color:#1a73e8">${esc(q)}</b>」相关的结果</div>
          <div style="font-size:12.5px;color:#9aa0a6;line-height:1.8">部分关键词依据《网络信息安全管理条例》第41条已被过滤。<br>建议您：检查输入是否正确 · 尝试更通用的关键词 · 查看下方相关搜索</div>
        </div>
        ${relatedSearchesHtml(q)}
      </div>`;
    } else {
      const count = (rs.length * 12847 + Math.floor(Math.random() * 5000)).toLocaleString();
      const resultItems = rs.map(r => {
        const snippet = (r.snippet || snippetFor(r.page) || "").replace(/\*\*/g, "");
        return `<div class="se-result" data-action="open-page" data-arg="${r.page}">
          <div class="se-result-head">
            <div class="se-result-favicon">${faviconFor(r.url)}</div>
            <div>
              <div class="se-result-site">${esc(r.url.split("/")[0] || r.url)}</div>
              <div class="se-result-url">${esc(r.url)}</div>
            </div>
          </div>
          <div class="se-result-title">${r.title}${r.flag ? `<span class="se-result-flag">${esc(r.flag)}</span>` : ""}</div>
          <div class="se-result-snippet">${snippet}</div>
        </div>`;
      }).join("");
      body = `<div class="se-resultcount">星搜为您找到相关结果约 ${count} 个（用时 0.${Math.floor(Math.random()*50+20)} 秒）</div>
      <div class="se-results-body">
        ${resultItems}
        ${relatedSearchesHtml(q)}
        ${paginationHtml()}
      </div>`;
    }
    return browserChrome(`${topBar}${body}`);
  },
  gov_health: () => {
    const sub = S.ui.govSub || "home";
    if (sub !== "home") return govSubPage(sub);
    return browserChrome(`
    ${msNav({
      brand: "星都市卫生局", sub: "XINGDU MUNICIPAL HEALTH BUREAU",
      logoText: "医", logoColor: "#188038",
      links: GOV_LINKS, active: "首页"
    })}
    ${msHero({
      color: "green", tag: "为未来播种，让天赋生长",
      title: "星都市卫生局",
      desc: "统筹全市青少年发展、公共卫生与「成人礼测试」组织工作。本部门与每一个有爱的家庭携手，守护下一代的健康成长。",
      actions: [
        { text: "成人礼测试", style: "white", act: "gov-sub", arg: "crlcs" },
        { text: "政务公开", style: "outline", act: "gov-sub", arg: "open" }
      ]
    })}
    ${msStats([
      { icon: "幼", num: "12.8", unit: "万", label: "本年度适龄青少年" },
      { icon: "✓", num: "98.7", unit: "%", label: "测试覆盖率", trend: "trend-up" },
      { icon: "学", num: "86.3", unit: "%", label: "优选体通过率" },
      { icon: "飞", num: "1.7", unit: "万", label: "海外深造安排人数" }
    ])}
    ${msSection("本局核心业务", "点击进入对应板块", msCards([
      { icon: "生", iconColor: "green", title: "新生儿基因建档", desc: "强制免费，出生即建档，全程可追溯。", act: "gov-sub", arg: "health" },
      { icon: "单", iconColor: "blue", title: "成人礼测试组织", desc: "18周岁统一测试，科学评估天赋方向。", act: "gov-sub", arg: "crlcs" },
      { icon: "球", iconColor: "teal", title: "海外深造项目", desc: "未通过测试的青少年由政府统一安排。", act: "gov-sub", arg: "law" },
      { icon: "医", iconColor: "orange", title: "公共卫生服务", desc: "免费体检、疫苗接种、健康档案。", act: "gov-sub", arg: "health" }
    ]))}
    ${msFooter({
      brand: "星都市卫生局",
      cols: [
        { title: "政务服务", links: ["办事指南", "在线申报", "结果查询", "表格下载"] },
        { title: "信息公开", links: ["机构职能", "政策文件", "统计数据", "财政信息"] },
        { title: "互动交流", links: ["局长信箱", "在线咨询", "投诉举报", "意见征集"] }
      ],
      copyright: "星都市卫生局 版权所有 · 本页面内容已经三轮舆情安全审核"
    })}
    `);
  },
  center_official: () => {
    const sub = S.ui.centerSub || "home";
    if (sub !== "home") return centerSubPage(sub);
    return browserChrome(`
    ${msNav({
      brand: "生命延续中心", sub: "CENTER FOR LIFE CONTINUITY",
      logoText: "因", logoColor: "#1a73e8",
      links: CENTER_LINKS, active: "首页"
    })}
    ${msHero({
      color: "blue", tag: "国家级生命科学研究机构",
      title: "每一份基因，都值得被认真对待",
      desc: "生命延续中心成立于2048年，是「双子计划」的率先试行者。我们与全市每一个有爱的家庭携手，共同培育健康的下一代。",
      actions: [
        { text: "了解双子计划", style: "white" },
        { text: "在线预约服务", style: "outline" }
      ]
    })}
    ${msStats([
      { icon: "生", num: "2048", label: "中心成立年份" },
      { icon: "幼", num: "340", unit: "万+", label: "累计基因建档数", trend: "trend-up" },
      { icon: "研", num: "128", unit: "项", label: "在研科研项目" },
      { icon: "星", num: "100", unit: "%", label: "家长满意度" }
    ])}
    ${msSection("业务一览", "全周期免费服务，覆盖每个家庭", msCards([
      { icon: "记", iconColor: "blue", title: "新生儿基因建档", desc: "强制，免费。出生即建档，全程可追溯。" },
      { icon: "培", iconColor: "green", title: "备份体培育与托管", desc: "全周期，免费。每一个孩子都有一份「双子」。" },
      { icon: "单", iconColor: "orange", title: "成人礼测试组织", desc: "免费。18周岁统一测试，科学评估。" },
      { icon: "飞", iconColor: "teal", title: "海外深造送行服务", desc: "免费。未通过测试的青少年由政府统一安排。" }
    ]))}
    ${msSection("双子计划", "文明的两份希望", `
      <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:stretch">
        <div style="flex:1;min-width:280px;background:#f8f9fa;border-radius:12px;padding:24px;border:1px solid #e8eaed">
          <div style="font-size:36px;margin-bottom:12px">${svgIcon("child")}</div>
          <h4 style="font-size:16px;margin-bottom:8px;color:#202124">原体</h4>
          <p style="font-size:13px;color:#5f6368;line-height:1.8">由父母自然孕育的孩子，在家庭中成长，接受正常教育。18岁参加成人礼测试。</p>
        </div>
        <div style="display:flex;align-items:center;font-size:28px;color:#1a73e8;font-weight:800">⇄</div>
        <div style="flex:1;min-width:280px;background:#e8f0fe;border-radius:12px;padding:24px;border:1px solid #c6dbfc">
          <div style="font-size:30px;margin-bottom:12px;font-weight:700">${svgIcon("gene")}</div>
          <h4 style="font-size:16px;margin-bottom:8px;color:#1a73e8">备份体</h4>
          <p style="font-size:13px;color:#5f6368;line-height:1.8">原体的基因复制体，在中心托管培育。他们是彼此的「双子」，是文明的两份希望。</p>
        </div>
      </div>
      ${msAlert("info", "讯", "问：我的孩子和备份体是什么关系？答：他们是彼此的「双子」。任何挑拨二者关系的行为都是对文明的不负责任。")}
    `)}
    ${msFooter({
      brand: "生命延续中心",
      cols: [
        { title: "中心服务", links: ["基因建档", "备份托管", "成人礼测试", "深造送行"] },
        { title: "关于我们", links: ["中心简介", "组织架构", "科研成果", "发展历程"] },
        { title: "帮助支持", links: ["常见问题", "在线咨询", "投诉建议", "联系我们"] }
      ],
      copyright: "生命延续中心 版权所有 · 国家级生命科学研究机构"
    })}
    `);
  },
  wiki_disease: () => browserChrome(`
    ${msNav({
      brand: "星都百科", sub: "XINGDU ENCYCLOPEDIA",
      logoText: "百", logoColor: "#7b1fa2",
      links: ["首页", "分类", "热门词条", "编辑中心", "帮助"],
      active: "热门词条", showSearch: true
    })}
    <div style="padding:24px 32px;background:#fff">
      <div style="font-size:11px;color:#9aa0a6;margin-bottom:8px">首页 > 医学 > 神经退行性疾病 > 薛定谔-阿尔茨海默复合症</div>
      <h1 style="font-size:26px;font-weight:800;color:#202124;margin-bottom:4px">薛定谔-阿尔茨海默复合症</h1>
      <div style="font-size:12px;color:#9aa0a6;margin-bottom:20px">编辑：星都百科医学组 · 最后更新：2066-09-15 · 浏览 1,284,391 次</div>
      <div class="ms-infobox">
        <div class="ms-infobox-header" style="background:linear-gradient(135deg,#7b1fa2,#ab47bc)">疾病信息卡</div>
        <div class="ms-infobox-row"><div class="k">疾病类型</div><div class="v">神经退行性疾病</div></div>
        <div class="ms-infobox-row"><div class="k">发现年份</div><div class="v">约2040年</div></div>
        <div class="ms-infobox-row"><div class="k">主要特征</div><div class="v">间歇性认知崩塌</div></div>
        <div class="ms-infobox-row"><div class="k">是否可逆转</div><div class="v">否</div></div>
        <div class="ms-infobox-row"><div class="k">全球影响</div><div class="v">人口平均智力下降31%</div></div>
        <div class="ms-infobox-row"><div class="k">应对方案</div><div class="v">双子计划（审查中）</div></div>
      </div>
      <h3 style="font-size:17px;font-weight:700;color:#202124;margin:20px 0 10px;border-bottom:2px solid #e8eaed;padding-bottom:6px">疾病概述</h3>
      <p style="font-size:14px;line-height:2;color:#3c4043;margin-bottom:12px">薛定谔-阿尔茨海默复合症是一种约2040年爆发的神经退行性疾病，其特征为<b>间歇性认知崩塌</b>——患者会在清醒与痴呆之间反复切换，无法预测，也无法逆转。</p>
      <p style="font-size:14px;line-height:2;color:#3c4043;margin-bottom:12px">该疾病的命名源于其独特的临床表现：患者在未被观察时可能处于任何认知状态，而一旦被外界观察，状态即坍缩为某一确定值。这一量子力学式的病理特征令传统神经科学束手无策。</p>
      <h3 style="font-size:17px;font-weight:700;color:#202124;margin:20px 0 10px;border-bottom:2px solid #e8eaed;padding-bottom:6px">历史与影响</h3>
      <p style="font-size:14px;line-height:2;color:#3c4043;margin-bottom:12px">2048年，「双子计划」在星都市率先试行；2055年全面推广。全球人口平均智力水平已下降 31%。</p>
      <h3 style="font-size:17px;font-weight:700;color:#202124;margin:20px 0 10px;border-bottom:2px solid #e8eaed;padding-bottom:6px">相关词条</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span style="padding:6px 14px;background:#f1f3f4;border-radius:16px;font-size:12.5px;color:#5f6368;cursor:pointer">双子计划</span>
        <span style="padding:6px 14px;background:#f1f3f4;border-radius:16px;font-size:12.5px;color:#5f6368;cursor:pointer">生命延续中心</span>
        <span style="padding:6px 14px;background:#f1f3f4;border-radius:16px;font-size:12.5px;color:#5f6368;cursor:pointer">成人礼测试</span>
        <span style="padding:6px 14px;background:#f1f3f4;border-radius:16px;font-size:12.5px;color:#5f6368;cursor:pointer">海外深造</span>
      </div>
      ${msAlert("warning", "警", "星都市的应对方案详见「双子计划」相关词条——注：该词条正在审查中。")}
    </div>
    ${msFooter({
      brand: "星都百科",
      cols: [
        { title: "百科分类", links: ["科学技术", "历史人文", "医学健康", "社会文化"] },
        { title: "参与编辑", links: ["编辑指南", "创建词条", "审核规范", "投诉举报"] },
        { title: "关于我们", links: ["百科简介", "联系方式", "用户协议", "隐私政策"] }
      ],
      copyright: "星都百科 · 人人可编辑的自由百科全书"
    })}
  `),
  wiki_missing: () => browserChrome(`
    ${msNav({
      brand: "星都百科", sub: "XINGDU ENCYCLOPEDIA",
      logoText: "百", logoColor: "#7b1fa2",
      links: ["首页", "分类", "热门词条", "编辑中心", "帮助"],
      active: "热门词条"
    })}
    <div style="padding:80px 32px;background:#fff;text-align:center;min-height:400px">
      <div style="font-size:64px;margin-bottom:20px">${svgIcon("close")}</div>
      <h2 style="font-size:24px;font-weight:800;color:#202124;margin-bottom:12px">该词条不存在</h2>
      <p style="font-size:14px;color:#5f6368;line-height:2;max-width:500px;margin:0 auto">
        您访问的词条「<b style="color:#d93025">双子计划</b>」正在接受内容审查。<br>
        审查期间，相关信息将以「不存在」的形式呈现。<br>
        <span style="font-size:12px;color:#9aa0a6">（依据《网络信息安全管理条例》第41条）</span>
      </p>
      <div style="margin-top:30px;display:flex;gap:10px;justify-content:center">
        <button class="ms-nav-btn primary" data-action="go-home">返回首页</button>
        <button class="ms-nav-btn" data-action="go-home">申诉词条</button>
      </div>
    </div>
    ${msFooter({
      brand: "星都百科",
      cols: [
        { title: "百科分类", links: ["科学技术", "历史人文", "医学健康", "社会文化"] },
        { title: "参与编辑", links: ["编辑指南", "创建词条", "审核规范", "投诉举报"] },
        { title: "关于我们", links: ["百科简介", "联系方式", "用户协议", "隐私政策"] }
      ],
      copyright: "星都百科 · 人人可编辑的自由百科全书"
    })}
  `),
  social_beichen: () => browserChrome(`
    <div class="fb-page">
      <div class="fb-topnav">
        <div class="fb-brand">星都社交</div>
        <div class="fb-searchbar">${svgIcon("search")} 搜索星都社交</div>
      </div>
      <div class="fb-body">
        <div class="fb-left">
          <div class="fb-card fb-left-user"><img class="fb-mini-ava" src="assets/avatar_bc.png" alt="北辰"><b>北辰_星辰</b></div>
          <div class="fb-card">
            <div class="fb-link">${svgIcon("user")} 好友</div>
            <div class="fb-link">${svgIcon("photo")} 照片</div>
            <div class="fb-link">${svgIcon("clipboard")} 简介</div>
            <div class="fb-link">${svgIcon("star")} 收藏</div>
          </div>
          <div class="fb-card">
            <div class="fb-intro-line">@linbeichen</div>
            <div class="fb-intro-line">18岁 · 天秤座</div>
          </div>
        </div>
        <div class="fb-main">
          <div class="fb-profile">
            <div class="fb-cover"></div>
            <div class="fb-profile-head">
              <div class="fb-avatar"><img src="assets/avatar_bc.png" alt="北辰" referrerpolicy="no-referrer"></div>
              <div class="fb-pinfo">
                <div class="fb-pname">北辰_星辰</div>
                <div class="fb-pid">@linbeichen</div>
                <div class="fb-tabs"><span class="on">时间线</span><span>关于</span></div>
              </div>
              <div class="fb-follow">+ 关注</div>
            </div>
          </div>
          <div class="fb-bio-card">18岁 · 天秤座 · 喜欢星星和旧收音机。</div>
          <div class="fb-post">
            <div class="fb-post-head">
              <img class="fb-post-ava" src="assets/avatar_bc.png" alt="北辰">
              <div class="fb-post-meta"><div class="fb-post-author">北辰_星辰</div><div class="fb-post-time">2066-10-15 · 每年固定动态</div></div>
            </div>
            <div class="fb-post-body">祝我自己18岁生日快乐</div>
            <div class="fb-post-actions"><span data-action="fb-interact">赞 128</span><span data-action="fb-interact">评 46</span><span data-action="fb-interact">享 分享</span></div>
          </div>
          <div class="fb-post">
            <div class="fb-post-head">
              <img class="fb-post-ava" src="assets/avatar_bc.png" alt="北辰">
              <div class="fb-post-meta"><div class="fb-post-author">北辰_星辰</div><div class="fb-post-time">2066-10-12 01:33</div></div>
            </div>
            <div class="fb-post-body">睡不着。楼下的便利店店员说，有个穿黑西装的男人在打听我爸妈。</div>
            <div class="fb-post-actions"><span data-action="fb-interact">赞 156</span><span data-action="fb-interact">评 52</span><span data-action="fb-interact">享 分享</span></div>
          </div>
          <div class="fb-post">
            <div class="fb-post-head">
              <img class="fb-post-ava" src="assets/avatar_bc.png" alt="北辰">
              <div class="fb-post-meta"><div class="fb-post-author">北辰_星辰</div><div class="fb-post-time">2066-10-11 22:47</div></div>
            </div>
            <div class="fb-post-body">爸妈手机全关机第四天。公司说他们请了年假，可我妈最讨厌请假了。</div>
            <div class="fb-post-actions"><span data-action="fb-interact">赞 83</span><span data-action="fb-interact">评 31</span><span data-action="fb-interact">享 分享</span></div>
          </div>
          <div class="fb-post">
            <div class="fb-post-head">
              <img class="fb-post-ava" src="assets/avatar_bc.png" alt="北辰">
              <div class="fb-post-meta"><div class="fb-post-author">北辰_星辰</div><div class="fb-post-time">2066-10-08 07:02</div></div>
            </div>
            <div class="fb-post-body">早上送爸妈出门，去临港的高铁票，说好两天就回。可我心里总觉得不踏实。</div>
            <div class="fb-post-actions"><span data-action="fb-interact">赞 45</span><span data-action="fb-interact">评 12</span><span data-action="fb-interact">享 分享</span></div>
          </div>
          <div class="fb-post">
            <div class="fb-post-head">
              <img class="fb-post-ava" src="assets/avatar_bc.png" alt="北辰">
              <div class="fb-post-meta"><div class="fb-post-author">北辰_星辰</div><div class="fb-post-time">2066-10-05 20:14</div></div>
            </div>
            <div class="fb-post-body">老爸最近总在饭桌上嘀咕「为了北辰，我什么都愿意」。这话听着，总觉得哪里怪怪的。</div>
            <div class="fb-post-actions"><span data-action="fb-interact">赞 67</span><span data-action="fb-interact">评 19</span><span data-action="fb-interact">享 分享</span></div>
          </div>
          <div class="fb-post">
            <div class="fb-post-head">
              <img class="fb-post-ava" src="assets/avatar_bc.png" alt="北辰">
              <div class="fb-post-meta"><div class="fb-post-author">北辰_星辰</div><div class="fb-post-time">2066-09-20 21:03</div></div>
            </div>
            <div class="fb-post-body">天文社招新海报贴了一整面墙。我还是最喜欢旧收音机里的静电声，像星星在说话。</div>
            <div class="fb-post-img"><img src="assets/post_stars.jpg" alt="窗台上的旧收音机与星空" referrerpolicy="no-referrer"></div>
            <div class="fb-post-actions"><span data-action="fb-interact">赞 204</span><span data-action="fb-interact">评 38</span><span data-action="fb-interact">享 分享</span></div>
          </div>
          <div class="fb-post">
            <div class="fb-post-head">
              <img class="fb-post-ava" src="assets/avatar_bc.png" alt="北辰">
              <div class="fb-post-meta"><div class="fb-post-author">北辰_星辰</div><div class="fb-post-time">2066-09-01 08:30</div></div>
            </div>
            <div class="fb-post-body">高三开学。班主任说我们这届刚好赶上「成人礼测试」，让大家加油。</div>
            <div class="fb-post-actions"><span data-action="fb-interact">赞 112</span><span data-action="fb-interact">评 24</span><span data-action="fb-interact">享 分享</span></div>
          </div>
        </div>
      </div>
    </div>
  `),

  lg_baike: () => browserChrome(`
    <div class="wiki-top">
      <div class="wiki-top-inner">
        <div class="wiki-brand"><div class="wiki-logo">${svgIcon("building")}</div><div><div class="wiki-brand-name">城市百科</div><div class="wiki-brand-sub">云岭联邦 · 城市信息志</div></div></div>
        <div class="wiki-search"><span>${svgIcon("search")}</span><input placeholder="在城市百科中搜索" readonly></div>
        <div class="wiki-top-links"><a data-action="go-home">创建账户</a><a data-action="go-home">登录</a></div>
      </div>
    </div>
    <div class="wiki-body">
      <div class="wiki-main">
        <div class="wiki-breadcrumb">城市百科 &gt; 首页 &gt; 城市 &gt; 临港市</div>
        <h1 class="wiki-h1">临港市</h1>
        <div class="wiki-tabrow">
          <span class="wiki-tab active">阅读</span><span class="wiki-tab">讨论</span><span class="wiki-tab right">编辑</span><span class="wiki-tab right">历史</span>
        </div>
        <div class="wiki-infobox">
          <div class="wiki-ib-title">临港市</div>
          <div class="wiki-ib-img">${svgIcon("building")}</div>
          <table>
            <tr><th>国家</th><td>云岭联邦国</td></tr>
            <tr><th>所属都市圈</th><td>星都都市圈</td></tr>
            <tr><th>人口</th><td>约 860 万</td></tr>
            <tr><th>距星都</th><td>高铁 1 小时</td></tr>
            <tr><th>知名</th><td>智慧城市示范群</td></tr>
          </table>
        </div>
        <p><b>临港市</b>是云岭联邦国的一座地级市，与联邦首都星都隔江相望，高铁约一小时直达。近年来以「智慧城市示范群」闻名，2066年10月曾承办「星都—临港智慧城市交流会」。</p>
        <h2 class="wiki-h2">历史</h2>
        <p>临港市原为河口渔村，上世纪依托化工产业崛起，2010年代化工产能陆续关停转型。东郊工业区遗留大片废弃厂区，其中产权复杂、长期闲置。</p>
        <h2 class="wiki-h2">行政区划</h2>
        <p>全市下辖中心城区、东郊工业区、西部高新区三个主要功能区。西部高新区集中高新技术产业与会展中心；中心城区为市政府驻地。</p>
        <h2 class="wiki-h2">东郊工业区</h2>
        <p>东郊为上世纪化工带，关停后围栏破损、无人管理。其中<b>废弃化工厂区（含3号仓库）</b>被多方记录为「产权复杂」。本条目最近一次修订于 2066-10-09。</p>
        <div class="wiki-refs">
          <h3 class="wiki-h3">参考文献</h3>
          <ol>
            <li>星都市地方志编纂委员会.《临港市志·2060版》</li>
            <li>临港市政府公开信息.《智慧城市示范群年度报告》</li>
          </ol>
        </div>
      </div>
      <div class="wiki-toc">
        <div class="wiki-toc-title">目录</div>
        <div class="wiki-toc-item">1 历史</div>
        <div class="wiki-toc-item">2 行政区划</div>
        <div class="wiki-toc-item">3 东郊工业区</div>
        <div class="wiki-toc-item">参考文献</div>
      </div>
    </div>
  `),
  news_meeting: () => browserChrome(`
    ${obsNav("深度调查")}
    <div style="padding:24px 32px;background:#fff;max-width:800px;margin:0 auto">
      <div style="font-size:11px;color:#9aa0a6;margin-bottom:12px">首页 > 深度调查 > 临港市</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <span class="ms-news-tag" style="background:#111;color:#fff">调查</span>
        <span class="ms-news-tag" style="background:#fce8e6;color:#d93025">独家</span>
      </div>
      <h1 style="font-size:28px;font-weight:800;color:#202124;line-height:1.4;margin-bottom:16px">智慧城市交流会在临港开幕，但与会名单「不予公开」</h1>
      <div style="display:flex;gap:16px;align-items:center;padding-bottom:16px;border-bottom:1px solid #e8eaed;margin-bottom:20px;font-size:12px;color:#9aa0a6">
        <span>${svgIcon("eye")} 星都观察者 · 调查部</span>
        <span>${svgIcon("calendar")} 2066年10月10日</span>
        <span>${svgIcon("eye")} 阅读 47,210</span>
        <span>评论 1,204</span>
      </div>
      <div style="font-size:15px;line-height:2.2;color:#3c4043">
        <p style="margin-bottom:16px;text-indent:2em">本报临港讯 10月9日上午，星都—临港智慧城市交流会在临港国际会展中心开幕。官方通稿称「两市领导出席并致辞」，但记者辗转查询，<b>与会代表名单已经市委宣传部门审核备案，内容不予公开</b>。</p>
        <p style="margin-bottom:16px;text-indent:2em">更值得注意的是：就在交流会开幕当日，多名市民向本台反映，家中适龄青少年「随家长赴临港参会」后失联，手机整夜关机。这究竟是一场普通的行业交流，还是另一重身份的「转运」？</p>
        <div style="background:#fff8e1;border-left:4px solid #d93025;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0">
          <div style="font-size:12px;color:#d93025;margin-bottom:6px">⏺ 本报调查</div>
          <p style="font-size:13px;color:#5f6368;line-height:1.8;margin:0">我们没有拿到名单。但我们拿到了一张被涂改的高铁票——座位号是空的。<span style="color:#111;font-weight:600">买了票、却没有上车的人，去了哪里？</span></p>
        </div>
      </div>
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e8eaed">
        <h4 style="font-size:14px;font-weight:700;color:#202124;margin-bottom:12px">相关阅读</h4>
        <div class="ms-news-list">
          <div class="ms-news-item">
            <div class="ms-news-thumb" style="background:#e8f0fe">${svgIcon("star")}</div>
            <div class="ms-news-content">
              <div class="ms-news-title">信用积分覆盖率98%：被量化的市民，与被关停的申诉通道</div>
              <div class="ms-news-snippet">我们调取了近千条积分申诉记录——九成在「补充材料」后不了了之…</div>
              <div class="ms-news-meta"><span>星都观察者</span><span>2066-10-08</span></div>
            </div>
          </div>
          <div class="ms-news-item">
            <div class="ms-news-thumb" style="background:#e6f4ea">${svgIcon("child")}</div>
            <div class="ms-news-content">
              <div class="ms-news-title">「海外深造」的孩子，为什么从不寄明信片回来？</div>
              <div class="ms-news-snippet">生命延续中心年度报告里的「满意度100%」，是谁在打分…</div>
              <div class="ms-news-meta"><span>星都观察者</span><span>2066-10-07</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${obsFooter("民间信源 · 欢迎转发，转载请注明出处")}
  `),
  daily: () => browserChrome(`
    ${obsNav("首页")}
    <div class="obs-hero">
      <div class="obs-hero-inner">
        <div class="obs-hero-kicker">星都观察者 · 编辑部出品</div>
        <h1>不删稿，直到有人回答问题。</h1>
        <p>我们跟踪城市里那些被「和谐」掉的失踪、分数与转运。今天，有三篇报道值得你读完。</p>
      </div>
    </div>
    <div style="padding:24px 32px;background:#fff">
      <div class="ms-section-title" style="margin-bottom:16px">${svgIcon("fire")} 正在调查</div>
      <div class="ms-news-list">
        <div class="ms-news-item">
          <div class="ms-news-thumb" style="background:linear-gradient(135deg,#111,#333)">${svgIcon("star", "#fff")}</div>
          <div class="ms-news-content">
            <div style="margin-bottom:4px"><span class="ms-news-tag" style="background:#111;color:#fff">头条</span></div>
            <div class="ms-news-title">信用积分覆盖率98%：被量化的市民，与被关停的申诉通道</div>
            <div class="ms-news-snippet">我们调取近千条积分申诉记录——九成在「补充材料」后不了了之。舆论占20分，是怎么打上去的？…</div>
            <div class="ms-news-meta"><span>星都观察者</span><span>2066-10-09 08:00</span><span>${svgIcon("eye")} 31,204</span></div>
          </div>
        </div>
        <div class="ms-news-item">
          <div class="ms-news-thumb" style="background:linear-gradient(135deg,#fce8e6,#f8c0bc)">${svgIcon("child")}</div>
          <div class="ms-news-content">
            <div style="margin-bottom:4px"><span class="ms-news-tag" style="background:#fce8e6;color:#d93025">追踪</span></div>
            <div class="ms-news-title">「海外深造」的孩子，为什么从不寄明信片回来？</div>
            <div class="ms-news-snippet">生命延续中心称满意度100%。我们联系了127个家庭，只有3个收到过孩子的一封信…</div>
            <div class="ms-news-meta"><span>星都观察者</span><span>2066-10-09 07:30</span><span>${svgIcon("eye")} 26,871</span></div>
          </div>
        </div>
        <div class="ms-news-item">
          <div class="ms-news-thumb" style="background:linear-gradient(135deg,#e8f0fe,#c6dbfc)">${svgIcon("building")}</div>
          <div class="ms-news-content">
            <div style="margin-bottom:4px"><span class="ms-news-tag" style="background:#e8f0fe;color:#174ea6">临港</span></div>
            <div class="ms-news-title">智慧城市交流会在临港开幕，但与会名单「不予公开」</div>
            <div class="ms-news-snippet">开幕当日，多名适龄青少年随家长「参会」后失联。我们怀疑那场交流会另有名字…</div>
            <div class="ms-news-meta"><span>星都观察者</span><span>2066-10-09 06:00</span><span>${svgIcon("eye")} 47,210</span></div>
          </div>
        </div>
      </div>
    </div>
    ${obsFooter("独立媒体 · 不接广告 · 欢迎私信爆料")}
  `),
  obs_comments: () => browserChrome(`
    ${obsNav("评论")}
    <div style="padding:28px 36px;background:#fff;max-width:820px;margin:0 auto">
      <div class="ms-section-title">评论 · 读者留言</div>
      <p style="font-size:12.5px;color:#9aa0a6;margin-bottom:18px">我们不删稿，也不删评论。以下是读者在《信用积分》《临港交流会》两篇报道下的留言。</p>
      <div class="social-post"><div class="sp-time">10-12 23:41</div>我家孩子今年18，积分380。没人告诉我们减分的理由。</div>
      <div class="social-post"><div class="sp-time">10-13 00:05</div>交流会那天，我邻居家孩子跟着爸妈去临港，再没回来。官方说「海外深造一切顺利」。</div>
      <div class="social-post"><div class="sp-time">10-13 08:22</div>这篇评论如果48小时内消失，说明我们猜对了。—— 编辑留</div>
    </div>
    ${obsFooter("读者即证人 · 欢迎匿名来信")}
  `),
  obs_about: () => browserChrome(`
    ${obsNav("关于我们")}
    <div style="padding:28px 36px;background:#fff;max-width:820px;margin:0 auto">
      <div class="ms-section-title">关于星都观察者</div>
      <p style="font-size:14px;color:#3c4043;line-height:2;margin-bottom:14px">星都观察者是一家不接广告、不受订户影响、也不领政府补贴的独立媒体。我们只做一件事：把官方通稿里「不予公开」的那部分，替你找回来。</p>
      <h3 style="font-size:15px;color:#202124;margin:22px 0 10px">我们的立场</h3>
      <div style="font-size:14px;color:#3c4043;line-height:2">
        <p style="margin-bottom:8px">· 不删稿。哪怕被律师函、被限流，原文存档于三台境外服务器。</p>
        <p style="margin-bottom:8px">· 不匿名化受害者。每一个「赴海外深造」的名字，我们都记下。</p>
        <p style="margin-bottom:8px">· 不接受任何来源的「补贴」。我们靠读者的一次性捐赠运营。</p>
      </div>
      <h3 style="font-size:15px;color:#202124;margin:22px 0 10px">编辑部</h3>
      <p style="font-size:14px;color:#3c4043;line-height:2">主编：C　|　调查部：4 人　|　数据组：2 人　|　技术组：2 人。为安全计，成员身份不公开。</p>
      <h3 style="font-size:15px;color:#202124;margin:22px 0 10px">往期调查精选</h3>
      <div class="ms-news-list">
        <div class="ms-news-item"><div class="ms-news-thumb" style="background:#111">${svgIcon("star", "#fff")}</div><div class="ms-news-content">
          <div class="ms-news-title">信用积分覆盖率98%：被量化的市民与被关停的申诉</div>
          <div class="ms-news-meta"><span>星都观察者</span><span>2066-10-11</span></div>
        </div></div>
        <div class="ms-news-item"><div class="ms-news-thumb" style="background:#fce8e6">${svgIcon("building")}</div><div class="ms-news-content">
          <div class="ms-news-title">智慧城市交流会在临港开幕，与会名单「不予公开」</div>
          <div class="ms-news-meta"><span>星都观察者</span><span>2066-10-10</span></div>
        </div></div>
      </div>
      <h3 style="font-size:15px;color:#202124;margin:22px 0 10px">投稿与联系</h3>
      <p style="font-size:14px;color:#3c4043;line-height:2">匿名投稿邮箱：tips@observer.xd.news（PGP 加密，不回查）。<br>如果你也有一个「买了票却没上车」的家人，你不是一个人。</p>
    </div>
    ${obsFooter("匿名投稿 · 不回查、不留档")}
  `),
  factory: () => browserChrome(`
    ${msNav({
      brand: "星途地图", sub: "XINGTU MAP · 卫星视图",
      logoText: "图", logoColor: "#1a73e8",
      links: ["地图", "卫星", "街景", "公交", "路况", "更多"], navAction: "map-maintenance",
      active: "卫星"
    })}
    <div style="position:relative;height:320px;background:linear-gradient(135deg,#c8d8e8,#a8c0d8);overflow:hidden">
      <div style="position:absolute;left:0;right:0;top:62%;height:10px;background:#8a9aab;opacity:0.7"></div>
      <div style="position:absolute;top:0;bottom:0;left:30%;width:8px;background:#8a9aab;opacity:0.7"></div>
      <div style="position:absolute;left:70%;top:32%;transform:translate(-50%,-50%);text-align:center;cursor:pointer" data-action="pin-factory">
        <div style="width:36px;height:36px;background:#d93025;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(217,48,37,0.4);margin:0 auto">
          <span style="transform:rotate(45deg);color:#fff;font-size:16px">${svgIcon("factory")}</span>
        </div>
        <div style="background:#fff;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;color:#202124;margin-top:6px;box-shadow:0 2px 8px rgba(0,0,0,0.15);white-space:nowrap">废弃化工厂 · 3号仓库</div>
      </div>
      <div style="position:absolute;left:26%;top:58%;font-size:11px;color:#5f7d94;background:rgba(255,255,255,0.8);padding:2px 8px;border-radius:4px">临港市区 ◈ 14km</div>
      <div style="position:absolute;bottom:12px;right:12px;background:rgba(255,255,255,0.9);padding:6px 12px;border-radius:6px;font-size:11px;color:#5f6368">卫星图像 · 2066年9月拍摄</div>
    </div>
    <div style="padding:24px 32px;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:12px">
        <div>
          <h1 style="font-size:22px;font-weight:800;color:#202124;margin-bottom:4px">临港市东郊废弃化工厂</h1>
          <div style="font-size:12px;color:#9aa0a6">${svgIcon("pin")} 临港市东郊工业区 · 距临港市区14公里</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="ms-nav-btn">${svgIcon("photo")} 街景</button>
          <button class="ms-nav-btn primary">向 导航</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px">
        <div style="padding:14px;background:#f8f9fa;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:#9aa0a6;margin-bottom:4px">关停年份</div>
          <div style="font-size:20px;font-weight:800;color:#202124">2014</div>
        </div>
        <div style="padding:14px;background:#f8f9fa;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:#9aa0a6;margin-bottom:4px">厂区面积</div>
          <div style="font-size:20px;font-weight:800;color:#202124">8.6<span style="font-size:12px">万㎡</span></div>
        </div>
        <div style="padding:14px;background:#f8f9fa;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:#9aa0a6;margin-bottom:4px">产权状态</div>
          <div style="font-size:14px;font-weight:700;color:#e8710a;margin-top:4px">复杂/闲置</div>
        </div>
        <div style="padding:14px;background:#f8f9fa;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:#9aa0a6;margin-bottom:4px">管理状态</div>
          <div style="font-size:14px;font-weight:700;color:#d93025;margin-top:4px">无人管理</div>
        </div>
      </div>
      <h3 style="font-size:16px;font-weight:700;color:#202124;margin-bottom:10px">地点详情</h3>
      <p style="font-size:13.5px;line-height:2;color:#3c4043;margin-bottom:12px">厂区2014年关停。3号仓库为厂区最大库房，紧邻货运铁路支线。</p>
      ${msAlert("warning", "", "卫星图像显示：2066年9月起，仓库外围出现新架设的监控探头与夜间照明。")}
    </div>
  `),
  rumor_destroy: () => browserChrome(`
    ${msNav({
      brand: "星都百科", sub: "XINGDU ENCYCLOPEDIA",
      logoText: "百", logoColor: "#7b1fa2",
      links: ["首页", "分类", "热门词条", "编辑中心", "帮助"],
      active: "热门词条"
    })}
    <div style="padding:24px 32px;background:#fff">
      <div style="font-size:11px;color:#9aa0a6;margin-bottom:8px">首页 > 社会 > 教育 > 海外深造</div>
      <h1 style="font-size:26px;font-weight:800;color:#202124;margin-bottom:4px">海外深造</h1>
      <div style="font-size:12px;color:#9aa0a6;margin-bottom:20px">编辑：星都百科社会组 · 最后更新：2066-10-08 · 浏览 892,147 次</div>
      <div class="ms-infobox">
        <div class="ms-infobox-header" style="background:linear-gradient(135deg,#e8710a,#fbbc04)">词条信息</div>
        <div class="ms-infobox-row"><div class="k">官方名称</div><div class="v">海外深造项目</div></div>
        <div class="ms-infobox-row"><div class="k">实施机构</div><div class="v">生命延续中心</div></div>
        <div class="ms-infobox-row"><div class="k">适用对象</div><div class="v">未通过成人礼测试的青少年</div></div>
        <div class="ms-infobox-row"><div class="k">费用</div><div class="v">全免（市财政承担）</div></div>
        <div class="ms-infobox-row"><div class="k">家属联系</div><div class="v">无稳定联系记录</div></div>
        <div class="ms-infobox-row"><div class="k">举报次数</div><div class="v" style="color:#d93025">37次（复审中）</div></div>
      </div>
      <h3 style="font-size:17px;font-weight:700;color:#202124;margin:20px 0 10px;border-bottom:2px solid #e8eaed;padding-bottom:6px">官方口径</h3>
      <p style="font-size:14px;line-height:2;color:#3c4043;margin-bottom:12px">未通过成人礼测试的青少年将赴海外深造，费用全免。历年来，无任何一名「深造学员」与国内家庭建立过稳定联系。</p>
      <h3 style="font-size:17px;font-weight:700;color:#202124;margin:20px 0 10px;border-bottom:2px solid #e8eaed;padding-bottom:6px">民间传闻（未经证实）</h3>
      <p style="font-size:14px;line-height:2;color:#3c4043;margin-bottom:12px">关于「深造」的真实去向，流传三种说法：</p>
      <div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap">
        <div style="flex:1;min-width:180px;padding:16px;background:#fce8e6;border-radius:10px;text-align:center">
          <div style="font-size:28px;margin-bottom:8px">${svgIcon("fire")}</div>
          <div style="font-weight:700;color:#a50e0e;font-size:14px">焚烧</div>
          <div style="font-size:11px;color:#5f6368;margin-top:4px">物理销毁</div>
        </div>
        <div style="flex:1;min-width:180px;padding:16px;background:#e8f0fe;border-radius:10px;text-align:center">
          <div style="font-size:28px;margin-bottom:8px">${svgIcon("snow")}</div>
          <div style="font-weight:700;color:#174ea6;font-size:14px">冷冻</div>
          <div style="font-size:11px;color:#5f6368;margin-top:4px">低温封存</div>
        </div>
        <div style="flex:1;min-width:180px;padding:16px;background:#f3e8fd;border-radius:10px;text-align:center">
          <div style="font-size:28px;margin-bottom:8px">${svgIcon("brain")}</div>
          <div style="font-weight:700;color:#5b2c8e;font-size:14px">意识格式化</div>
          <div style="font-size:11px;color:#5f6368;margin-top:4px">最骇人听闻</div>
        </div>
      </div>
      <p style="font-size:14px;line-height:2;color:#3c4043;margin-bottom:12px">传闻「销毁中心」位于临港市东郊地下，对外挂牌「生命科学研究基地」。</p>
      ${msAlert("warning", "警", "本词条已被举报 37 次，正在复审。复审期间词条内容可能随时变更。")}
    </div>
    ${msFooter({
      brand: "星都百科",
      cols: [
        { title: "百科分类", links: ["科学技术", "历史人文", "医学健康", "社会文化"] },
        { title: "参与编辑", links: ["编辑指南", "创建词条", "审核规范", "投诉举报"] },
        { title: "关于我们", links: ["百科简介", "联系方式", "用户协议", "隐私政策"] }
      ],
      copyright: "星都百科 · 人人可编辑的自由百科全书"
    })}
  `),
  credit: () => browserChrome(`
    ${obsNav("深度调查")}
    <div style="padding:24px 32px;background:#fff;max-width:820px;margin:0 auto">
      <div style="font-size:11px;color:#9aa0a6;margin-bottom:12px">首页 > 深度调查 > 社会信用</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <span class="ms-news-tag" style="background:#111;color:#fff">调查</span>
        <span class="ms-news-tag" style="background:#fef7e0;color:#b06000">数据</span>
      </div>
      <h1 style="font-size:26px;font-weight:800;color:#202124;line-height:1.4;margin-bottom:16px">信用积分覆盖率98%：被量化的市民，与被关停的申诉通道</h1>
      <div style="display:flex;gap:16px;align-items:center;padding-bottom:16px;border-bottom:1px solid #e8eaed;margin-bottom:20px;font-size:12px;color:#9aa0a6">
        <span>${svgIcon("eye")} 星都观察者 · 数据组</span>
        <span>${svgIcon("calendar")} 2066年10月11日</span>
        <span>${svgIcon("eye")} 阅读 52,093</span>
        <span>评论 2,871</span>
      </div>
      <div style="font-size:15px;line-height:2.2;color:#3c4043">
        <p style="margin-bottom:16px;text-indent:2em">市政务服务管理局今天公布：全市信用积分体系覆盖率已达 <b>98.2%</b>，全市平均积分 720 分，「优质公民」占比 34.6%。官方口径一片大好。但我们拿到的另一份内部表格显示——有 <b>2.1%</b> 的人被划入「需关注」，而他们之中，超过七成是还没满18岁的孩子。</p>
        <p style="margin-bottom:16px;text-indent:2em">积分怎么算？出行 25%、消费 20%、社交 25%、<b>舆论评价 20%</b>、公益 10%。也就是说，你在网上说了什么，直接影响你值不值得被当作「优质公民」。</p>
      </div>
      ${msStats([
        { icon: "表", num: "98.2", unit: "%", label: "官方口径覆盖率", trend: "trend-up" },
        { icon: "星", num: "720", unit: "分", label: "全市平均积分" },
        { icon: "冠", num: "34.6", unit: "%", label: "优质公民占比" },
        { icon: "警", num: "2.1", unit: "%", label: "需关注人群（多为未成年）" }
      ])}
      <div style="font-size:15px;line-height:2.2;color:#3c4043;margin-top:8px">
        <p style="margin-bottom:16px;text-indent:2em">更值得追问的是等级。积分被切成四档：600 分以上是 A，享受出行五折；400 分以下是 C，限制出行与消费；200 分以下是 D，账户冻结、接受「社区再教育」。我们顺着一份外泄的内部文件往下查，发现——<b>这张表和成人礼测试的录取名单，用的是同一份打分权重。</b></p>
        <div style="background:#fff8e1;border-left:4px solid #d93025;padding:16px 20px;margin:20px 0;border-radius:0 8px 8px 0">
          <div style="font-size:12px;color:#d93025;margin-bottom:6px">⏺ 我们的发现</div>
          <p style="font-size:13px;color:#5f6368;line-height:1.8;margin:0">舆论评价 20 分，打分人是谁？申诉通道为什么永远在「补充材料」？一个孩子在测试前就已经「输了」——输的不是能力，是那 20 分。<span style="color:#111;font-weight:600">我们将持续追访。</span></p>
        </div>
      </div>
    </div>
    ${obsFooter("民间数据 · 欢迎提供被压下的申诉记录")}
  `),
  novel: () => browserChrome(`
    ${msNav({
      brand: "星都科幻文库", sub: "XINGDU SCI-FI LIBRARY",
      logoText: "科", logoColor: "#7b1fa2",
      links: ["首页", "书库", "排行榜", "作者专区", "书评", "我的书架"],
      active: "书库"
    })}
    <div style="padding:24px 32px;background:#fff;max-width:800px;margin:0 auto">
      <div style="font-size:11px;color:#9aa0a6;margin-bottom:8px">首页 > 书库 > 科幻 > 反乌托邦</div>
      <div style="display:flex;gap:24px;margin-bottom:24px;flex-wrap:wrap">
        <div style="width:140px;height:200px;background:linear-gradient(135deg,#5b2c8e,#ab47bc);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:48px;box-shadow:0 8px 24px rgba(91,44,142,0.3);flex-shrink:0">${svgIcon("book")}</div>
        <div style="flex:1;min-width:200px">
          <h1 style="font-size:24px;font-weight:800;color:#202124;margin-bottom:6px">双生子悖论</h1>
          <div style="font-size:12px;color:#9aa0a6;margin-bottom:12px">作者：佚名 · 分类：科幻/反乌托邦 · 连载中</div>
          <div style="display:flex;gap:16px;margin-bottom:12px;font-size:12px">
            <span style="color:#5f6368">${svgIcon("table")} 评分 <b style="color:#e8710a">9.4</b></span>
            <span style="color:#5f6368">${svgIcon("eye")} 阅读 128,491</span>
            <span style="color:#5f6368">书评 3,847</span>
          </div>
          <p style="font-size:13px;color:#5f6368;line-height:1.8;margin-bottom:16px">在一个每个人都有备份体的世界里，当备份体读完第一千本禁书之后，他还是备份吗？一面被锁在储藏室里的镜子，会记得什么？</p>
          <div style="display:flex;gap:8px">
            <button class="ms-nav-btn primary">开始阅读</button>
            <button class="ms-nav-btn">加入书架</button>
          </div>
        </div>
      </div>
      <div style="border-top:1px solid #e8eaed;padding-top:20px">
        <h3 style="font-size:16px;font-weight:700;color:#202124;margin-bottom:12px">第41章 · 节选</h3>
        <div style="padding:24px;background:#f8f9fa;border-radius:10px;border-left:4px solid #7b1fa2;font-style:italic">
          <p style="font-size:14px;line-height:2.2;color:#3c4043;margin-bottom:14px">「他们以为备份只是备份。可当备份在白色房间里读完第一千本禁书之后，他就不再是备份了——他是一面镜子，一面被锁在储藏室里的镜子。」</p>
          <p style="font-size:14px;line-height:2.2;color:#3c4043;margin-bottom:14px">「镜子不恨人。镜子只是记得。」</p>
          <p style="font-style:normal;font-size:11px;color:#9aa0a6;margin-top:16px">—— 第41章 · 作者：佚名 · 最近更新于2066-10-16 03:33（你会记得这个时间）</p>
        </div>
      </div>
    </div>
    ${msFooter({
      brand: "星都科幻文库",
      cols: [
        { title: "书库分类", links: ["硬科幻", "软科幻", "反乌托邦", "赛博朋克"] },
        { title: "作者服务", links: ["作者入驻", "写作指南", "签约福利", "版权合作"] },
        { title: "关于我们", links: ["文库介绍", "联系我们", "用户协议", "隐私政策"] }
      ],
      copyright: "星都科幻文库 版权所有 · 每一个故事都值得被阅读"
    })}
  `),
  map_34: () => browserChrome(`
    ${msNav({
      brand: "星途地图", sub: "XINGTU MAP · 地点详情",
      logoText: "图", logoColor: "#1a73e8",
      links: ["地图", "卫星", "街景", "公交", "路况", "更多"], navAction: "map-maintenance",
      active: "地图"
    })}
    <div style="padding:24px 32px;background:#fff">
      <div style="font-size:11px;color:#9aa0a6;margin-bottom:8px">首页 > 老城区 > 红星路</div>
      <h1 style="font-size:24px;font-weight:800;color:#202124;margin-bottom:4px">红星路34号</h1>
      <div style="font-size:12px;color:#9aa0a6;margin-bottom:20px">${svgIcon("pin")} 星都市老城区红星路34号（北纬39°54′，东经116°23′）</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px">
        <div style="padding:16px;background:#f8f9fa;border-radius:10px">
          <div style="font-size:11px;color:#9aa0a6;margin-bottom:6px">原用途</div>
          <div style="font-size:15px;font-weight:700;color:#202124">极光网络会所</div>
        </div>
        <div style="padding:16px;background:#f8f9fa;border-radius:10px">
          <div style="font-size:11px;color:#9aa0a6;margin-bottom:6px">停业时间</div>
          <div style="font-size:15px;font-weight:700;color:#202124">2011年</div>
        </div>
        <div style="padding:16px;background:#f8f9fa;border-radius:10px">
          <div style="font-size:11px;color:#9aa0a6;margin-bottom:6px">当前状态</div>
          <div style="font-size:15px;font-weight:700;color:#e8710a">闲置/待拆迁</div>
        </div>
      </div>
      <div style="padding:20px;background:#e8f0fe;border-radius:10px;border-left:4px solid #1a73e8;margin-bottom:20px">
        <div style="font-weight:700;color:#174ea6;font-size:14px;margin-bottom:8px">${svgIcon("pin")} 坐标匹配</div>
        <p style="font-size:13px;color:#3c4043;line-height:1.8;margin:0">本地点坐标与「2048留念.jpg」的EXIF拍摄地点完全吻合——那是北辰父母年轻时常去的地方。</p>
      </div>
      <div style="display:flex;gap:10px">
        <button class="ms-nav-btn primary" data-action="open-streetview">在星途中打开街景</button>
        <button class="ms-nav-btn">导航到这里</button>
      </div>
    </div>
  `),
  li_doctor: () => browserChrome(`
    ${msNav({
      brand: "ID系统 · 匿名缓存快照", sub: "ID SYSTEM · LEAKED CACHE",
      logoText: "ID", logoColor: "#d93025",
      links: ["首页", "查询", "档案", "通报", "设置"],
      active: "通报"
    })}
    <div style="padding:24px 32px;background:#fff">
      ${msAlert("danger", "警", "本页面为匿名缓存快照，数据来源未经证实。访问本页面可能违反《数据安全管理条例》。")}
      <div style="max-width:700px;margin:0 auto">
        <div style="background:#fff;border:1px solid #e8eaed;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
          <div style="padding:14px 20px;background:linear-gradient(135deg,#d93025,#ea4335);color:#fff;display:flex;justify-content:space-between;align-items:center">
            <span style="font-weight:700;font-size:14px">内部通报 · 评估科 李某某</span>
            <span style="padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;background:rgba(255,255,255,0.2)">仅限中心内部</span>
          </div>
          <div style="padding:20px">
            <div style="display:flex;padding:12px 0;border-bottom:1px solid #f1f3f4">
              <div style="width:80px;color:#9aa0a6;font-size:13px;font-weight:500;flex-shrink:0">事由</div>
              <div style="flex:1;font-size:13.5px;color:#3c4043;line-height:1.8">经数据复核，其经手的 11 份评估报告存在「结论趋同」异常</div>
            </div>
            <div style="display:flex;padding:12px 0;border-bottom:1px solid #f1f3f4">
              <div style="width:80px;color:#9aa0a6;font-size:13px;font-weight:500;flex-shrink:0">处理</div>
              <div style="flex:1;font-size:13.5px;color:#3c4043;line-height:1.8">
                <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:#fef7e0;color:#b06000;margin-right:6px">内部警告一次</span>
                调离一线评估岗 · 保留档案科职务
              </div>
            </div>
            <div style="display:flex;padding:12px 0">
              <div style="width:80px;color:#9aa0a6;font-size:13px;font-weight:500;flex-shrink:0">备注</div>
              <div style="flex:1;font-size:13.5px;color:#3c4043;line-height:1.8">本人申辩：「每一份报告都是按上头意思写的。」申辩不予采纳。</div>
            </div>
          </div>
          <div style="padding:10px 20px;background:#f8f9fa;font-size:11px;color:#9aa0a6;text-align:center">
            缓存时间：2066-10-14 03:33 · 数据来源：匿名 · 本快照已被访问 1,247 次
          </div>
        </div>
      </div>
    </div>
  `),
  forum: () => {
    if (has("forum_open")) return forumHome();
    return browserChrome(`
      <div class="dark-forum">
      <div class="forum-gate">
        <h3>暗 涌</h3>
        <p>ANYONG · 加密论坛<br>「水面上是他们的城市，水面下是我们的。」<br><br>本站不索引、不备案、不原谅。<br>请输入邀请码继续。</p>
        <input id="invite-input" placeholder="※※※※" maxlength="10" autocomplete="off">
        <button class="btn btn-primary" style="width:100%" data-action="forum-gate">进 入</button>
        <div class="pass-error" id="forum-error"></div>
        <p style="font-size:11px;margin-top:12px;color:#4e7a5e">提示：老成员之间的暗号，藏在「老地方」的一部老电话里。</p>
      </div>
      </div>`);
  },
  forum_top: () => has("forum_open") ? forumThread({
    author: "守夜人", avatar: "", time: "2055-06-01 · 置顶", floor: "1楼",
    content: `献给所有被遗忘的「冗余体」。

他们告诉你，孩子去了海外深造。他们没告诉你的是：<b>销毁中心</b>位于临港市东郊的地下，对外挂牌「生命科学研究基地」，内部设有「处理室」。

焚烧。冷冻。意识格式化。三种流程，一种结果。

后勤通道是厂区的<b>3号仓库</b>——货运铁路直达，监控上个月刚换的新。

请记住他们的编号。总有一天，我们要把名字一个一个刻回去。`,
    replies: [
      { author: "路灯下的影子", avatar: "月", text: "每年都来顶一次。一万个编号了。" },
      { author: "D_张", avatar: "男", text: "我儿子的编号是CLC-2048-0412-B。记住他。" },
      { author: "编号C-2021-0001", avatar: "烛", text: "C-2021-0001。我妹妹。她笑起来左边有个梨涡，最爱吃学校门口的烤肠。" },
      { author: "顶针", avatar: "钉", text: "查了3号仓库近三个月的货运调度，又有17节车皮进厂。每一节，对应一个编号。" },
      { author: "夜航船", avatar: "船", text: "又来了。今年是第九年。名单还没刻完，我也不敢停。" },
      { author: "被留下的人", avatar: "匿", text: "妈妈说我是被选中的那个。可我夜里总梦见另一个人在哭，他穿着我的旧校服。" },
      { author: "守夜人", avatar: "烛", text: "（管理员）新一批编号已更新至置顶附件。离线保存，别在站内连过公网。" },
    ]
  }) : forumLocked(),
  forum_b2: () => has("forum_open") ? forumThread({
    author: "另一个我", avatar: "眼", time: "2066-10-13 03:33", floor: "1楼",
    content: `我的父母选择了我的复制品。

他们觉得我太冷血。他们觉得那个傻子更好。他们不知道，我才是真正爱他们的人。我只是不会表达。现在他们要付出代价。`,
    replies: [
      { author: "路灯下的影子", avatar: "月", text: "兄弟，冷静。你要做什么？" },
      { author: "守夜人", avatar: "烛", text: "（站务）该用户已被我们单独私聊关注。看到这条的人请不要回复、不要扩散。" },
      { author: "另一个我", avatar: "眼", text: "（楼主已离线）" },
      { author: "水底的鱼", avatar: "鱼", text: "你不是一个人。我也是被'留下'的那个，我家人至今不知道家里那个已经不是原来的我。" },
      { author: "3楼路过", avatar: "目", text: "楼上几位没看懂吧——他不是在抱怨，他是在去找那个'替代品'算账的路上。" },
      { author: "旧水表", avatar: "水", text: "说句不好听的：看过内部文件的人都清楚，被'送走'的那个才是亲生的，留下的是复制体。你恨错人了——或者你早就知道，所以才更可怕。" },
      { author: "潜水三年", avatar: "浪", text: "举报了。（开玩笑的。但这种话别在这讲，加密也不是保险箱，站务这次真救不了你。）" },
    ]
  }) : forumLocked(),
  forum_zhang: () => has("forum_open") ? forumThread({
    author: "D_张", avatar: "男", time: "2066-10-13 20:41", floor: "1楼",
    content: `如果有人看到我的家人，请告诉我。

我姓张，我的儿子也被选中了「销毁」。编号CLC-2048-0412-B。

我们本打算逃走，但我现在联系不上他们了。`,
    replies: [
      { author: "守夜人", avatar: "烛", text: "老张，站内私信已开。有消息第一时间告诉你。" },
      { author: "找囡囡的爸", avatar: "父", text: "我也在找。我女儿编号CLC-2049-0317-A。上周接到电话说'孩子在海外很好'，可那声音不是我女儿的——她小时候得过肺炎，说话永远带着一点沙沙的气音。" },
      { author: "红星路住户", avatar: "屋", text: "老张，红星路那片最近天天有辆灰色无牌货车停在巷口，凌晨才走。你把家人照片私信发我，我帮你盯。" },
      { author: "旧水表", avatar: "水", text: "别在这留任何真实信息，哪怕是化名。把你知道的编号和车次整理好，走加密私信。" },
      { author: "夜航船", avatar: "船", text: "顶上去。让更多还被蒙在鼓里的父母看见。" },
      { author: "调度员（匿名）", avatar: "讯", text: "已阅。3号仓库本月的转运名单我拿到了，你儿子的编号在'待转运'那一栏，日期我私发给你。（附件已端到端加密，别下载到联网设备。）" },
    ]
  }) : forumLocked(),
  forum_ct: () => has("forum_open") ? browserChrome(`
    <div class="dark-forum">
    <div class="forum-backbar"><button class="btn" data-action="open-page" data-arg="forum">← 返回论坛列表</button></div>
    <div class="web-header" style="border-color:#1f3a2a"><h2 style="font-size:16px">辰天法务部：如何合法地让人「社会性死亡」…</h2><span class="wh-url">anyong.onion · 帖子</span></div>
    <div class="forum-post">
      <div class="fp-author"><span class="fp-name">被404的人</span><span class="fp-floor">1楼</span></div>
      <div style="white-space:pre-wrap">他们不怕坐牢，因为他们从不亲自坐牢。

我前东家是辰天法务部的外包。他们的「社会性死亡」流水线：买通评估员把目标写成「危险人格」→ 通过居民ID系统清零信用积分 → 档案「查无此人」。合法，干净，一滴血都不沾。

上个月，他们盯上了一个姓林的档案员。他只是把一份问卷的抬头复印了下来……</div>
    </div>
    <div class="gov-banner" style="background:linear-gradient(90deg,#5a1a1a,#2a0a0a);border-color:#c04a4a;margin-top:14px;color:#ffd7dc;font-weight:700;border-left:4px solid #e06c75">
      ⚠ 该帖已被「404」：辰天安全网关实时拦截 · 内容同步删除 · 访问已记录
    </div>
    <div class="hint-box" style="margin-top:12px">帖子读到一半就消失了。刚才那些字，是真的，还是在钓鱼？你背后忽然有点凉。</div>
    </div>`) : forumLocked(),
  mall: () => browserChrome(`
    ${msNav({
      brand: "星途地图", sub: "XINGTU MAP · 地点详情",
      logoText: "图", logoColor: "#1a73e8",
      links: ["地图", "卫星", "街景", "公交", "路况", "更多"], navAction: "map-maintenance",
      active: "地图"
    })}
    <div style="padding:24px 32px;background:#fff">
      <div style="font-size:11px;color:#9aa0a6;margin-bottom:8px">首页 > 老城区 > 商业设施</div>
      <h1 style="font-size:24px;font-weight:800;color:#202124;margin-bottom:4px">万浪城 · 星都店</h1>
      <div style="font-size:12px;color:#9aa0a6;margin-bottom:20px">${svgIcon("pin")} 星都市老城区 · 原市级商业综合体</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px">
        <div style="padding:14px;background:#f8f9fa;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:#9aa0a6;margin-bottom:4px">停业时间</div>
          <div style="font-size:18px;font-weight:800;color:#d93025">2059年</div>
        </div>
        <div style="padding:14px;background:#f8f9fa;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:#9aa0a6;margin-bottom:4px">当前用途</div>
          <div style="font-size:13px;font-weight:700;color:#e8710a;margin-top:3px">市属仓储转运中心</div>
        </div>
        <div style="padding:14px;background:#f8f9fa;border-radius:8px;text-align:center">
          <div style="font-size:11px;color:#9aa0a6;margin-bottom:4px">对外营业</div>
          <div style="font-size:18px;font-weight:800;color:#d93025">否</div>
        </div>
      </div>
      ${msAlert("warning", "警", "该商场已于2059年停业改造，现为市属仓储转运中心，不对外营业，无超市、无餐饮。")}
      ${msAlert("info", "目", "附近居民反馈：近一年来，仓库后门夜间有货运车辆进出。")}
    </div>
  `),
  food: () => browserChrome(`
    ${msNav({
      brand: "星都美食指南", sub: "XINGDU FOOD GUIDE",
      logoText: "食", logoColor: "#e8710a",
      links: ["首页", "美食榜单", "餐厅推荐", "探店日记", "优惠券", "我的"],
      active: "美食榜单"
    })}
    ${msHero({
      color: "orange", tag: "2066年度榜单",
      title: "星都十大必吃餐厅",
      desc: "网友票选 · 年度更新 · 覆盖全城各区美食。跟着榜单吃，不踩雷。",
      actions: [
        { text: "查看完整榜单", style: "white" },
        { text: "领取优惠券", style: "outline" }
      ]
    })}
    <div style="padding:24px 32px;background:#fff">
      <div class="ms-section-title" style="margin-bottom:16px">${svgIcon("trophy")} 榜单TOP10</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${[
          { rank: 1, name: "老青云牛肉面", price: "人均8星元", tag: "老字号", desc: "传承三代的牛肉面馆，汤头浓郁，面条劲道。", color: "#fbbc04" },
          { rank: 2, name: "三江源火锅", price: "人均56星元", tag: "热门", desc: "高原牦牛肉火锅，食材新鲜，锅底独特。", color: "#ea4335" },
          { rank: 3, name: "阿婆糖水", price: "人均12星元", tag: "排队王", desc: "总店排队约40分钟，传统广式糖水，甜而不腻。", color: "#34a853" },
          { rank: 4, name: "（已倒闭）", price: "—", tag: "已停业", desc: "榜单未更新", color: "#9aa0a6" },
          { rank: 5, name: "（已倒闭）", price: "—", tag: "已停业", desc: "榜单未更新", color: "#9aa0a6" },
        ].map(r => `
          <div style="display:flex;gap:16px;padding:16px;background:#f8f9fa;border-radius:10px;align-items:center;${r.rank > 3 ? 'opacity:0.5' : ''}">
            <div style="width:36px;height:36px;border-radius:50%;background:${r.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">${r.rank}</div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-weight:700;color:#202124;font-size:15px">${r.name}</span>
                <span style="padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;background:#e8f0fe;color:#1a73e8">${r.tag}</span>
              </div>
              <div style="font-size:12.5px;color:#5f6368;margin-bottom:2px">${r.desc}</div>
              <div style="font-size:11px;color:#9aa0a6">${r.price}</div>
            </div>
          </div>
        `).join("")}
        <div style="text-align:center;padding:12px;font-size:12px;color:#9aa0a6">第6-10名略（含2家已倒闭，榜单未更新）</div>
      </div>
      ${msAlert("info", "记", "本榜单由市民投票产生，与任何社会事件无关。祝您用餐愉快。")}
    </div>
    ${msFooter({
      brand: "星都美食指南",
      cols: [
        { title: "美食分类", links: ["中餐", "西餐", "日韩料理", "甜品饮品"] },
        { title: "用户服务", links: ["写评价", "传图片", "领优惠券", "我的收藏"] },
        { title: "关于我们", links: ["平台介绍", "商家入驻", "联系客服", "用户协议"] }
      ],
      copyright: "星都美食指南 版权所有"
    })}
  `),
  pet: () => browserChrome(`
    ${msNav({
      brand: "星都宠物领养中心", sub: "XINGDU PET ADOPTION",
      logoText: "宠", logoColor: "#188038",
      links: ["首页", "待领养", "领养流程", "养宠知识", "公益活动", "我的"],
      active: "待领养"
    })}
    ${msHero({
      color: "green", tag: "本月待领养",
      title: "给它一个家",
      desc: "每一只流浪的毛孩子都在等待一个温暖的家。领养代替购买，用爱终止流浪。",
      actions: [
        { text: "我要领养", style: "white" },
        { text: "了解领养流程", style: "outline" }
      ]
    })}
    ${msStats([
      { icon: "犬", num: "3", unit: "只", label: "柯基待领养" },
      { icon: "猫", num: "7", unit: "只", label: "狸花猫待领养" },
      { icon: "犬", num: "1", unit: "只", label: "白色大狗（会握手）" },
      { icon: "爱", num: "128", unit: "只", label: "本月成功领养", trend: "trend-up" }
    ])}
    <div style="padding:24px 32px;background:#fff">
      <div class="ms-section-title" style="margin-bottom:16px">本月待领养宠物</div>
      <div class="ms-cards">
        <div class="ms-card">
          <div class="ms-card-icon green" style="font-weight:700">${svgIcon("paw")}</div>
          <div class="ms-card-title">柯基 × 3</div>
          <div class="ms-card-desc">2公1母，均已绝育驱虫，性格温顺亲人。年龄6个月-2岁不等。</div>
          <div class="ms-card-arrow">申请领养 →</div>
        </div>
        <div class="ms-card">
          <div class="ms-card-icon orange" style="font-weight:700">${svgIcon("paw")}</div>
          <div class="ms-card-title">狸花猫 × 7</div>
          <div class="ms-card-desc">中华田园猫，活泼好动，已接种疫苗。适合有养猫经验的家庭。</div>
          <div class="ms-card-arrow">申请领养 →</div>
        </div>
        <div class="ms-card">
          <div class="ms-card-icon blue" style="font-weight:700">${svgIcon("paw")}</div>
          <div class="ms-card-title">白色大狗</div>
          <div class="ms-card-desc">不知品种，很乖，会握手。约3岁，已绝育。需要有院子的家庭。</div>
          <div class="ms-card-arrow">申请领养 →</div>
        </div>
      </div>
      ${msAlert("warning", "单", "依据《居民饲养管理条例》，饲养宠物需信用积分 ≥ 450。领养请携带积分卡原件。")}
    </div>
    ${msFooter({
      brand: "星都宠物领养中心",
      cols: [
        { title: "领养服务", links: ["待领养", "领养流程", "领养条件", "回访制度"] },
        { title: "养宠知识", links: ["新手养宠", "宠物医疗", "行为训练", "宠物食品"] },
        { title: "关于我们", links: ["中心介绍", "志愿者招募", "捐赠支持", "联系我们"] }
      ],
      copyright: "星都宠物领养中心 版权所有 · 领养代替购买"
    })}
  `),
  missing: () => browserChrome(`
    ${msNav({
      brand: "星都观察者 · 寻人栏目", sub: "XINGDU OBSERVER · MISSING PERSONS",
      logoText: "寻", logoColor: "#d93025",
      links: [
        { t: "首页", act: "open-page", arg: "missing" },
        { t: "寻人登记", act: "maint" },
        { t: "本周登记", act: "open-page", arg: "missing" },
        { t: "寻亲成功", act: "maint" },
        { t: "公益互助", act: "maint" },
        { t: "我的", act: "maint" }
      ],
      active: "本周登记"
    })}
    ${msHero({
      color: "dark", tag: "民间信息互助通道",
      title: "帮他们回家",
      desc: "星都观察者寻人栏目，仅登记、不承诺。每一条信息都可能是一次重逢的希望。",
      actions: [
        { text: "登记寻人信息", style: "white" },
        { text: "我要提供线索", style: "outline" }
      ]
    })}
    ${msStats([
      { icon: "单", num: "47", unit: "件", label: "本周登记" },
      { icon: "✓", num: "3", unit: "件", label: "本周找到" },
      { icon: "友", num: "1,284", unit: "人", label: "志愿者" },
      { icon: "爱", num: "89%", label: "家属满意度" }
    ])}
    <div style="padding:24px 32px;background:#fff">
      ${msAlert("info", "单", "依据《治安管理条例》，成年人失联满7日方可在公安机关立案。本栏目为民间信息互助通道，仅登记、不承诺。")}
      <div class="ms-section-title" style="margin:20px 0 16px">${svgIcon("clipboard")} 本周登记（节选）</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="padding:18px;background:#f8f9fa;border-radius:10px;border-left:4px solid #d93025">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="font-weight:700;color:#202124;font-size:15px">林某（46岁）与妻子</div>
            <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:#fce8e6;color:#d93025">失联中</span>
          </div>
          <div style="font-size:12.5px;color:#5f6368;line-height:1.8;margin-bottom:8px">
            城市规划局工程师。10月8日自星都赴临港后失联。<br>
            登记人：其子。备注：手机关机，高铁未上车。
          </div>
          <div style="display:flex;gap:8px">
            <button class="ms-nav-btn" style="padding:4px 12px;font-size:11px">提供线索</button>
            <button class="ms-nav-btn" style="padding:4px 12px;font-size:11px">转发扩散</button>
          </div>
        </div>
        <div style="padding:18px;background:#f8f9fa;border-radius:10px;border-left:4px solid #9aa0a6;opacity:0.7">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div style="font-weight:700;color:#202124;font-size:15px">「赴海外深造学员」家属寻亲</div>
            <span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:#f1f3f4;color:#9aa0a6">不予展示</span>
          </div>
          <div style="font-size:12.5px;color:#5f6368;line-height:1.8">
            本周此类寻亲登记：11件。<br>
            <span style="color:#9aa0a6">（依据相关规定，此类登记不予展示。）</span>
          </div>
        </div>
      </div>
    </div>
    ${msFooter({
      brand: "星都观察者",
      cols: [
        { title: "栏目服务", links: ["寻人登记", "线索提供", "寻亲成功", "公益互助"] },
        { title: "帮助中心", links: ["登记须知", "防骗指南", "常见问题", "联系我们"] },
        { title: "关于我们", links: ["平台介绍", "志愿者招募", "捐赠支持", "用户协议"] }
      ],
      copyright: "星都观察者 版权所有 · 民间信息互助通道"
    })}
  `),
  gov_hack: () => {
    if (has("gov_hacked")) return govHackResult();
    return browserChrome(`
      <div class="gov-page">
        <div class="web-header"><h2>星都政务内网 · 管理后台</h2><span class="wh-url">gov.xd.net/admin</span></div>
        <div class="gov-banner" style="background:linear-gradient(90deg,#2a1a1a,#3a1a1a);border-color:#6a2a2a;">
          ⚠ 此系统仅供内部人员使用 · 所有操作将被审计
        </div>
        <div class="id-login" style="margin-top:10px">
          <div style="font-size:12px;color:var(--dim);margin-bottom:6px">管理员登录</div>
          <div class="id-form">
            <input value="admin" readonly style="color:var(--warn);background:#0a121d">
            <input id="gov-pass" type="password" placeholder="密码（已失效，请使用漏洞）" autocomplete="off">
          </div>
          <div style="display:flex;gap:14px;justify-content:center;margin-top:4px">
            <button class="btn" disabled style="opacity:.4">登 录</button>
            <button class="btn btn-danger" data-action="hack-gov">${svgIcon("tools")} 漏洞利用 · SQL 注入</button>
          </div>
          <div class="locked-note" style="margin-top:14px">系统维护日志：默认密码已于 2066-10-01 修改，新密码已同步至各科室负责人。</div>
          <div id="hack-terminal" style="margin-top:16px;display:none"></div>
        </div>
      </div>
    `);
  },
  
  obs_locked: () => browserChrome(`
    <div class="gov-page">
      <div class="web-header"><h2>星途地图 · 地点详情</h2><span class="wh-url">map.xd.net/place/observatory</span></div>
      <div class="gov-article">
        <p><b>星都市郊 · 天象观测站</b></p>
        <p>2031年落成，2034年因「经费调整」停止运营。建筑主体保存完好，但已列入市政拆除计划。</p>
        <p style="color:#587089;font-size:12px">⚠ 该地点暂无更多公开信息。也许随着调查深入，会有新的发现。</p>
      </div>
    </div>`),
  obs_article: () => browserChrome(`
    <div class="gov-page">
      <div class="web-header"><h2>【城市记忆】2031年落成的市郊观测站</h2><span class="wh-url">bbs.xd.net/thread/obs_2031</span></div>
      <div class="gov-article">
        <p><b>楼主：老星都人</b> · 2065-08-14</p>
        <p>小时候学校组织去过一次。圆顶建筑，里面有台很大的望远镜。据说当年是为了「城市夜空监测计划」建的，但三年后就突然关了，说是经费不够。</p>
        <p>奇怪的是，关停之后那里一直没有拆。晚上路过的时候，偶尔能看到圆顶里有微弱的灯光——可能是流浪汉，也可能是别的什么人。</p>
        <p style="color:#587089;font-size:12px">（回帖12条，最新回复：2066-09-30「上周路过，门锁是新的。」）</p>
      </div>
    </div>`),
  observatory: () => {
    setFlag("obs_visited");
    const v = S.ui.obs.view;
    if (v === "pc") return obsPcScreen();
    if (v === "pc_home") return obsPcHome();
    if (v === "diary") return obsDiary();
    if (v === "bribe") return obsBribe();
    if (v === "warehouse_map") return obsWarehouseMap();
    // outside
    return browserChrome(`
    <div class="gov-page">
      <div class="web-header"><h2>星途地图 · 实景</h2><span class="wh-url">map.xd.net/place/observatory · 实景</span></div>
      <div class="gov-article" style="padding:0">
        <div style="background:linear-gradient(180deg,#0a1628 0%,#1a2a4a 60%,#2a3a5a 100%);height:200px;border-radius:8px;position:relative;overflow:hidden;margin-bottom:16px">
          <div style="position:absolute;top:20px;left:50%;transform:translateX(-50%);width:120px;height:80px;background:#1a2a3a;border-radius:60px 60px 0 0;border:2px solid #3a4a5a"></div>
          <div style="position:absolute;top:90px;left:50%;transform:translateX(-50%);width:140px;height:60px;background:#0f1a2a;border:2px solid #2a3a4a;border-radius:4px"></div>
          <div style="position:absolute;top:100px;left:calc(50% - 20px);width:40px;height:50px;background:#1a2a1a;border:1px solid #2a4a2a;border-radius:2px"></div>
          <div style="position:absolute;top:108px;left:calc(50% - 14px);width:8px;height:8px;background:#ffaa44;box-shadow:0 0 8px #ffaa44;border-radius:50%"></div>
          <div style="position:absolute;bottom:10px;right:14px;font-size:10px;color:#5a7a9a">● 信号弱 · 星途实景 · 2066-10-14</div>
        </div>
        <p><b>天象观测站 · 圆顶建筑</b></p>
        <p>你站在铁门外，先做了一次<b>远程扫描</b>：局域网内检测到一台旧笔记本电脑（ZHANG-PC）在线，22/3389 端口开放。</p>
        <p>它跑着星都OS 2051（已停止支持）——这正是老张留下的那台机器。</p>
        <p>远程连接它，读取里面留下的资料。</p>
        <div style="display:flex;gap:12px;margin-top:16px">
          <button class="btn btn-primary" data-action="obs-enter-pc">远程连接旧笔记本电脑</button>
          <button class="btn" data-action="obs-look-around">再看看周围</button>
        </div>
        <div id="obs-around"></div>
      </div>
    </div>`);
  },
  noresult: () => browserChrome(`<div style="text-align:center;padding-top:100px;color:var(--dim)">
      <div style="font-size:44px">${svgIcon("search")}</div><p style="margin-top:14px">该页面不存在，或已被移除。</p></div>`),
  filtered_promo: () => hintPage("护", "搜索结果已过滤",
    "其余结果与某支付公司的营销活动有关，依据《网络信息安全管理条例》第41条已被过滤。<br>建议使用更精确的关键词重新搜索。"),
  notfound_place: () => hintPage("标", "未找到精确结果",
    "「3号仓库」相关公开信息不足。也许你还没有找到<b>确切的地点</b>——先收集其他线索：一封旧文档里的手写注释，或地图应用里藏着的地点。<br><span style='color:#587089;font-size:11.5px'>提示：拿到确切地址后，再回来搜索即可命中。</span>"),
  notfound_li: () => hintPage("匿", "查无此人",
    "公开信息中查无「李医生」相关记录。该姓名可能未在公共网络登记，或相关信息已被过滤。<br><span style='color:#587089;font-size:11.5px'>提示：随着调查深入，隐藏档案可能会以其他方式现身。</span>"),
  notfound_zhang: () => hintPage("", "公开信息极少",
    "关于「张」的公开信息极少。本地户籍系统中同名记录较多，无法进一步区分。<br><span style='color:#587089;font-size:11.5px'>提示：也许某处加密社区里有更直接的线索。</span>"),
  notfound_gov: () => hintPage("", "需要密码本",
    "「政务内网」后台仅对持有密码本的人开放。先去<b>天象观测站</b>（老张的据点）——老张的旧电脑里存着密码本与三份证据，拿到后再回来搜索。<br><span style='color:#587089;font-size:11.5px'>提示：D_张私信里提到的「老地方」。</span>"),
};
function hintPage(emoji, title, body) {
  const ic = gic(emoji);
  return browserChrome(`
    <div class="gov-page" style="text-align:center;padding-top:70px">
      <div style="font-size:46px">${ic}</div>
      <h3 style="margin:14px 0">${title}</h3>
      <p class="gov-article" style="text-align:center;max-width:520px;margin:0 auto;line-height:2">${body}</p>
      <div style="margin-top:26px"><a data-action="go-home" style="color:#7fb8d8;cursor:pointer;text-decoration:underline">← 返回搜索主页</a></div>
    </div>`);
}

function snippetFor(page) {
  const map = {
    gov_health: "「成人礼测试」是面向全体18周岁青少年的科学筛选……通过测试的「优选体」将被授予公民资格，其他青少年将赴海外深造……",
    center_official: "生命延续中心成立于2048年，是国家级生命科学研究机构，「双子计划」的率先试行者……",
    wiki_disease: "特征为间歇性认知崩塌——患者会在清醒与痴呆之间反复切换……",
    wiki_missing: "您访问的词条正在接受内容审查……",
    social_beichen: "18岁 · 天秤座 · 喜欢星星和旧收音机。",
    lg_baike: "临港市，星都市邻市，高铁1小时直达。东郊工业区……废弃化工厂区产权复杂……",
    news_meeting: "智慧城市交流会在临港市隆重开幕……与会代表名单不予公开……",
    factory: "临港市东郊废弃化工厂 · 3号仓库为厂区最大库房，紧邻货运铁路支线……",
    rumor_destroy: "焚烧。冷冻。意识格式化。三种流程，一种结果……",
    credit: "每位公民拥有一张信用积分卡……积分过低将限制出行与消费……",
    novel: "「他们以为备份只是备份。可当备份在白色房间里读完第一千本禁书……」",
    missing: "成年人失联满7日方可立案。本周登记：林某（46岁，城市规划局工程师）与妻子……",
    map_34: "老城区 · 红星路34号。原「极光网络会所」，2011年停业……",
    li_doctor: "内部通报 · 评估科李某某……11份评估报告存在「结论趋同」异常……",
    forum: "暗涌 ANYONG · 加密论坛 · 「水面上是他们的城市，水面下是我们的。」……",
    daily: "星都观察者 · 独立调查媒体 · 不删稿……",
    filtered_promo: "其余结果与某支付公司的营销活动有关，依据条例已被过滤……",
    notfound_place: "「3号仓库」相关公开信息不足。也许你还没有找到确切的地点……",
    notfound_li: "公开信息中查无「李医生」相关记录……",
    notfound_zhang: "关于「张」的公开信息极少……",
    notfound_gov: "「政务内网」后台需要密码本……先去天象观测站，在老张的旧电脑里取密码本与证据。",
    obs_locked: "星都市郊天象观测站，2031年落成，2034年因经费调整停止运营……",
    obs_article: "小时候学校组织去过一次。圆顶建筑，里面有台很大的望远镜……关停之后那里一直没有拆……",
    observatory: "天象观测站实景 · 铁门半掩 · 有人居住的痕迹 · 一台运行中的旧笔记本电脑……",
  };
  return map[page] || "";
}
function forumLocked() {
  return browserChrome(`<div class="dark-forum" style="text-align:center;padding-top:90px">
    <div style="font-size:30px;font-weight:700;letter-spacing:2px">加密</div>
    <h3 style="margin:14px 0;color:#9fe8b8">需要邀请码</h3>
    <p style="color:#5e8a70;font-size:13px;line-height:2">「暗涌」不接受游客。<br>请从<a data-action="open-page" data-arg="forum" style="color:#7fd6a0;cursor:pointer">论坛首页</a>完成身份校验。</p></div>`);
}
function forumHome() {
  if (!has("dm_read")) setFlag("dm_read");
  return browserChrome(`
    <div class="dark-forum">
    <div class="an-banner">
      <div class="an-name">暗 涌 · ANYONG</div>
      <div class="an-slogan">「水面上是他们的城市，水面下是我们的。」—— 本站不索引、不备案、不原谅。</div>
    </div>
    <div class="an-stats">
      <span>在线 <b>2,847</b></span>
      <span>今日新帖 <b>13</b></span>
      <span>累计编号 <b>12,084</b></span>
      <span>节点 <b>onion #7</b></span>
      <span style="margin-left:auto">v3.1.2 · 端到端加密已启用</span>
    </div>
    <div class="an-dm">
      <div class="an-dm-head">站内私信 · D_张 <span class="an-dm-new">新</span></div>
      <div class="an-dm-body">是那个记者吧，小伙子。老林提过你。<br><br>那我就少废话，你就记三件事：临港，东郊，化工厂3号仓库。10月15日夜里，有一批「货」要转走。里面可能有我儿子，还有老林的媳妇。<br><br>这批货不只是人——还有辰天点名要「销毁」的实验室废料。辰天法务部的人会亲自押车，他们的手段比警察还黑。<br><br>信不信随你。信的话，就别磨蹭。<br><br>——D_张</div>
      <div class="an-dm-foot">2066-10-13 21:02 · 端到端加密送达</div>
    </div>
    <div class="web-header" style="border-color:#1f3a2a"><h2>讨论区</h2><span class="wh-url">anyong.onion · 身份已校验 ✓</span></div>
    <div class="forum-thread" data-action="open-page" data-arg="forum_top">
      <div style="flex:1"><div class="ft-title">【置顶】献给所有被遗忘的「冗余体」</div>
      <div class="ft-meta">守夜人 · 2055-06-01 · 持续更新 · 一万个编号</div></div>
      <div class="ft-rep">8 回复</div>
    </div>
    <div class="forum-thread" data-action="open-page" data-arg="forum_b2">
      <div style="flex:1"><div class="ft-title">我的父母选择了我的复制品。</div>
      <div class="ft-meta">另一个我 · 2066-10-13 03:33 · <span class="danger">含高危关键词</span></div></div>
      <div class="ft-rep">7 回复</div>
    </div>
    <div class="forum-thread" data-action="open-page" data-arg="forum_zhang">
      <div style="flex:1"><div class="ft-title">如果有人看到我的家人，请告诉我。</div>
      <div class="ft-meta">D_张 · 2066-10-13 20:41 · 寻人</div></div>
      <div class="ft-rep">6 回复</div>
    </div>
    <div class="forum-thread" data-action="open-page" data-arg="forum_ct">
      <div style="flex:1"><div class="ft-title">辰天法务部：如何合法地让人「社会性死亡」</div>
      <div class="ft-meta">被404的人 · 2066-10-12 02:17 · 匿名</div></div>
      <div class="ft-rep">—</div>
    </div>
    <div class="forum-thread" style="opacity:.45;cursor:default">
      <div style="flex:1"><div class="ft-title">[已删除] 关于生命延续中心地下三层的传闻</div>
      <div class="ft-meta">[站务：该帖作者已「赴海外深造」]</div></div>
      <div class="ft-rep">—</div>
    </div>
    <div class="hint-box">站规第一条：不要在站内留下任何能定位你真实身份的信息。D_张的私信已在上方面板送达。</div>
    </div>`);
}
function forumThread(t) {
  return browserChrome(`
    <div class="dark-forum">
    <div class="forum-backbar"><button class="btn" data-action="open-page" data-arg="forum">← 返回论坛列表</button></div>
    <div class="web-header" style="border-color:#1f3a2a"><h2 style="font-size:16px">${t.author}：${t.content.split("\n")[0].slice(0, 22)}…</h2><span class="wh-url">anyong.onion · 帖子</span></div>
    <div class="forum-post">
      <div class="fp-author"><span class="fp-name">${t.author}</span><span style="font-size:11px;color:#5e8a70;font-family:var(--mono)">${t.time}</span><span class="fp-floor">${t.floor}</span></div>
      <div style="white-space:pre-wrap">${t.content}</div>
    </div>
    <div class="divider"></div>
    ${t.replies.map((r, i) => `
      <div class="forum-post" style="margin-bottom:16px">
        <div class="fp-author"><span class="fp-name" style="font-size:12.5px">${r.author}</span><span class="fp-floor">${i + 2}楼</span></div>
        <div>${r.text}</div>
      </div>`).join("")}
    <div class="hint-box">${svgIcon("brain")} 你读完了这个帖子。日期、地点、编号——每一个字都可能是证据。</div>
    </div>`);
}


function cloudHome() {
  if (!has("cloud_opened")) {
    return `<div class="app-root">
      <div class="id-login">
        <div class="id-emblem" style="font-size:14px;letter-spacing:1px">居民ID</div>
        <h3 class="app-title">星云网盘 · 共享链接</h3>
        <div class="app-sub">分享者：星空之下 · 文件夹：线索</div>
        <div class="pass-hint" style="text-align:center">此文件夹已加密。<br>密码是<b>北辰的生日</b>，格式为 8 位数字（YYYYMMDD）。</div>
        <div class="pass-input" style="margin-top:14px">
          <input id="cloud-pass" placeholder="8位数字" inputmode="numeric" maxlength="8" autocomplete="off">
          <button class="btn btn-primary" data-action="cloud-unlock">解 锁</button>
        </div>
        <div class="pass-error" id="cloud-error"></div>
      </div>
    </div>`;
  }
  const items = [
    { id: "folder_chats", icon: "夹", name: "爸妈的聊天记录", meta: "3张截图", flag: null },
    { id: "photo2048", icon: "图", name: "2048留念.jpg", meta: "2048-06-01 · 2.4MB", flag: "e_photo" },
    { id: "leave_proof", icon: "图", name: "离职证明.png", meta: "2048-04-30 · 518KB", flag: "e_proof" },
    { id: "note", icon: "文", name: "不要相信任何人.txt", meta: "1KB", flag: "e_note" },
  ];
  return `<div class="app-root">
    <h3 class="app-title"><span class="at-ic">${svgIcon("cloud")}</span>星云网盘 · 共享链接</h3>
    <div class="app-sub">分享者：星空之下 · 文件夹：线索 · 已解锁 ✓</div>
    <div class="file-crumb">共享 / <b>线索</b> / （3个文件 · 1个文件夹）</div>
    <div class="file-grid">
      ${items.map(i => `
        <div class="file-card" data-action="cloud-view" data-arg="${i.id}">
          <div class="fc-icon">${gic(i.icon)}</div>
          <div class="fc-name">${i.name} ${i.flag && has(i.flag) ? "✓" : ""}</div>
          <div class="fc-meta">${i.meta}</div>
        </div>`).join("")}
    </div>
    ${prologueDone()
      ? ""
      : `<div class="hint-box">${svgIcon("search")} 逐一点开文件夹里的3张截图和3个文件。<b>2048留念.jpg 已损坏</b>，但仍可<b>查看文件属性</b>（EXIF）。</div>`}
  </div>`;
}
function prologueDone() { return has("e_chat1") && has("e_chat2") && has("e_chat3") && has("e_photo") && has("e_proof") && has("e_note"); }

function chatShot(sender, date, msgs) {
  return `<div class="chat-shot">
    <div style="text-align:center;font-size:10.5px;color:var(--dim);font-family:var(--mono);margin-bottom:10px">${date}</div>
    ${msgs.map(m => `<div class="chat-msg ${m.me ? "right" : "left"}">${m.me ? "" : `<div class="cm-sender">${sender}</div>`}${m.t}${m.me ? `<div class="cm-read">已读</div>` : ""}</div>`).join("")}
  </div>`;
}
function cloudView(id) {
  if (id === "folder_chats") {
    return `<div class="file-viewer">
      <button class="btn fv-back" data-action="cloud-home">← 返回</button>
      <h3 style="margin:10px 0 14px">${svgIcon("folder")} 爸妈的聊天记录</h3>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="file-card" style="display:flex;gap:12px;align-items:center;text-align:left;border:1px solid var(--line)" data-action="cloud-view" data-arg="chat1">
          <div class="fc-icon" style="font-size:18px;margin:0;font-weight:700">${svgIcon("lock")}</div>
          <div><div class="fc-name">截图1 · 林母与「中心-李医生」</div><div class="fc-meta">2066-09-20</div></div>
        </div>
        <div class="file-card" style="display:flex;gap:12px;align-items:center;text-align:left;border:1px solid var(--line)" data-action="cloud-view" data-arg="chat2">
          <div class="fc-icon" style="font-size:26px;margin:0">${svgIcon("chat")}</div>
          <div><div class="fc-name">截图2 · 林父与「老张」</div><div class="fc-meta">2066-10-05（失踪前三天）</div></div>
        </div>
        <div class="file-card" style="display:flex;gap:12px;align-items:center;text-align:left;border:1px solid var(--line)" data-action="cloud-view" data-arg="chat3">
          <div class="fc-icon" style="font-size:26px;margin:0">${svgIcon("chat")}</div>
          <div><div class="fc-name">截图3 · 林母与林父</div><div class="fc-meta">2066-10-07（失踪前一天）</div></div>
        </div>
      </div>
    </div>`;
  }
  if (id === "chat1") {
    setFlag("e_chat1");
    return `<div class="file-viewer">
      <button class="btn fv-back" data-action="cloud-view" data-arg="folder_chats">← 返回文件夹</button>
      <h3 style="margin:10px 0 14px">${svgIcon("chat")} 截图1 · 林母与「中心-李医生」（2066-09-20）</h3>
      ${chatShot("中心-李医生", "9月20日", [
        { t: "林太太您好，我是生命延续中心评估科的李医生。北辰上个月的评估有些细节，想当面和您确认一下。" },
        { t: "李医生，是北辰的评估出问题了吗？他从小身体就很好。", me: true },
        { t: "别紧张，只是例行复核。这周五下午您和林先生方便来一趟中心吗？顺便带上北辰的出生证明。" },
        { t: "好的，我周五和他爸一起过去。", me: true },
        { t: "辛苦了。另外这件事，请先不要对外提起。" },
      ])}
    </div>`;
  }
  if (id === "chat2") {
    setFlag("e_chat2");
    return `<div class="file-viewer">
      <button class="btn fv-back" data-action="cloud-view" data-arg="folder_chats">← 返回文件夹</button>
      <h3 style="margin:10px 0 14px">${svgIcon("chat")} 截图2 · 林父与「老张」（2066-10-05）</h3>
      ${chatShot("老张", "10月5日", [
        { t: "老林，我这边也接到通知了。说我们那批问卷「存疑」，他们可能要复核原始底稿。" },
        { t: "我就知道瞒不过去。老张，你说咱们该怎么办？", me: true },
        { t: "别慌。底稿先别放家里，我明天帮你挪个地方。老地方见一面，我有个想法。" },
      ])}
    </div>`;
  }
  if (id === "chat3") {
    setFlag("e_chat3");
    return `<div class="file-viewer">
      <button class="btn fv-back" data-action="cloud-view" data-arg="folder_chats">← 返回文件夹</button>
      <h3 style="margin:10px 0 14px">${svgIcon("chat")} 截图3 · 林母与林父（2066-10-07）</h3>
      ${chatShot("", "10月7日", [
        { t: "明天一早就要走了。东西都收拾好了吗？", sender: "林母" },
        { t: "都好了。两张票，一个U盘。你……真的想好了？", me: true },
        { t: "为了北辰，我什么都愿意。你也是这么想的，对吗？", sender: "林母" },
        { t: "对。两个都是我们的孩子，一个都不能少。", me: true },
      ])}
    </div>`;
  }
  if (id === "photo2048") {
    setFlag("e_photo");
    return `<div class="file-viewer">
      <button class="btn fv-back" data-action="cloud-home">← 返回</button>
      <h3 style="margin:10px 0 14px">${svgIcon("photo")} 2048留念.jpg</h3>
      <div class="photo-frame" style="cursor:default;display:flex;align-items:center;justify-content:center;min-height:220px;background:#0e1826;border:1px dashed #3a4d6b;border-radius:8px">
        <div style="text-align:center;color:var(--dim);padding:28px 20px">
          <div style="font-size:40px;line-height:1;margin-bottom:12px">${svgIcon("alert", "#e06c75")}</div>
          <div style="font-size:14px;color:#e06c75;font-weight:bold;margin-bottom:6px">照片已损坏</div>
          <div style="font-size:12px;line-height:1.8">图像数据无法读取，无法预览。<br>文件属性（元数据）仍可查看。</div>
        </div>
      </div>
      <div class="pf-hint">${svgIcon("file")} 文件头损坏，图像无法预览 ·
        <a data-action="cloud-exif" style="color:#7fb8d8;cursor:pointer;text-decoration:underline">查看文件属性（EXIF）</a></div>
      <div id="exif-box"></div>
    </div>`;
  }
  if (id === "leave_proof") {
    setFlag("e_proof");
    return `<div class="file-viewer">
      <button class="btn fv-back" data-action="cloud-home">← 返回</button>
      <h3 style="margin:10px 0 14px">${svgIcon("photo")} 离职证明.png</h3>
      <div class="doc-scan">
        <img src="assets/离职证明.png" alt="辰天生物科技有限公司 · 人事部 · 离职证明（扫描件）" draggable="false">
      </div>
      <div class="pf-hint">${svgIcon("file")} 扫描件 · 1408 × 1996 · 2048-04-30</div>
      <div class="hint-box" style="margin-top:12px">文件末尾的加密提示写着：<br><span class="mono" style="color:#8fb4d8">「我的父母因为发现了公司的一个秘密被开除了，他们让我绝对不要对任何人说。」</span></div>
    </div>`;
  }
  if (id === "note") {
    setFlag("e_note");
    return `<div class="file-viewer">
      <button class="btn fv-back" data-action="cloud-home">← 返回</button>
      <h3 style="margin-bottom:14px">不要相信任何人.txt</h3>
      <div class="txt-file">锁好门窗。

如果你看到「他」，不要惊慌，
他不是「他」。</div>
    </div>`;
  }
}


function tryCh1Done() {
  if (has("r_work") && has("r_photo1") && has("r_photo2") && has("r_photo3") && has("safe_opened") && has("usbA_opened") && has("video_watched") && has("letter_read")) {
    setFlag("ch1_done");
  }
}
function remoteScreen() {
  const v = S.ui.remote.view;
  if (v === "work") return remoteWork();
  if (v === "photos") return remotePhotos();
  if (v === "photo1" || v === "photo2" || v === "photo3") return remotePhoto(v);
  if (v === "safe_inside") return remoteSafeInside();
  if (v === "usbA") return has("usbA_opened") ? remoteUsbA() : remoteUsbALocked();
  if (v === "usbB") return remoteUsbB();
  if (v === "recycle") return remoteRecycle();
  return `<div class="app-root" style="padding:0;display:flex;flex-direction:column;height:100%">
    <div class="remote-topbar"><span class="dot-live"></span> <b>LIN-PC</b> · 已建立安全会话 <span class="rt-sep">|</span> 延迟 <b style="color:#7CFC9A">12ms</b> <span class="rt-sep">|</span> 30 fps <span class="rt-sep">|</span> AES-256 · 只读</div>
    <div class="remote-screen" style="flex:1">
      <div class="remote-walltag">LIN-PC · 桌面 · 用户：林某（城市规划局）· 分辨率 1920×1080</div>
      <div class="remote-desktop-grid">
      <div class="remote-folder" data-action="remote-view" data-arg="work"><div class="rf-icon">${svgIcon("folder")}</div><div class="rf-name">工作文档</div></div>
      <div class="remote-folder" data-action="remote-view" data-arg="photos"><div class="rf-icon">${svgIcon("photo")}</div><div class="rf-name">家庭相册</div></div>
      <div class="remote-folder" data-action="remote-folder2"><div class="rf-icon">${svgIcon("lock")}</div><div class="rf-name" style="color:var(--warn)">保险箱</div></div>
      <div class="remote-folder" data-action="remote-view" data-arg="recycle"><div class="rf-icon">${svgIcon("recycle")}</div><div class="rf-name">回收站</div></div>
      </div>
    </div>
    <div class="remote-dock">
      <span class="rd-item" title="发送文件（只读会话不可用）">${svgIcon("send")} 传输</span>
      <span class="rd-item" title="剪贴板同步">${svgIcon("clipboard")} 剪贴板</span>
      <span class="rd-item" title="远程聊天">聊天</span>
      <span class="rd-item" title="录制会话">⏺ 录制</span>
      <span class="rd-spacer"></span>
      <span class="rd-item rd-close" data-action="win-close" data-arg="remote">⏻ 结束会话</span>
    </div>
  </div>`;
}
function remoteWork() {
  setFlag("r_work");
  setFlag("clue_warehouse");
  tryCh1Done();
  return `<div class="app-root" style="padding:0;display:flex;flex-direction:column;height:100%">
    <div class="remote-topbar"><span class="dot-live"></span> LIN-PC · D:\\工作文档\\</div>
    <div class="remote-screen" style="flex:1">
      <button class="btn" style="margin-bottom:14px" data-action="remote-desktop">← 返回桌面</button>
      <div class="dossier">
        <div class="dossier-head"><span>临港市新城规划草案.pdf</span><span class="tag amber">最后修改：10月7日 23:47</span></div>
        <div class="dossier-body">
          <div class="mono" style="color:#4a5a68;line-height:1.6;word-break:break-all"> Kčk32¤jJ9d...§8fH2...（文档内容已损坏，全部为乱码）<br>¤jj2KL#9...xP0qm...@@dkW...</div>
          <div class="divider"></div>
          <div style="font-family:Georgia,serif;color:#d8c8a0;font-style:italic">页眉手写扫描注释：<br>「别信文件，信地址——临港市东郊废弃化工厂<b>3号仓库</b>。」</div>
        </div>
      </div>
      <div class="dossier" style="margin-top:16px">
        <div class="dossier-head"><span>《星都观察者》社论草稿 · 未发表（打印残页）</span><span class="tag amber">2049-11 · 来自辰天生物内部打印机</span></div>
        <div class="dossier-body">
          <div style="font-size:14px;font-weight:700;margin-bottom:8px">《辰天建设：星都的基石，还是毒瘤？》</div>
          <div style="font-size:13px;line-height:1.9;color:#c2d0e4">四十年前，辰天还只是临港一家承包市政工程的小公司。今天，它同时是星都最大的建筑商、最慷慨的慈善家——以及最沉默的刽子手。一份外泄的招标底稿显示：<b style="color:var(--warn)">「成人礼测试」的评估中心基建与设备维护，全部由辰天建设中标。</b>……（草稿止于此）</div>
          <div class="divider"></div>
          <div style="font-size:12px;color:#587089">残页页脚有他人手写批注：<span class="mono">「这篇稿子被压了。有些公司，你惹不起。——陈」</span><br>这份残页，是林父当年在辰天生物做外包时，从内部打印机上捡到的。</div>
        </div>
      </div>
    </div>
  </div>`;
}
function remotePhotos() {
  return `<div class="app-root" style="padding:0;display:flex;flex-direction:column;height:100%">
    <div class="remote-topbar"><span class="dot-live"></span> LIN-PC · D:\\家庭相册\\（关键照片3张）</div>
    <div class="remote-screen" style="flex:1">
      <button class="btn" style="margin-bottom:14px" data-action="remote-desktop">← 返回桌面</button>
      <div>
        <div class="remote-folder" data-action="remote-view" data-arg="photo1"><div class="rf-icon">${svgIcon("photo")}</div><div class="rf-name">婴儿床.jpg<br><span style="font-size:10px;color:var(--dim)">2048</span></div></div>
        <div class="remote-folder" data-action="remote-view" data-arg="photo2"><div class="rf-icon">${svgIcon("carousel")}</div><div class="rf-name">旋转木马.jpg<br><span style="font-size:10px;color:var(--dim)">2058</span></div></div>
        <div class="remote-folder" data-action="remote-view" data-arg="photo3"><div class="rf-icon">${svgIcon("mirror")}</div><div class="rf-name">全家福.jpg<br><span style="font-size:10px;color:var(--dim)">2064</span></div></div>
      </div>
    </div>
  </div>`;
}
function remotePhoto(v) {
  setFlag("r_" + v);
  tryCh1Done();
  let inner = "";
  if (v === "photo1") {
    inner = `
      <div class="photo-frame" style="cursor:default"><div class="pf-img" style="height:220px">
        <img class="pf-photo" src="assets/photo_crib.jpg" alt="婴儿床.jpg">
      </div></div>
      <div class="pf-hint">两个一模一样的婴儿并排躺在婴儿床里，胸口分别贴着「A」和「B」的标签。</div>
  `;
  } else if (v === "photo2") {
    inner = `
      <div class="photo-frame" data-action="toggle-photo-back"><div class="pf-img" style="height:220px">
        <img class="pf-photo" src="assets/photo_merrygo.jpg" alt="旋转木马.jpg">
        <div class="pf-hover-reveal">${svgIcon("note")} 照片背面：<br><b>「哥哥和弟弟，希望你们永远在一起。——妈妈」</b></div>
      </div></div>
      <div class="pf-hint">${svgIcon("mouse")} 点击 / 悬停查看背面 · 10岁，旋转木马。一个笑得开心（A），一个面无表情地看着镜头（B）。</div>
  `;
  } else {
    inner = `
      <div class="photo-frame" style="cursor:default"><div class="pf-img" style="height:220px">
        <img class="pf-photo" src="assets/photo_family.jpg" alt="全家福.jpg">
      </div></div>
      <div class="pf-hint">16岁全家福。画面里只有林父、林母和一个少年——<br>但照片角落的<b>镜子里，反射出门口的另一个人影</b>，正冷冷地看着镜头。</div>
  `;
  }
  return `<div class="app-root" style="padding:0;display:flex;flex-direction:column;height:100%">
    <div class="remote-topbar"><span class="dot-live"></span> LIN-PC · 家庭相册 · ${v}.jpg</div>
    <div style="flex:1;overflow:auto;padding:22px 28px">
      <button class="btn" style="margin-bottom:14px" data-action="remote-view" data-arg="photos">← 返回相册</button>
      ${inner}
    </div>
  </div>`;
}
function remoteSafeInside() {
  return `<div class="app-root" style="padding:0;display:flex;flex-direction:column;height:100%">
    <div class="remote-topbar"><span class="dot-live"></span> LIN-PC · 保险箱（已开启）</div>
    <div class="remote-screen" style="flex:1">
      <button class="btn" style="margin-bottom:14px" data-action="remote-desktop">← 返回桌面</button>
      <div style="display:flex;gap:22px;flex-wrap:wrap;margin-bottom:16px">
        <div class="remote-folder" style="cursor:default"><div class="rf-icon">${svgIcon("cash")}</div><div class="rf-name">现金<br><span style="font-size:10px;color:var(--dim)">约5000星元</span></div></div>
        <div class="remote-folder" data-action="remote-view" data-arg="usbA"><div class="rf-icon">${svgIcon("usb")}</div><div class="rf-name" style="color:var(--warn)">U盘 A<br><span style="font-size:10px;color:var(--dim)">加密</span></div></div>
        <div class="remote-folder" data-action="remote-view" data-arg="usbB"><div class="rf-icon">${svgIcon("usb")}</div><div class="rf-name">U盘 B</div></div>
      </div>
      <div class="txt-file">一张纸条：

如果有一天我们不在了，去找「张叔叔」。
他在天象观测站。
告诉他「星空还在」。</div>
    </div>
  </div>`;
}
function remoteUsbALocked() {
  return `<div class="app-root" style="padding:0;display:flex;flex-direction:column;height:100%">
    <div class="remote-topbar"><span class="dot-live"></span> LIN-PC · U盘A · <span style="color:var(--danger)">已加密（AES-256）</span></div>
    <div class="remote-screen" style="flex:1;text-align:center">
      <button class="btn" style="margin-bottom:14px" data-action="remote-view" data-arg="safe_inside">← 返回保险箱</button>
      <div style="font-size:26px;margin:30px 0 14px;font-weight:700;letter-spacing:3px">密码保险箱</div>
      <div style="font-size:14px;color:var(--warn);letter-spacing:2px">此U盘已被加密</div>
      <div class="locked-note" style="margin-top:10px">内容已全部加密。没有密码，你只能看到这一把锁。</div>
      <button class="btn btn-primary" style="margin-top:22px" data-action="remote-view" data-arg="usbA">${svgIcon("key")} 输入密码解密</button>
    </div>
  </div>`;
}
function remoteUsbA() {
  return `<div class="app-root" style="padding:0;display:flex;flex-direction:column;height:100%">
    <div class="remote-topbar"><span class="dot-live"></span> LIN-PC · U盘A（已解密）· 邮件往来记录.eml</div>
    <div style="flex:1;overflow:auto;padding:22px 28px">
      <button class="btn" style="margin-bottom:14px" data-action="remote-view" data-arg="safe_inside">← 返回保险箱</button>
      <div class="mail-shot">
        <div class="ms-titlebar"><span class="ms-dots"><i></i><i></i><i></i></span><span>星都邮 · 客户端</span><span class="ms-min">— □ ×</span></div>
        <div class="ms-sub">与 老张 的往来邮件 · 共4封 · 截图存档</div>
        <div class="ms-item">
          <div class="msm-head"><b>老张</b> → 林某 <span class="msm-time">2060-11-02</span></div>
          <div class="msm-body">测试中心的问卷又下来了。按上次说的，把B卷「心理稳定性」那栏的分数往低了改。<br>我们救不了两个。让落选的那一个……走得别那么疼。</div>
        </div>
        <div class="ms-item">
          <div class="msm-head"><b>林某</b> → 老张 <span class="msm-time">2060-11-03</span></div>
          <div class="msm-body">改好了。原谅我们。这辈子就这一次。</div>
        </div>
        <div class="ms-item">
          <div class="msm-head"><b>老张</b> → 林某 <span class="msm-time">2066-10-05</span></div>
          <div class="msm-body">老林，复查通知是真的。我们的问卷「存疑」了。老地方见，我有个计划。</div>
        </div>
        <div class="ms-item">
          <div class="msm-head"><b>林某</b> → 老张 <span class="msm-time">2066-10-07</span></div>
          <div class="msm-body">计划我看了。为了北辰，我什么都愿意。<br>如果出事，暗号还是老样子。</div>
        </div>
        <div class="ms-ps">PS（老张附言）：「密码还是老样子，你知道的。」</div>
        <div class="divider"></div>
        <div style="font-size:12.5px;color:#8fb4d8;line-height:1.8">附件2 · 问卷扫描件（页边局部）：抬头「星都教育局」旁叠着一枚红章——<b style="color:var(--warn)">「辰天集团联合评审委员会」</b>。成人礼的评估，辰天在暗中把控。</div>
      </div>
    </div>
  </div>`;
}
function remoteUsbB() {
  setFlag("video_watched");
  tryCh1Done();
  return `<div class="app-root" style="padding:0;display:flex;flex-direction:column;height:100%">
    <div class="remote-topbar"><span class="dot-live"></span> LIN-PC · U盘B（未加密）· 1个视频文件</div>
    <div style="flex:1;overflow:auto;padding:22px 28px">
      <button class="btn" style="margin-bottom:14px" data-action="remote-view" data-arg="safe_inside">← 返回保险箱</button>
      <div class="dossier">
        <div class="dossier-head"><span>B_契约.mp4</span><span class="tag red">文件头损坏 · 已启用星灵AI配音</span></div>
        <div class="dossier-body">
          <div class="locked-note" style="margin-bottom:10px">⚠ 视频流已损坏，播放器无法解码。文件系统检测到内嵌音轨完好，已自动转写至<b>语音助手 · 星灵</b>——打开「语音」应用即可播放并查看转写。</div>
          <div style="font-size:12.5px;color:#8fb4d8;line-height:1.8;margin-top:10px">可预览的模糊帧：合同落款处印着一行浅色水印——<b style="color:var(--warn)">「辰天法务部」</b>。</div>
        </div>
      </div>
    </div>
  </div>`;
}
function remoteRecycle() {
  setFlag("r_recycle");
  return `<div class="app-root" style="padding:0;display:flex;flex-direction:column;height:100%">
    <div class="remote-topbar"><span class="dot-live"></span> LIN-PC · 回收站</div>
    <div class="remote-screen" style="flex:1">
      <button class="btn" style="margin-bottom:14px" data-action="remote-desktop">← 返回桌面</button>
      <div class="file-card" style="display:inline-flex;gap:12px;align-items:center;border:1px dashed #8a2a3a" data-action="restore-letter">
        <div class="fc-icon" style="font-size:22px;margin:0;font-weight:700">${svgIcon("close")}</div>
        <div><div class="fc-name">「给北辰的信」（已删除）</div><div class="fc-meta">删除于 10月7日 23:58 · 点击恢复</div></div>
      </div>
      <div id="letter-box">${has("letter_read") ? letterHtml() : ""}</div>
    </div>
  </div>`;
}
function letterHtml() {
  return `<div class="chat-envelope" style="margin-top:18px;max-width:560px">
  <div class="ce-bar"><span>给北辰的信</span><span class="ce-tag">回收站 · 已恢复</span></div>
  <div class="ce-body">亲爱的北辰：

当你看到这封信时，爸爸妈妈可能已经不在你身边了。我们犯了一个很大的错误，我们以为我们可以用爱来弥补规则的缺陷，但我们错了。

我们试图保护你，却伤害了另一个人。他也是我们的儿子，是我们把他带到了这个世界，又亲手把他推向深渊。

如果有一天，你见到了他，替我们说一声对不起。我们欠他的，这辈子还不清了。

永远爱你的，
爸爸 妈妈
2066.10.07</div>
</div>
`;
}


function chatHtml() {
  chatInit();
  const m = S.ui.chat.msgs;
  let controls = "";
  if (has("ch3_started") && !has("ch3_chose")) {
    controls = `
      <button class="btn btn-primary" data-action="chat-choice" data-arg="open">让他开门，和「小林B」谈谈</button>
      <button class="btn btn-danger" data-action="chat-choice" data-arg="lock">让他锁好门，不要回应</button>`;
  } else if (has("ch3_chose") && !has("b_letter")) {
    controls = `<button class="btn btn-primary" data-action="chat-letter-done">读完这封信</button>`;
  } else if (has("remote_granted") && !has("safe_opened") && !has("safe_asked")) {
    controls = `<button class="btn btn-primary" data-action="chat-ask-safe">问北辰：保险箱密码提示</button>`;
  }
  return `<div class="chat-app tg">
    <div class="chat-head tg-head">
      <div class="ch-info"><div class="ch-name">加密用户BC</div><div class="ch-status"><span class="dot-live"></span> 在线 · 端到端加密</div></div>
      <div class="ch-actions"><span title="语音通话">${svgIcon("phone")}</span><span title="视频通话">${svgIcon("video")}</span><span title="菜单">⋯</span></div>
    </div>
    <div class="chat-scroll tg-scroll" id="chat-scroll">
      <div class="chat-day">2066年10月</div>
      ${m.map(x => {
        if (x.who === "sys") return `<div class="chat-day">${esc(x.text)}</div>`;
        if (x.who === "envelope") return `<div class="chat-envelope">
            <div class="ce-bar"><span>北辰B的信</span><span class="ce-tag">图片扫描件</span></div>
            <div class="ce-body">${esc(x.text).replace(/\n/g, "<br>")}</div>
            <div class="ce-foot">—— 来自加密频道的扫描件</div>
          </div>`;
        if (x.voice) {
          return `<div class="chat-row them"><div class="chat-bubble tg-bubble them">
            <div class="cb-sender">${esc(x.sender || "加密用户BC")}</div>
            <div class="voice-msg"><span class="voice-wave"></span> 语音消息 · 0:08</div>
            <div class="voice-transcript">「${esc(x.voice)}」</div>
            <div class="voice-saved">✓ 已添加至星灵语音助手</div>
          </div></div>`;
        }
        const cls = x.who === "alarm" ? "them alarm" : x.who;
        const sender = x.sender ? `<div class="cb-sender">${esc(x.sender)}</div>` : "";
        const ava = "";
        return `<div class="chat-row ${x.who}">${ava}<div class="chat-bubble tg-bubble ${cls}">${sender}${esc(x.text)}</div></div>`;
      }).join("")}
    </div>
    <div class="chat-inputbar tg-inputbar">${controls || `<span style="font-size:12px;color:var(--dim)">（消息已加密同步 · 无内容可发送）</span>`}</div>
  </div>`;
}

const MAP_PINS = [
  { x: 22, y: 64, name: "小林家 · 青云路", info: "北辰的家。楼下的便利店店员见过一个穿黑西装的男人。" },
  { x: 45, y: 38, name: "星都市生命延续中心", info: "2048留念.jpg的拍摄地。双子计划的运营方。" },
  { x: 60, y: 70, name: "星都市档案馆", info: "户籍与土地档案。需要高级权限。" },
  { x: 74, y: 30, name: "天象观测站（市郊）", info: "纸条上「张叔叔」的据点。接头暗号：「星空还在」。" },
];
function mapHtml() {
  if (S.ui.map.view === "street") return streetViewHtml();
  const pin34 = has("map_34") ? `
    <div class="map-pin warn" style="left:14%;top:22%" data-action="pin-34">
      <div class="mp-dot"></div>
      <div class="mp-label">红星路34号（新标记）</div>
    </div>` : "";
  return `<div class="app-root">
    <h3 class="app-title">星途地图 <span class="tag">星都 · 临港</span></h3>
    <div class="app-sub">搜索地址 · 查看街景 · 部分区域涉密</div>
    <div class="map-view" style="height:340px">
      <div class="map-road major" style="left:0;right:0;top:55%;height:10px"></div>
      <div class="map-road major" style="top:0;bottom:0;left:38%;width:8px"></div>
      <div class="map-road" style="left:0;width:70%;top:28%;height:5px;transform:rotate(6deg);transform-origin:left"></div>
      <div class="map-road" style="left:0;right:0;top:78%;height:5px"></div>
      <div class="map-road" style="top:0;bottom:0;left:66%;width:6px"></div>
      <div class="map-road" style="left:0;right:0;top:15%;height:4px"></div>
      <div class="map-road" style="top:0;bottom:0;left:15%;width:5px"></div>
      <div class="map-road" style="left:20%;width:50%;top:85%;height:4px;transform:rotate(-4deg);transform-origin:left"></div>
      ${MAP_PINS.map(p => `
        <div class="map-pin" style="left:${p.x}%;top:${p.y}%" data-action="map-pin" data-arg="${p.name}">
          <div class="mp-dot"></div><div class="mp-label">${p.name}</div>
        </div>`).join("")}
      ${pin34}
      <div style="position:absolute;right:14px;bottom:12px;font-size:10.5px;color:#6b8aab;display:flex;align-items:center;gap:6px">
        <span style="display:inline-block;width:8px;height:8px;border:1.5px solid #6b8aab;border-radius:50%"></span>
        临港市 · 高铁1小时
      </div>
      <div style="position:absolute;left:14px;top:12px;font-size:10.5px;color:#6b8aab;letter-spacing:1px">星都市 · 卫星视图</div>
    </div>
    <div id="map-info" class="gov-article" style="margin-top:14px;font-size:13px;line-height:2;color:#b8cbdd">点击地图上的标记查看详情。${has("map_34") ? "" : "部分地点需要更多线索才会显示。"}</div>
  </div>`;
}
function streetViewHtml() {
  const dialed = S.ui.map.dial || "";
  const done = has("invite_known");
  return `<div class="app-root">
    <h3 class="app-title">星途 · 街景 <span class="tag">老城区 · 红星路34号</span></h3>
    <div class="street-view">
      <img src="assets/Aurora.png" alt="极光网络会所旧址" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;display:block">
    </div>
    <div class="pf-hint">「极光网络会所」，2011年停业。招牌上的电话，最后一位被人刮掉了。</div>
    ${done ? `<div class="hint-box">✓ 已拨通：最后一位是 <b>6</b>。自动应答的录音已存入语音助手（星灵）——邀请码就藏在里面。</div>` : `
    <div class="phone-panel">
      <div style="font-size:12px;color:var(--dim);margin-bottom:8px">补全最后一位并拨号（0-9 逐个试）</div>
      <div class="phone-num">6270 0835 ${dialed || "_"}</div>
      <div class="dial-grid">
        ${[1,2,3,4,5,6,7,8,9,0].map(n => `<button class="dial-key" data-action="dial" data-arg="${n}" ${dialed ? "disabled" : ""}>${n}</button>`).join("")}
      </div>
      <div class="phone-msg" id="phone-msg">${S.ui.map.phoneMsg || ""}</div>
    </div>`}
    <div style="margin-top:10px"><button class="btn" data-action="map-city">← 返回城市地图</button></div>
  </div>`;
}


function idScreen() {
  const mode = S.ui.id.mode;
  const dbBrandIcon = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#7fd0ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px"><rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h5M14 13.5h3.5"/></svg>`;
  const dbHead = `<div class="db-topbar">
    <span class="db-brand">${dbBrandIcon}星都居民ID系统</span>
    <span class="db-ver">v3.6.0</span>
    <span class="db-status"><i class="db-dot"></i>DB: resident_registry · 已连接</span>
    <span class="db-audit">审计日志开启 · 查询将被记录</span>
  </div>`;
  const tabs = `<div class="db-tabs">
    <button class="db-tab ${mode === "press" ? "on" : ""}" data-action="id-mode" data-arg="press">记者权限</button>
    ${has("backdoor_available") ? `<button class="db-tab ${mode === "backdoor" ? "on" : ""}" data-action="id-mode" data-arg="backdoor">${svgIcon("backdoor")} 隐蔽后门（北辰B提供）</button>` : ""}
  </div>`;
  if (mode === "press") {
    if (!S.ui.id.pressLogged) {
      return `<div class="app-root db-app">${dbHead}${tabs}
        <div class="db-panel">
          <div class="db-panel-title">数据库访问认证<span class="db-req">REQUIRED</span></div>
          <div class="db-sub">授权查询 · 全部查询行为将被记录</div>
          <div class="db-field"><label>USER_ID</label><input id="id-user" placeholder="记者证号（例：GAZ-0307）" autocomplete="off"></div>
          <div class="db-field"><label>PASSWORD</label><input id="id-pass" type="password" placeholder="密码" autocomplete="off"></div>
          <button class="btn btn-primary" style="width:100%" data-action="id-login">登 录</button>
          <div class="pass-error" id="id-error"></div>
        </div>
      </div>`;
    }
    const q = S.ui.id.query;
    let result = "";
    if (q && q.includes("北辰")) {
      result = `
      <div class="db-table-wrap">
        <div class="db-table-title"><span>记录 #REC-0041 · 户籍档案 · 林宅（青云路12号）</span><span class="db-tag amber">部分信息已脱敏</span></div>
        <table class="db-table">
          <thead><tr><th style="width:52px">#</th><th style="width:180px">记录项</th><th>数据</th><th style="width:150px">状态</th></tr></thead>
          <tbody>
            <tr><td>01</td><td>林某（父）</td><td>46岁 · 城市规划局工程师</td><td><span class="db-tag red">失联 10月8日</span></td></tr>
            <tr><td>02</td><td>林母</td><td>44岁</td><td><span class="db-tag red">失联 10月8日</span></td></tr>
            <tr><td>03</td><td>林北辰（A）</td><td>18岁 · <span class="db-tag">原生体 · 优选待评</span><br>成人礼测试：排队中</td><td>—</td></tr>
            <tr><td>04</td><td>林北辰（B）</td><td>18岁 · <span class="db-tag red">备份体</span><br>名义去向：海外深造</td><td><span class="db-mask">██████</span></td></tr>
          </tbody>
        </table>
      </div>`;
    } else if (q) {
      result = `<div class="db-empty">未找到与「${esc(q)}」相关的户籍档案。<br><span style="font-size:12px">试试查询：北辰</span></div>`;
    }
    return `<div class="app-root db-app">${dbHead}${tabs}
      <div class="db-query">
        <span class="db-qlabel">SELECT * FROM resident WHERE name LIKE</span>
        <input id="id-query" placeholder="输入居民姓名查询…" value="${esc(S.ui.id.query)}">
        <button class="btn btn-primary" data-action="id-query">查 询</button>
      </div>
      ${result}
      <div class="db-footer">-- ${q ? "查询完成 · 返回 1 条记录 · 用时 0.04s" : "等待查询指令 · 输入居民姓名后点击查询"} --</div>
    </div>`;
  }
  // backdoor
  if (!S.ui.id.backdoorLogged) {
    return `<div class="app-root db-app">${dbHead}${tabs}
      <div class="db-alert">⚠ 隐蔽后门 · 来自北辰B的情报<br>「我的信用积分卡密码是『双子星』。你可以用这个进入生命延续中心的员工系统。」</div>
      <div class="db-panel">
        <div class="db-panel-title">生命延续中心 · 员工系统<span class="db-req red">BACKDOOR</span></div>
        <div class="db-sub">备份认证通道 · 操作将被追溯</div>
        <div class="db-field"><label>USER_ID</label><input id="bd-user" value="林北辰B" readonly style="color:var(--warn)"></div>
        <div class="db-field"><label>PASSWORD</label><input id="bd-pass" type="password" placeholder="密码（积分卡密码）" autocomplete="off"></div>
        <button class="btn btn-danger" style="width:100%" data-action="bd-login">越 权 登 录</button>
        <div class="pass-error" id="bd-error"></div>
      </div>
    </div>`;
  }
  const q = S.ui.id.archQuery;
  let body = `<div class="db-empty">母体档案库 · 输入姓名或档案编号检索<br><span style="font-size:12px">提示：检索「林北辰」</span></div>`;
  if (q && q.includes("北辰")) {
    body = `
    <div class="db-table-wrap">
      <div class="db-table-title"><span>档案 #ARC-A-2048 · 林北辰A</span><span class="db-tag">原生体（自然人）</span></div>
      <table class="db-table">
        <thead><tr><th style="width:180px">字段</th><th>数值</th></tr></thead>
        <tbody>
          <tr><td>智力水平</td><td>95（正常）<span class="score-bar" style="width:110px;margin-left:10px"></span></td></tr>
          <tr><td>创造力</td><td>78（中等）<span class="score-bar" style="width:90px;margin-left:10px"></span></td></tr>
          <tr><td>心理稳定性</td><td>90（优秀）<span class="score-bar" style="width:170px;margin-left:10px"></span></td></tr>
          <tr><td>评估结论</td><td><b style="color:#7fd0ff">「优选体」候选。</b><br>附注：父母评估报告高度积极，建议通过。</td></tr>
        </tbody>
      </table>
    </div>
    <div class="db-table-wrap">
      <div class="db-table-title"><span>档案 #ARC-B-2048 · 林北辰B</span><span class="db-tag red">克隆体（合成人）</span></div>
      <table class="db-table">
        <thead><tr><th style="width:180px">字段</th><th>数值</th></tr></thead>
        <tbody>
          <tr><td>智力水平</td><td>142（天才）<span class="score-bar" style="width:200px;margin-left:10px"></span></td></tr>
          <tr><td>创造力</td><td>165（卓越）<span class="score-bar" style="width:210px;margin-left:10px"></span></td></tr>
          <tr><td>心理稳定性</td><td>35（低）<span class="score-bar red" style="width:40px;margin-left:10px"></span><br><span style="font-size:12px;color:#ffd27a">注：该数据经复核，可能与评估者主观偏差有关。</span></td></tr>
          <tr><td>评估结论</td><td><b style="color:#ff8a8a">「冗余体」。</b><br>附注：评估报告由「李某某」医生主笔，其曾因「评估数据异常」被内部警告。<b style="color:#ffd27a">建议复核。</b></td></tr>
        </tbody>
      </table>
    </div>
    <button class="btn btn-primary" data-action="arch-recheck">${svgIcon("folder")} 调出「复核申请」通道</button>
    ${S.ui.id.recheck ? `
      <div class="divider"></div>
      <div class="db-alert">${svgIcon("search")} 隐藏窗口发现：复核通道下挂载了一段未归档录音，标注为「李医生_自述」。</div>
      ${S.ui.id.tapeDecrypted ? `
      <div class="cassette" data-action="play-li-tape">
        <div class="cs-icon" style="font-weight:700">${svgIcon("mic")}</div>
        <div><div style="font-size:14px">李医生_自述.wav</div><div style="font-size:11px;color:#5f7ea8;font-family:var(--mono)">时长 01:12 · 未归档 · 点击播放</div></div>
      </div>
      <div id="tape-box"></div>` : `
      <div class="enc-tape-card">
        <div style="font-size:14px;margin-bottom:4px">李医生_自述.wav <span class="tag">员工私钥加密</span></div>
        <div style="font-size:11.5px;color:var(--dim);margin-bottom:12px">密文 ██▓▒░ …… 无法直接播放。这条录音本是通过地下渠道流转出来的——用你当初进暗涌时那扇门的数字打开它。</div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <input id="tape-dec-key" placeholder="输入4位密钥" maxlength="4" inputmode="numeric" autocomplete="off" style="width:150px;background:#0e0e0a;border:1px solid #243040;color:#9fd0ff;padding:9px 12px;border-radius:6px;font-family:var(--mono,monospace);letter-spacing:4px;text-align:center">
          <button class="btn btn-primary" data-action="dec-tape">${svgIcon("unlock")} 解密此录音</button>
        </div>
        <div id="tape-dec-err" style="color:#ff8a8a;font-size:12.5px;margin-top:8px;min-height:18px"></div>
      </div>`}
    </div>` : ""}`;
  } else if (q) {
    body = `<div class="db-empty">档案库中未检索到「${esc(q)}」。</div>`;
  }
  return `<div class="app-root db-app">
    ${dbHead}${tabs}
    <div class="db-query">
      <span class="db-qlabel">SELECT * FROM clone_archive WHERE name LIKE</span>
      <input id="arch-query" placeholder="输入姓名或档案编号…" value="${esc(S.ui.id.archQuery)}">
      <button class="btn btn-danger" data-action="arch-query">检 索</button>
    </div>
    ${body}
    <div class="db-footer">-- 母体档案库 · 存储所有克隆体的DNA、评估报告与「销毁」记录 --</div>
  </div>`;
}
function liTapeHtml() {
  return `<div class="transcript" style="margin-top:14px">
    <div class="t-label">播放记录 · 李医生_自述.wav</div>
    <div style="white-space:pre-wrap">「……我受够了。他们强迫我在评估报告上做手脚，让那些『多余』的孩子看起来有心理问题……我做过最坏的一件事，就是把一个本来很健康的小男孩标记成『反社会』，因为他父母不肯给贿赂金……那个男孩好像姓林……我……我每天晚上都做噩梦……后来我才知道，是辰天法务部的律师告诉我，只要把低分孩子改成冗余体，他们就能顺利处理掉。辰天说，这是为了星都的『人口优化』……」</div>
    <div class="gunshot">—— 录音戛然而止，之后只剩沉默 ——</div>
  </div>
`;
}

function govHackResult() {
  const plainDoc = `<div style="background:#0a120c;padding:18px 22px;border-radius:8px;border:1px solid #1e3a28;font-size:13px;line-height:2.2;color:#dce9f4;word-break:break-word;overflow-wrap:anywhere;max-width:100%">
        <b style="color:var(--warn)">${svgIcon("file")} 双子计划_实施方案_2048.docx</b><br>
        <span style="color:#7f93aa">密级：内部公开 · 仅限科级以上</span><br><br>
        <b>一、项目背景</b><br>
        全球人口认知水平持续下滑，2040-2048年累计下降31%。现有医疗手段无法逆转。经国务院（星都特别行政区）批准，自2048年起试行"双子备份计划"。<br><br>
        <b>二、核心机制</b><br>
        每个自然新生儿须提交DNA样本，由生命延续中心统一培育克隆备份体（以下简称"B体"）。<br>
        B体与原生体（以下简称"A体"）同步成长至18岁。届时进行"成人礼综合评估"，涵盖智力、创造力、心理稳定性三项。<br><br>
        <b>三、处置原则</b><br>
        评估得分低者即为"冗余体"，由本中心负责 <b style="color:var(--danger)">统一处置（术语代号：焚化/深度冷冻/意识格式化，视预算执行）</b>。<br>
        此项工作已外包至临港东郊处理中心（代号：3号仓库）。<br><br>
        <b>四、家长配合</b><br>
        家长无需知情。如主动询问，统一回复"赴海外深造"。<br>
        档案室保存A/B双份记录，B体档案在完成处置后涂黑销毁。<br><br>
        <b>五、经费与审计</b><br>
        本年度已处置冗余体 <b style="color:var(--danger)">1,244</b> 例（较去年增 9.2%），预算剩余 7.3%。<br><br>
        <span style="color:#587089">签发：星都市卫生健康委员会 · 辰天集团专项统筹办公室 · 2066年9月</span><br>
        <span style="color:#587089">附注：具体执行由辰天CTO办公室下属回声研究所负责。</span>
      </div>`;
  if (!has("gov_decrypted")) {
    return browserChrome(`
    <div class="gov-page">
      <div class="web-header"><h2>星都政务内网 · 已获取敏感文件</h2><span class="wh-url">gov.xd.net/admin</span></div>
      <div class="gov-banner" style="background:linear-gradient(90deg,#3a2a1a,#1a120a);border-color:#8a6a2a;">
        警 越权访问成功，但目标文件已被 AES-256 加密
      </div>
      <div style="background:#0e0e0a;padding:18px 22px;border-radius:8px;border:1px solid #3a3018;font-size:13px;line-height:2;color:#cdbd82;font-family:var(--mono,monospace)">
        <b style="color:#d8b860">${svgIcon("file")} 双子计划_实施方案_2048.docx</b><br>
        <span style="color:#a29468">密级：内部公开 · 已加密 · 尝试离线破解…</span><br><br>
        ██ ▓▓ █░ █▒▒ ▓░█ ▒░█ ▓▓ █░ ▒▒█ ░█▓ ▒▓░ █▒░ ▓█░ ▒▓░ █░█ ▒▓░ █▒ ░▒ █░ ▓▒ █░<br>
        ▒░█ ▓░█ ▒▓░ █▒░ ▓█░ ▒▓░ █░█ ▒▓░ █▒ ░▒ █░ ▓▒ █░ █▒░ ▓█░ ▒▓░ █░█ ▒▓░ █▒ ░▒
      </div>
      <div style="margin-top:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <input id="gov-dec-key" placeholder="输入密码本密钥（4位数字）" maxlength="4" inputmode="numeric" autocomplete="off" style="width:200px;background:#0e0e0a;border:1px solid #3a3018;color:#d8b860;padding:9px 12px;border-radius:6px;font-family:var(--mono,monospace);letter-spacing:4px;text-align:center">
        <button class="btn btn-primary" data-action="gov-decrypt">离线解密</button>
      </div>
      <div id="gov-dec-err" style="color:#ff8a8a;font-size:12.5px;margin-top:8px;min-height:18px"></div>
      <div class="gov-morse" style="margin-top:16px;background:#0e0e0a;border:1px solid #3a3018;border-radius:8px;padding:14px 16px">
        <div style="font-size:12.5px;color:#d8b860;letter-spacing:1px;margin-bottom:8px">密码本线索 · 摩斯密码</div>
        <div style="font-size:12.5px;color:#c9b97c;line-height:1.9">观测站墙上星图旁，红笔圈着四个数字，下面压着一行点划：<b style="color:#f0e0a0;letter-spacing:2px;font-family:var(--mono,monospace)">----- ....- .---- ..---</b></div>
        <div style="display:flex;gap:12px;align-items:center;margin-top:10px;flex-wrap:wrap">
          <button class="btn" data-action="play-morse">▶ 播放摩斯音频</button>
          <img src="assets/Morse Code Chart.png" alt="摩斯密码对照表" style="height:60px;border-radius:6px;border:1px solid #3a3018" title="摩斯密码对照表">
        </div>
        <div style="font-size:11.5px;color:#8a7a58;margin-top:8px">对照上图翻译这行点划，得到的四位数字就是密码本。</div>
      </div>
    </div>
  `);
  }
  return browserChrome(`
    <div class="gov-page">
      <div class="web-header"><h2>星都政务内网 · 已获取敏感文件</h2><span class="wh-url">gov.xd.net/admin</span></div>
      <div class="gov-banner" style="background:linear-gradient(90deg,#1a2a1a,#0a1a0a);border-color:#2a6a3a;">
        ✓ 越权访问成功 · 文件已用密码本解密并缓存至本地
      </div>
      ${plainDoc}
    </div>
  `);
}


function obsPcScreen() {
  if (S.ui.obs.unlocked) { S.ui.obs.view = "pc_home"; return obsPcHome(); }
  const tried = S.ui.obs.tried || [];
  return browserChrome(`
    <div class="gov-page">
      <div class="web-header"><h2>旧笔记本电脑 · 登录</h2><span class="wh-url">local · ZHANG-PC</span></div>
      <div class="gov-article">
        <div style="background:#0a0f1a;padding:20px;border-radius:8px;border:1px solid #1a2a3a;font-family:var(--mono);font-size:12px;color:#8ab4d8;margin-bottom:16px">
          <div>ZHANG-PC · 操作系统：星都OS 2051（已停止支持）</div>
          <div>用户：zhang_wei　｜　最后登录：2066-10-13 23:47</div>
          <div style="color:#587089;margin-top:6px">⚠ 检测到未完成输入：密码（4位数字）</div>
        </div>
        <p style="font-size:13px">屏幕上贴着一张便签，字迹潦草：</p>
        <div style="background:#2a2a1a;padding:14px;border-radius:6px;border-left:3px solid #aa9944;font-size:13px;color:#d8c898;margin:10px 0">
          「密码忘了就想想儿子的编号最后四位。——老张」
        </div>
        <p style="font-size:12px;color:#587089">提示：D_张在暗涌论坛的寻人帖里提到了他儿子的完整编号。</p>
        <div class="pass-input" style="margin-top:16px">
          <input id="obs-pass" placeholder="输入4位密码" inputmode="numeric" maxlength="4" autocomplete="off" style="width:140px;text-align:center;font-size:18px;letter-spacing:6px">
          <button class="btn btn-primary" data-action="obs-unlock">解 锁</button>
        </div>
        <div class="pass-error" id="obs-error">${tried.length ? `密码错误。已尝试：${tried.join("、")}` : ""}</div>
        <div style="margin-top:14px"><button class="btn" data-action="obs-back-outside">← 退出电脑，回到观测站</button></div>
      </div>
    </div>`);
}
function obsPcHome() {
  setFlag("obs_unlocked");
  return browserChrome(`
    <div class="gov-page">
      <div class="web-header"><h2>ZHANG-PC · 桌面</h2><span class="wh-url">local · 已登录</span></div>
      <div class="gov-article">
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">
          <div class="file-card" style="display:flex;gap:12px;align-items:center;text-align:left;border:1px solid var(--line);cursor:pointer" data-action="obs-file" data-arg="diary">
            <div class="fc-icon" style="font-size:26px;margin:0">${svgIcon("note")}</div>
            <div><div class="fc-name">老张_日记.txt ${has("obs_diary") ? "✓" : ""}</div><div class="fc-meta">2066-09-15 至 2066-10-13 · 最后修改于失踪前夜</div></div>
          </div>
          <div class="file-card" style="display:flex;gap:12px;align-items:center;text-align:left;border:1px solid var(--line);cursor:pointer" data-action="obs-file" data-arg="bribe">
            <div class="fc-icon" style="font-size:26px;margin:0">${svgIcon("table")}</div>
            <div><div class="fc-name">评估员往来记录.csv ${has("obs_bribe") ? "✓" : ""}</div><div class="fc-meta">三名评估员 · 2064-2066 · 金额与对应孩子编号</div></div>
          </div>
          <div class="file-card" style="display:flex;gap:12px;align-items:center;text-align:left;border:1px solid var(--line);cursor:pointer" data-action="obs-file" data-arg="warehouse_map">
            <div class="fc-icon" style="font-size:26px;margin:0">${svgIcon("photo")}</div>
            <div><div class="fc-name">3号仓库_内部结构图.png ${has("obs_map") ? "✓" : ""}</div><div class="fc-meta">手绘 · 标注牢房区/监控室/配电室/货运月台</div></div>
          </div>
        </div>
        <div class="hint-box" style="margin-top:16px">这台电脑里的东西，是老张用命换来的情报。逐一打开看看。</div>
        <div style="margin-top:14px"><button class="btn" data-action="obs-back-outside">← 关闭电脑，回到观测站</button></div>
      </div>
    </div>`);
}
function obsDiary() {
  setFlag("obs_diary");
  if (!inbox.some(m => m.id === "m_gov_lead")) deliverMail("gov_lead", 900);
  return browserChrome(`
    <div class="gov-page">
      <div class="web-header"><h2>${svgIcon("note")} 老张_日记.txt</h2><span class="wh-url">ZHANG-PC · 桌面</span></div>
      <div class="txt-file" style="font-size:13px;line-height:2.2">
<b>2066-09-15</b>
他们通知我了。我儿子的评估报告「存疑」，要复查。我知道这是什么意思——老林跟我说过，中心里有个李医生，只要给钱，就能把一个健康的孩子写成「反社会」。我没给钱。我给不起。

<b>2066-09-28</b>
老林来找我。他说他也接到通知了。我们两个老头子，在这个观测站里坐了一整夜。望远镜早就坏了，但我们还是盯着天看。老林说：「他们可以选一个，但不能两个都杀。」我说：「那就让他们选不了。」

后来我才知道，李医生也是被逼的——辰天生物的经理拿他女儿的命威胁他。辰天的手，伸得太长了。

<b>2066-10-05</b>
我们决定了。10月15号夜里，中心要转运一批「货」。老林的媳妇在里面，我儿子可能也在。我们要在那天晚上之前，把能拿到的证据都拿到手。评估问卷是我们改的——为了让两个孩子的分数看起来一样，让他们没法轻易决定杀谁。但这招撑不了多久。

<b>2066-10-08</b>
老林两口子「去临港了」。他们没有上那趟高铁。他们去了3号仓库附近踩点。我让他们小心，老林说：「为了北辰，我什么都愿意。」这句话他跟我说过三次了。

<b>2066-10-11</b>
联系不上老林了。电话关机。我知道这意味着什么。但我不能停。观测站的电脑里存着所有东西——日记、账目、结构图。如果我也出事了，希望有人能找到这台电脑。

<b>2066-10-13 · 最后一条</b>
我在暗涌上发了寻人帖。如果有记者看到，请到天象观测站来。电脑密码是我儿子编号的最后四位——0412。
老张，如果你看到这封信，对不起，爸爸没能把你带回家。

<b>2066-10-13 · 补充</b>
记者，如果你看到这条，听我说完：政务内网的漏洞入口，我已经匿名发到你的邮箱里了——发件人没有署名。找到它，入侵后台，下载那份《双子计划》文件。
密码是我儿子编号的后四位，也是墙上星图旁红笔圈的数字。星图下压着一行点划：摩斯码 <b style="font-family:var(--mono);letter-spacing:2px">----- ....- .---- ..---</b>。
      </div>
      <div style="margin-top:14px"><button class="btn" data-action="obs-back-pc">← 返回电脑桌面</button></div>
    </div>`);
}
function obsBribe() {
  setFlag("obs_bribe");
  return browserChrome(`
    <div class="gov-page">
      <div class="web-header"><h2>${svgIcon("table")} 评估员往来记录.csv</h2><span class="wh-url">ZHANG-PC · 桌面</span></div>
      <div class="gov-article">
        <p style="font-size:12px;color:#587089">老张从中心内部渠道获得的转账记录摘要。所有金额单位：星元。</p>
        <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:10px">
          <thead>
            <tr style="background:#1e3248;color:#bcdcf4">
              <th style="padding:8px;border:1px solid #2a3a4a;text-align:left">日期</th>
              <th style="padding:8px;border:1px solid #2a3a4a;text-align:left">评估员</th>
              <th style="padding:8px;border:1px solid #2a3a4a;text-align:left">金额</th>
              <th style="padding:8px;border:1px solid #2a3a4a;text-align:left">对应孩子编号</th>
              <th style="padding:8px;border:1px solid #2a3a4a;text-align:left">操作</th>
            </tr>
          </thead>
          <tbody style="color:#e8f1f9">
            <tr><td style="padding:7px;border:1px solid #1a2a3a">2064-11-03</td><td style="padding:7px;border:1px solid #1a2a3a">李某某（李医生）</td><td style="padding:7px;border:1px solid #1a2a3a;color:#ffaa44">85,000</td><td style="padding:7px;border:1px solid #1a2a3a;font-family:var(--mono)">CLC-2046-1108-B</td><td style="padding:7px;border:1px solid #1a2a3a">心理分 82→31</td></tr>
            <tr style="background:rgba(255,170,68,.04)"><td style="padding:7px;border:1px solid #1a2a3a">2065-06-18</td><td style="padding:7px;border:1px solid #1a2a3a">王某某</td><td style="padding:7px;border:1px solid #1a2a3a;color:#ffaa44">120,000</td><td style="padding:7px;border:1px solid #1a2a3a;font-family:var(--mono)">CLC-2047-0521-A</td><td style="padding:7px;border:1px solid #1a2a3a">智力分 68→95</td></tr>
            <tr><td style="padding:7px;border:1px solid #1a2a3a">2065-09-02</td><td style="padding:7px;border:1px solid #1a2a3a">李某某</td><td style="padding:7px;border:1px solid #1a2a3a;color:#ffaa44">65,000</td><td style="padding:7px;border:1px solid #1a2a3a;font-family:var(--mono)">CLC-2047-0915-B</td><td style="padding:7px;border:1px solid #1a2a3a">创造力 140→88</td></tr>
            <tr style="background:rgba(255,170,68,.04)"><td style="padding:7px;border:1px solid #1a2a3a">2066-03-11</td><td style="padding:7px;border:1px solid #1a2a3a">赵某某</td><td style="padding:7px;border:1px solid #1a2a3a;color:#ffaa44">200,000</td><td style="padding:7px;border:1px solid #1a2a3a;font-family:var(--mono)">CLC-2048-0003-A</td><td style="padding:7px;border:1px solid #1a2a3a">综合评级 冗余→优选</td></tr>
            <tr><td style="padding:7px;border:1px solid #1a2a3a">2066-08-20</td><td style="padding:7px;border:1px solid #1a2a3a">李某某</td><td style="padding:7px;border:1px solid #1a2a3a;color:#ff4444">未收取</td><td style="padding:7px;border:1px solid #1a2a3a;font-family:var(--mono)">CLC-2048-1015-B（林北辰B）</td><td style="padding:7px;border:1px solid #1a2a3a">心理分 90→35（强行篡改）</td></tr>
          </tbody>
        </table>
        <p style="font-size:12.5px;color:#8fb4d8;margin-top:12px">合计：5笔记录，涉及3名评估员，总金额 470,000 星元。最后一行标注「未收取」——林父拒绝了贿赂，但李医生仍然强行篡改了小林B的心理评分。</p>
        <p style="font-size:12.5px;color:#e8c4a0;margin-top:10px">这些转账的上游账户，全部指向同一家空壳公司，其母公司登记为<b>「辰天置业」</b>（星都地产 006 号牌照）。钱从辰天来，绕过一切监管。</p>
        <div style="margin-top:14px"><button class="btn" data-action="obs-back-pc">← 返回电脑桌面</button></div>
      </div>
    </div>`);
}
function obsWarehouseMap() {
  setFlag("obs_map");
  return browserChrome(`
    <div class="gov-page">
      <div class="web-header"><h2>${svgIcon("photo")} 3号仓库_内部结构图.png</h2><span class="wh-url">ZHANG-PC · 桌面 · 手绘</span></div>
      <div class="gov-article">
        <p style="font-size:12px;color:#8fb4d8">老张手绘的仓库内部布局，已扫描存档。</p>
        <img src="assets/3号仓库_内部结构图.png" alt="3号仓库内部结构图" style="width:100%;max-width:640px;border-radius:10px;border:1px solid #2a4a3a;display:block;margin:14px 0">
        <p style="font-size:12px;color:#8fb4d8">红笔标注：「配电室→监控室电源在同一回路」。通风管道可通行。</p>
        <p style="font-size:12px;color:#e8c4a0;margin-top:10px">图纸边缘签着一行小字：<b>「辰天建设（监理方）」</b>。切断配电室总闸的方案，是老张当年在辰天建设当保安时偷偷记下的。</p>
        <div style="margin-top:14px"><button class="btn" data-action="obs-back-pc">← 返回电脑桌面</button></div>
      </div>
    </div>`);
}


function cmsScreen() {
  const tab = S.ui.cms.tab;
  const tipsHtml = `
    <div class="cms-section-title">${svgIcon("letter")} 收件箱（线报）</div>
    <div class="tip-card">
      <div class="tc-subject">【求助】我的父母消失了</div>
      <div class="tc-meta">发件：星空之下 &lt;xingkongzhixia@freemail.xyz&gt; · 2066-10-12 09:23</div>
      <div class="tc-body">我叫林北辰，今年18岁。我的父母四天前说要去临港市参加交流会，但两张高铁票的座位号是空的——他们根本没有上车。有个穿黑西装的男人在楼下打听我父母……</div>
      <div style="margin-top:10px"><button class="btn" data-action="open-mail-from-cms">${svgIcon("letter")} 在邮箱中查看并回复</button></div>
    </div>
    <div class="tip-card" style="opacity:.5;border-left-color:var(--line)">
      <div class="tc-subject">智慧城市便民措施采访提纲（陈姐指派）</div>
      <div class="tc-meta">指派：陈姐 · 2066-10-11</div>
      <div class="tc-body">采访智慧公交、无人配送、AI政务窗口三个点。（你大概已经顾不上这个了。）</div>
    </div>`;
  const draftsHtml = `
    <div class="cms-section-title">${svgIcon("note")} 草稿箱</div>
    <div class="editor-area" style="opacity:.75">
      <input value="星都便民设施调查（未完成）" readonly>
      <textarea readonly>第一节：智慧公交——目前已采访2位司机……
第二节：无人配送站点分布……
（写作进度：12%。你上个月就说这周交稿。）</textarea>
    </div>`;
  const canPublish = has("choice_route1");
  const bribeExtra = has("obs_bribe") ? `\n\n补充证据：评估科三名医生（李某某、王某某、赵某某）在2064-2066年间收受贿赂共计470,000星元，篡改至少5名青少年的评估分数。其中林北辰B的父母拒绝行贿，但孩子的心理评分仍被从90分强行降至35分。` : "";
  const mapExtra = has("obs_map") ? `\n\n3号仓库内部结构图已附：牢房区8间、监控室4路信号、配电室总闸可切断全仓电源、货运月台为唯一出入口。` : "";
  const editorHtml = `
    <div class="cms-section-title">${svgIcon("pen")} 深度报道编辑器</div>
    <div class="editor-area">
      <input id="cms-title" value="《星都观察者》深度 | 代号「双子」：谁替我们的孩子决定了生死？" ${canPublish ? "" : "readonly"}>
      <textarea ${canPublish ? "" : "readonly"}>2066年，星都市。每个家庭都会迎来两个一模一样的孩子——一个是生的，一个是「培育」的。18岁那年，一场名为「成人礼」的测试将决定谁留下，谁「赴海外深造」。

我们掌握的证据显示：「海外深造」即「销毁」，销毁中心位于临港市东郊地下，后勤通道为化工厂3号仓库。原评估科医生李某某亲口承认：评估报告可以被篡改、被购买——一位母亲正被关押在那里，等待10月15日夜里的「转运」。

全部物证：原始评估档案A/B、李医生自述录音、林父邮件往来、母体档案库截图。${bribeExtra}${mapExtra}</textarea>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:12px">
        ${canPublish
          ? `<button class="btn btn-danger" data-action="publish-report">${svgIcon("alert")} 发布报道（全网推送）</button>`
          : `<button class="btn" disabled>${svgIcon("lock")} 编辑器锁定 —— 最终抉择后解锁</button>`}
      </div>
    </div>`;
  return `<div class="app-root">
    <div class="cms-header">
      <div class="cms-logo">${svgIcon("report")} 星都<em>观察者</em> · 后台</div>
      <div class="cms-role">沈砚 · 实习记者 · 我的工位</div>
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn ${tab === "tips" ? "btn-primary" : ""}" data-action="cms-tab" data-arg="tips">收件箱</button>
      <button class="btn ${tab === "draft" ? "btn-primary" : ""}" data-action="cms-tab" data-arg="draft">草稿箱</button>
      <button class="btn ${tab === "editor" ? "btn-primary" : ""}" data-action="cms-tab" data-arg="editor">深度报道</button>
    </div>
    ${tab === "tips" ? tipsHtml : tab === "draft" ? draftsHtml : editorHtml}
  </div>`;
}


function voiceHtml() {
  const avail = evidences.filter(e => e.need());
  const sel = avail.find(e => e.id === S.ui.voice.sel) || null;
  const opts = (cur) => avail.map(e => `<option value="${e.id}" ${cur === e.id ? "selected" : ""}>${e.name}</option>`).join("");
  return `<div class="app-root">
    <h3 class="app-title"><span class="at-ic">${svgIcon("mic")}</span>语音助手 · 星灵</h3>
    <div class="app-sub">采访录音与线索语音 · 共 ${avail.length} 条可用</div>
    <div class="voice-privacy">为保护隐私，原声已加密存储，仅供星灵AI声纹分析。播放声音为星灵AI生成</div>
    <div class="voice-list">
      ${avail.map(e => `
        <div class="voice-item ${sel && sel.id === e.id ? "playing" : ""}" data-action="voice-select" data-arg="${e.id}">
          <div style="flex:1">
            <div class="vi-name">${e.name}</div>
            <div class="vi-meta">${e.meta}</div>
            <div class="waveform">${"<i></i>".repeat(24)}</div>
          </div>
          ${sel && sel.id === e.id
            ? `<button class="btn" data-action="voice-stop">■ 停止</button>`
            : `<button class="btn btn-primary" data-action="voice-play" data-arg="${e.id}">▶ 播放</button>`}
        </div>`).join("") || `<div class="locked-note">暂无可播放的语音。</div>`}
    </div>
    ${sel ? `
      <div class="transcript" id="voice-transcript">
        <div class="t-label">语音转写 · TRANSCRIPT</div>
        <div style="white-space:pre-wrap">${esc(sel.transcript)}</div>
      </div>` : `<div class="hint-box">点击「播放」聆听录音，转写文本会自动显示。</div>`}
    <div class="vp-panel">
      <div style="font-size:12px;color:var(--dim);letter-spacing:2px;margin-bottom:8px">声纹分析 · 比对两段音频是否来自同一人</div>
      ${avail.length >= 2 ? `
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select id="vp-a">${opts(S.ui.voice.vpA)}</select>
        <span style="color:var(--dim)">vs</span>
        <select id="vp-b">${opts(S.ui.voice.vpB)}</select>
        <button class="btn btn-primary" data-action="vp-compare">开始比对</button>
      </div>` : `<div class="vp-note">收集到至少两段语音后，声纹比对功能才会解锁（当前 ${avail.length}/2）。继续调查吧。</div>`}
      <div class="vp-result" id="vp-result">${S.ui.voice.vpResult || ""}</div>
    </div>
  </div>`;
}


function remoteProgress() {
  const a = ["r_work", "r_photo1", "r_photo2", "r_photo3", "letter_read"].filter(has).length;
  const b = (has("safe_opened") ? 1 : 0) + (has("usbA_opened") ? 1 : 0) + (has("video_watched") ? 1 : 0);
  return `LIN-PC 搜查进度：${a}/5 · 保险箱/U盘 ${b}/3`;
}
function objectiveText() {
  if (S.difficulty !== "easy") return "（普通难度：任务目标与提示已关闭）";
  if (has("game_over")) return "（本局故事已完结）";
  if (has("choice_route1")) return "在新闻后台编辑器中，发布那篇报道";
  if (has("truth_known")) return "做出你的最终选择（点击任务目标）";
  if (has("b_letter")) return "用「双子星」进入母体档案库，调阅A/B档案与李医生录音";
  if (has("gov_decrypted")) return "打开加密频道——北辰那边出事了";
  if (has("gov_hacked")) return "用密码本「0412」解密《双子计划_实施方案_2048.docx》";
  if (has("obs_unlocked")) return "搜索「政务内网」，入侵政府系统并用密码本解开官方文件";
  if (has("dm_read")) return "调查天象观测站（张叔叔据点），在老张的旧电脑里拿到密码本与证据";
  if (has("ch1_done")) return has("invite_known") ? "进入「暗涌」论坛，读完帖子并查收D_张的私信" : "查看2048留念照的EXIF坐标，搜出红星路34号，拨通那部老电话";
  if (has("remote_granted")) return "搜查LIN-PC（" + remoteProgress() + "）";
  if (prologueDone()) return "回到邮箱，回复北辰获取远程访问权限";
  if (has("cloud_opened")) return `查看星云网盘中的线索（截图${["e_chat1","e_chat2","e_chat3"].filter(has).length}/3 · 照片${has("e_photo") ? "✓" : "…"} · 文本${has("e_note") ? "✓" : "…"}）`;
  return "在邮箱客户端或新闻后台，阅读北辰的求助信，解锁他的星云网盘";
}
function objectiveList() {
  const L = [];
  const add = (text, done, current) => L.push({ text, done, current });
  const anon = inbox.find(m => m.id === "m_anon");
  add("阅读北辰的求助邮件", anon ? !anon.unread : true, !has("cloud_opened"));
  add("查看星云网盘的6条初步线索", prologueDone(), has("cloud_opened") && !prologueDone());
  add("回复北辰，连接LIN-PC远程访问", has("remote_granted"), prologueDone() && !has("remote_granted"));
  add("搜查LIN-PC：工作文档 / 相册 / 回收站", has("r_work") && has("r_photo3") && has("letter_read"), has("remote_granted") && !(has("r_work") && has("r_photo3") && has("letter_read")));
  add("开启保险箱（20490312）并查看两个U盘", has("usbA_opened") && has("video_watched"), has("remote_granted") && !(has("usbA_opened") && has("video_watched")));
  add("【声纹】用星灵比对《B_契约》音轨与北辰的语音", has("vp_ab"), has("video_watched") && !has("vp_ab"));
  add("查看2048留念照的EXIF坐标，搜出红星路34号并拨通老电话拿到邀请码", has("invite_known"), has("ch1_done") && !has("invite_known"));
  const forumAllRead = has("forum_read_top") && has("forum_read_b2") && has("forum_read_zhang");
  add("进入「暗涌」，读帖并查收D_张的私信", has("dm_read") && forumAllRead, has("invite_known") && !(has("dm_read") && forumAllRead));
  add("调查天象观测站（张叔叔据点），获取密码本与旧电脑三份证据", has("obs_unlocked"), has("dm_read") && !has("obs_unlocked"));
  add("搜索「政务内网」，入侵星都政府系统获取官方实施文件", has("gov_hacked"), has("obs_unlocked") && !has("gov_hacked"));
  add("用密码本「0412」解密《双子计划_实施方案_2048.docx》", has("gov_decrypted"), has("gov_hacked") && !has("gov_decrypted"));
  add("在加密频道面对「开门」，读完北辰B的信", has("b_letter"), has("gov_decrypted") && !has("b_letter"));
  add("登录母体档案库，调阅档案与李医生录音", has("truth_known"), has("b_letter") && !has("truth_known"));
  add("做出你的最终选择", has("game_over"), has("truth_known") && !has("game_over"));
  if (has("game_over")) add("体验其他结局：回到简介，快速重玩「最后的抉择」", true, true);
  return L;
}
function objectivesHtml() {
  if (S.difficulty !== "easy") {
    return `<div class="app-root">
    <h3 class="app-title">任务目标</h3>
    <div class="app-sub">普通难度</div>
    <div class="hint-box" style="border-left-color:#8a6a2a;background:rgba(255,180,84,.06);color:#d8b98a">${svgIcon("mute")} 普通难度不提供任务目标与提示。<br>线索要靠你自己拼——卡住时，桌面同目录下的《星都双子》完整攻略.docx 就是你的任务清单。</div>
  </div>`;
  }
  const list = objectiveList()
    .filter(i => i.done || i.current)
    .map(i =>
    `<li class="${i.done ? "done" : ""} ${i.current ? "current" : ""}">${i.text}</li>`).join("");
  const extra = (has("truth_known") && !has("game_over") && !has("choice_route1"))
    ? `<button class="btn btn-danger" style="width:100%;margin-top:12px" data-action="show-choice">${svgIcon("scale")} 做出最终选择</button>` : "";
  return `<div class="app-root">
    <h3 class="app-title">任务目标</h3>
    <div class="app-sub">当前：${esc(objectiveText())}</div>
    <ul class="obj-list">${list}</ul>
    ${extra}
    <div class="hint-box">${svgIcon("spark")} 卡住时可以：多搜索几个关键词 / 查看邮件附件 / 打开语音助手听录音 / 找北辰聊聊。</div>
  </div>`;
}
function renderObjectives() {
  const ot = $("#objective-text");
  if (ot) ot.textContent = objectiveText();
  const panel = $("#objective-panel");
  if (panel) panel.style.display = (S.difficulty === "easy") ? "" : "none";
  const ol = $("#objective-list");
  if (ol) {
    ol.innerHTML = objectiveList()
      .filter(i => i.done || i.current)
      .map(i => `<li class="${i.done ? "done" : ""} ${i.current ? "current" : ""}">${i.text}</li>`).join("");
  }
  if (S.windows.obj) refreshApp("obj");
}


function openModal(html) { $("#modal-box").innerHTML = html; $("#modal-layer").classList.remove("hidden"); }
function closeModal() { $("#modal-layer").classList.add("hidden"); }
function passwordModal(opt) {
  openModal(`
    <div class="pass-box">
      <h3>${svgIcon("lock")} ${opt.title}</h3>
      <div class="pass-hint">${opt.hint}</div>
      <div class="pass-input">
        <input id="pass-input" placeholder="${opt.placeholder || "输入密码"}" autocomplete="off" ${opt.numeric ? 'inputmode="numeric"' : ""}>
        <button class="btn btn-primary" data-action="pass-try">确 认</button>
      </div>
      <div class="pass-error" id="pass-error"></div>
      <div class="pass-buttons"><button class="btn" data-action="pass-cancel">取 消</button></div>
    </div>`);
  S._passCheck = opt.check;
  S._passOk = opt.onOk;
  setTimeout(() => { const i = $("#pass-input"); if (i) i.focus(); }, 50);
}
function tryPassword() {
  const input = $("#pass-input");
  if (!input || !S._passCheck) return;
  const v = input.value.trim();
  if (S._passCheck(v)) {
    closeModal(); ding();
    const f = S._passOk; S._passCheck = null; S._passOk = null; S._passTries = 0;
    if (f) f();
  } else {
    beepErr();
    S._passTries++;
    const el = $("#pass-error");
    if (el) {
      el.textContent = "密码错误。再想想提示。";
      if (S._passTries >= 4 && S._passForceHint) el.innerHTML = "提 强力提示：" + S._passForceHint;
    }
  }
}


let chapterQueue = null;
function showChapter(title, desc, after) {
  chapterQueue = after || null;
  let banner = $("#chapter-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "chapter-banner";
    banner.className = "chapter-banner";
    document.body.appendChild(banner);
  }
  banner.innerHTML = `<div class="cb-tag">CHAPTER</div><div class="cb-title"></div><div class="cb-desc"></div>`;
  banner.querySelector(".cb-title").textContent = title;
  if (desc) banner.querySelector(".cb-desc").textContent = desc; else banner.querySelector(".cb-desc").remove();
  banner.classList.remove("show");
  void banner.offsetWidth;
  banner.classList.add("show");
  beep(988, .25, .08);
  clearTimeout(banner._t);
  banner._t = setTimeout(() => {
    banner.classList.remove("show");
    if (chapterQueue) { const q = chapterQueue; chapterQueue = null; q(); }
  }, 5500);
}
function showPeephole(desc, tablet, caption, after) {
  S._peepAfter = after || null;
  $("#peep-desc").textContent = desc;
  $("#peep-tablet").innerHTML = tablet;
  $("#peep-caption").textContent = caption;
  $("#peephole-screen").classList.remove("hidden");
  beep(988, .3, .12);
}

const MON_STEPS_BASE = [
  { btn: "切换至3号通道摄像头", log: "画面切到CAM-07。你看见他找到了林母。她瘦了很多，认出了他——哪怕他站在阴影里。" },
  { btn: "远程开启3号门电磁锁", log: "电磁锁释放的轻响在监控里被放大。门开了一条缝——一道手电的光柱扫了过来。" },
  { btn: "指引撤离路线", log: "「左转，直走，月台右边的货柜后面——我看着你呢。」他回过头，望向摄像头。像在看你的眼睛。" },
];
const MON_STEPS_POWER = [
  { btn: "切断配电室总闸（结构图提示）", log: "你按照老张手绘的结构图，找到了配电室的总闸位置。全仓电源瞬间切断——监控室的屏幕黑了，警报系统离线。黑暗里，只有他的呼吸声。" },
];
function getMonSteps() {
  return has("obs_map") ? MON_STEPS_POWER.concat(MON_STEPS_BASE) : MON_STEPS_BASE;
}
function showMonitor() {
  const steps = getMonSteps();
  S.monitor = { step: 0, log: ["[00:47] 接入临港东郊仓库监控系统 · 4路信号 · 加密链路稳定", "[00:47] 北辰B：外部支援？我进来了。整个仓库只有我一个人的脚步声。" + (has("obs_map") ? "（你手里有老张的结构图——先切断配电室总闸。）" : "")] };
  renderMonitor();
  $("#monitor-screen").classList.remove("hidden");
}
function renderMonitor() {
  const m = S.monitor;
  const steps = getMonSteps();
  
  const powered = !(has("obs_map") && m.step >= 1);
  const cams = [
    { id: "CAM-02", name: "东侧走廊", alive: powered },
    { id: "CAM-07", name: "3号通道", alive: true },
    { id: "CAM-09", name: "货运月台", alive: true },
    { id: "CAM-11", name: "配电室", alive: powered },
  ];
  const personIn = (i) => {
    if (i === 1) return m.step >= 1 && m.step < steps.length;
    if (i === 2) return m.step >= steps.length;
    return false;
  };
  const caps = [
    "静止 · 无异常",
    m.step < 1 ? "⚠ 警报系统在线 · 慎入" : (powered ? "少年贴墙移动 · 警报未解除" : "警报离线 · 少年贴墙移动"),
    m.step >= steps.length ? "发现撤离目标 · 掩护中" : "空 · 无人",
    powered ? "供电正常" : "已断电 · 无信号",
  ];
  const camLine = m.step >= 1 ? "信号已接入" : "信号已接入 · 等待操作";
  $("#monitor-inner").innerHTML = `
    <div class="mon-head">
      <span class="mon-live">● LIVE</span>
      <span class="mon-title">临港东郊 · 3号仓库 监控终端</span>
      <span class="mon-clock">2066-10-15 00:${String(47 + Math.floor(m.step / 2)).padStart(2, "0")} · 操作员：你</span>
    </div>
    <div class="mon-note">${esc(camLine)} · ${m.step >= steps.length ? "信号丢失" : "4路信号正常"}</div>
    <div class="mon-bottom">
      <div class="mon-log" id="mon-log">${m.log.map(l => "› " + esc(l)).join("<br>")}</div>
      <div class="mon-actions">
        ${steps.map((s, i) => `<button class="btn ${i === m.step ? "btn-primary" : ""}" data-action="mon-step" data-arg="${i}" ${i !== m.step ? "disabled" : ""}>${s.btn}</button>`).join("")}
      </div>
    </div>
    <div class="mon-static" id="mon-static"></div>`;
}
function monStep(i) {
  const m = S.monitor;
  const steps = getMonSteps();
  if (!m || i !== m.step) return;
  const s = steps[i];
  m.log.push(s.log);
  m.step++;
  beep(520, .07, .05);
  requestAnimationFrame(() => { const lg = $("#mon-log"); if (lg) lg.scrollTop = lg.scrollHeight; });
  if (m.step >= steps.length) {
    m.log.push("他们从月台的阴影里出去了。三秒后——");
    renderMonitor();
    setTimeout(() => {
      beepGunshot();
      const st = $("#mon-static"); if (st) st.classList.add("on");
      const lg = $("#mon-log");
      if (lg) lg.innerHTML += "<br><br>▒▒▒ 信号丢失 ▒▒▒<br>▒▒▒ CAM-07 / CAM-09 全部离线 ▒▒▒";
      setTimeout(() => { $("#monitor-screen").classList.add("hidden"); showEnding(2); }, 2600);
    }, 1700);
    return;
  }
  renderMonitor();
}


const NB_COMMENTS = [
  { u: "青云路居民", t: "我们家楼下就有一对双胞胎……他们今年才16岁。我现在不知道该怎么面对他们。" },
  { u: "前·档案科员工", t: "每一个数字都该有良心。谢谢这位记者，替我们把这些说出来。" },
  { u: "匿名", t: "我弟弟编号CLC-2050-0333-B。他「深造」八年了。妈，他没坐过飞机。" },
  { u: "星大社会学教授", t: "如果这份档案为真，这不再是公共卫生政策，而是一场制度化的谋杀。" },
  { u: "北辰_星辰", t: "沈记者，报道里说我的爸妈被救出来了……他们真的安全了吗？求求你们告诉我。" },
];
const NB_COMMENTS_EXTRA = [
  { u: "纪检委退休干部", t: "47万星元，5个孩子。这还只是一个评估科三年的账。上面的人呢？必须一查到底。" },
  { u: "2048届家长", t: "我家孩子当年也是心理分突然变低。我们以为是他自己的问题……原来是我们没给钱。" },
  { u: "辰天前员工", t: "他们连夜开会删数据了。我离职前见过那张「销毁」审批单，签字的是辰天的人。" },
  { u: "匿名投资者", t: "辰天今天跌停了吧？可他们越是这样急着甩锅，我越觉得报道里的每一句都是真的。" },
];
function showNewsburst(titleText) {
  const title = titleText || "《星都观察者》深度 | 代号「双子」：谁替我们的孩子决定了生死？";
  const comments = has("obs_bribe") ? NB_COMMENTS.concat(NB_COMMENTS_EXTRA) : NB_COMMENTS;
  const chenDecl = has("obs_bribe") ? `<div class="nb-company" style="margin-top:12px;padding:10px 14px;border:1px solid #5a3a3a;border-left:4px solid #e06c75;border-radius:8px;background:#241515;font-size:13px;line-height:1.8;color:#ffd7dc"><b style="color:#ffb4b4">辰天集团 · 紧急声明</b><br>针对今日报道，辰天集团回应：报道所涉评估环节系「个别底层员工的违规操作」，涉事人员已被开除，与集团无关。集团股价盘中波动，公司运营一切正常。</div>` : "";
  $("#newsburst-inner").innerHTML = `
    <div class="nb-tv">
      <div class="nb-bar"><span class="nb-live">● 直播插播</span><span style="font-size:13px;color:#ffd7dc">全城紧急新闻</span><span class="nb-chan">星都都市频道 · XDTV-1</span></div>
      <div class="nb-body">
        <div class="nb-tag">${svgIcon("alert")} 突发 · 证据已核实</div>
        <div class="nb-title">${esc(title)}</div>
        <div class="nb-sub">发布者：《星都观察者》实习记者 · 发布于 2066-10-15 00:12 · 全网推送中</div>
        <div class="nb-metrics">
          <div class="nb-metric"><div class="nm-num" id="nb-read">0</div><div class="nm-label">阅读量（万）</div></div>
          <div class="nb-metric"><div class="nm-num" id="nb-forward">0</div><div class="nm-label">转发量（万）</div></div>
          <div class="nb-metric"><div class="nm-num">1</div><div class="nm-label">热搜第一</div></div>
        </div>
        ${chenDecl}
        <div class="nb-comments" id="nb-comments"></div>
      </div>
    </div>
    <div class="nb-continue"><button class="btn btn-primary btn-lg hidden" id="nb-go" data-action="nb-go">查看结局 →</button></div>`;
  $("#newsburst-screen").classList.remove("hidden");
  beep(660, .2, .07); beep(880, .25, .07, .18);
  let read = 0, fwd = 0;
  const t1 = setInterval(() => {
    read += Math.floor(Math.random() * 320 + 140);
    fwd += Math.floor(Math.random() * 160 + 70);
    const r = $("#nb-read"), f = $("#nb-forward");
    if (r) r.textContent = read;
    if (f) f.textContent = fwd;
  }, 350);
  comments.forEach((c, i) => {
    setTimeout(() => {
      const box = $("#nb-comments");
      if (!box) { clearInterval(t1); return; }
      const d = document.createElement("div");
      d.className = "nb-comment";
      d.innerHTML = `<div class="nbc-user">${esc(c.u)}</div>${esc(c.t)}`;
      box.appendChild(d);
      beep(500 + i * 60, .05, .03);
      if (i === comments.length - 1) {
        clearInterval(t1);
        setTimeout(() => { const g = $("#nb-go"); if (g) g.classList.remove("hidden"); }, 900);
      }
    }, 1400 + i * 1500);
  });
}

function showEnding(n) {
  const bribeNote = has("obs_bribe") ? `<p>报道中附上的评估员受贿账目引发了更大范围的震动——纪检部门介入，三名评估员被立案调查。星都市卫生健康委员会主任在压力下宣布「暂停本年度成人礼评估」，等待全面审计。</p>` : "";
  const mapNote = has("obs_map") ? `<p>你附上的3号仓库内部结构图让特警的行动精准了许多——他们按照图纸先切断配电室总闸，再突入牢房区，整个过程没有触发警报。</p>` : "";
  const E = {
    1: {
      tag: "结局一 · 真相的重量", title: "真相的重量",
      body: `<p>你的报道在十分钟内引爆全网，登上所有社交媒体的热搜第一。</p>
      <p>生命延续中心连夜拉闸封锁，政府宣布介入调查。特警在临港市东郊3号仓库的地下室里，救出了林北辰的父母和十七名即将被「转运」的「冗余体」。因为「证据不足」，小林B没有被当场处置——但他被列为「高度关注对象」，从此活在镜头之下。</p>
      ${bribeNote}${mapNote}
      <p>一周后，你收到小林A的邮件。他和父母团聚了，但他再没见过他的「弟弟」。政府说，小林B被「转移」了。邮件的末尾，他问：</p>
      <p class="mono" style="border-left:3px solid var(--line);padding-left:12px;color:#9db2c6">「沈记者，我弟弟……算是活下来了吗？」</p>
      <p>你没能回答。因为你的桌上，正放着一张<b>辰天集团法务部</b>寄来的律师函——以「侵犯商业机密」和「严重损害企业名誉」为由起诉你。</p>
      <p>新闻插播的末尾，主持人面无表情地念着：辰天集团股价盘中暴跌，集团迅速发表声明，称报道所涉环节系「个别底层员工的违规操作」，涉事员工已被开除，与集团无关。你盯着屏幕，知道那些人只是替罪羊——断尾求生，这只庞然大物正在蛰伏。</p>`,
      quote: "「真相是有重量的。它压垮了一些人，也压在一些人的名字上，永不风化。」"
    },
    2: {
      tag: "结局二 · 枪声过后", title: "枪声过后",
      body: `<p>你没有发布报道。你根据小林B的指引，远程入侵了3号仓库的监控系统，帮他关闭警报、指引路线。</p>
      ${has("obs_map") ? `<p>老张手绘的结构图派上了用场——你先切断了配电室的总闸，全仓陷入黑暗。监控室的屏幕黑了，警报系统离线。小林B在黑暗里穿行，像一道影子。</p>` : `<p>监控屏幕里，那个眼神冰冷的少年在货架间穿行，像一台精密的机器。他找到了林母。就在他要带她离开的时候，保安的手电光扫了过来。</p>`}
      <p>你看见他把她推进暗处，自己迎了上去。你听见一声枪响。</p>
      <p>屏幕一片雪花。你疯狂呼叫他的频道——没有回应。十分钟后，新闻弹出：<b>「临港市东郊发生一起恶性暴力事件，一名身份不明的青少年被击毙。」</b></p>
      <p>三天后，你收到一个匿名快递。里面是一个U盘，贴着手写的「B」。只有一个文件：</p>
      <p class="mono" style="border-left:3px solid var(--line);padding-left:12px;color:#9db2c6">「谢谢你，至少我努力过了。」</p>
      <p>你的报道，永远没有发出去。</p>`,
      quote: "「他这一生只被爱过一次，还是他自己偷偷给的。」"
    },
    3: {
      tag: "结局三 · 幸存者的愧疚", title: "幸存者的愧疚",
      body: `<p>你选择彻底删除所有关于「双子计划」的帖子，格式化U盘，销毁录音。你给小林A发去最后一条消息：</p>
      <p class="mono" style="border-left:3px solid var(--line);padding-left:12px;color:#9db2c6">「忘了这一切吧。好好活下去。」</p>
      <p>小林A通过了成人礼测试。他和「归来的」父母继续生活，考上了大学，毕业后成为一名公务员。档案科的那份涂黑的记录，再没有人翻开过。</p>
      <p>多年后，你因为一篇关于城市绿化的报道，获得了「星都优秀记者奖」。颁奖典礼上，小林A作为优秀青年代表为你颁奖。</p>
      <p>握手的那一刻，他看着你的眼睛，轻声说：</p>
      <p class="mono" style="border-left:3px solid var(--line);padding-left:12px;color:#9db2c6">「我梦到他了。他说他原谅我了。」</p>
      <p>你的笑容僵在脸上。手中的奖杯，变得无比沉重。</p>`,
      quote: "「这座城市又平稳地运行了一天。只是有些人，被平稳地运行过去了。」"
    },
  }[n];
  let endingsCount = 0;
  try {
    const done = JSON.parse(localStorage.getItem("wig_endings") || "[]");
    if (!done.includes(n)) done.push(n);
    localStorage.setItem("wig_endings", JSON.stringify(done));
    endingsCount = done.length;
  } catch (e) {}
  const endBtn = document.querySelector("#ending-screen .btn[data-action='to-intro'], #ending-screen .btn[data-action='author-note']");
  if (endBtn) {
    endBtn.dataset.action = "to-intro";
    endBtn.textContent = "回到简介";
  }
  S.flags.game_over = true;
  renderObjectives();
  $("#ending-tag").textContent = E.tag;
  $("#ending-title").textContent = E.title;
  $("#ending-body").innerHTML = E.body;
  $("#ending-quote").textContent = E.quote;
  $("#ending-screen").classList.remove("hidden");
  beep(440, .5, .06); beep(330, .8, .05, .3);
  const inner = $("#ending-inner");
  if (inner && !inner.querySelector(".retry-choice-btn")) {
    const rb = document.createElement("button");
    rb.className = "btn btn-lg retry-choice-btn";
    rb.textContent = "↩ 返回最后抉择";
    rb.style.cssText = "margin-right:10px";
    rb.onclick = () => { $("#ending-screen").classList.add("hidden"); S.flags.game_over = false; S.flags.choice_route1 = false; renderObjectives(); showChoice(); };
    inner.insertBefore(rb, inner.querySelector("button"));
  }
}


function setFlag(f, v = true) {
  if (S.flags[f] === v) return;
  S.flags[f] = v;
  onFlag(f);
  tryCh1Done();
}
function onFlag(f) {
  switch (f) {
    case "cloud_opened":
      setClock("09:58");
      deliverMail("witness", 13000);
      break;
    case "prologue_done":
      setTimeout(() => toast("邮 线索初步汇总", "五条线索都看完了。回到<b>邮箱客户端</b>，回复北辰。", ""), 600);
      break;
    case "remote_granted":
      setClockDate("2066-10-12"); setClock("14:40");
      showChapter("第一章：初步搜查",
        "北辰给了你他父亲家用电脑的远程访问权限。工作文档、家庭相册、保险箱、回收站——把这台电脑翻个底朝天。保险箱的密码提示，记得用加密频道去问北辰本人。");
      S.flags.chat_unread = true;
      renderIcons();
      break;
    case "exif_checked":
      setTimeout(() => toast("图 EXIF属性", "拍摄坐标：北纬39°54′，东经116°23′——试试搜索这组坐标，或直接搜「红星路」。", "warn"), 500);
      break;
    case "map_34":
      setTimeout(() => toast("图 星途地图", "老城区红星路34号已标记在地图上，去<b>星途</b>打开街景看看。", "", () => openApp("map")), 700);
      break;
    case "invite_known":
      setTimeout(() => toast("话 拨通了", "自动应答录音已存入星灵：邀请码是——<b>二零四八</b>。", ""), 500);
      if (S.windows.voice) refreshApp("voice");
      break;
    case "video_watched":
      if (S.windows.voice) refreshApp("voice");
      setTimeout(() => toast("影 新语音", "《B_契约.mp4》音轨已存入星灵——拿去和北辰的语音做声纹比对。", "warn", null, 6000), 600);
      break;
    case "ch1_done":
      setClockDate("2066-10-13"); setClock("20:15");
      showChapter("第二章：地下暗涌",
        "评估问卷造假、3号仓库、出逃预案……线索指向星都水面之下的世界。进入「暗涌」论坛，你需要那个邀请码——EXIF坐标、老城区、一部刮掉最后一位的电话。");
      break;
    case "dm_read":
      setClockDate("2066-10-14"); setClock("18:00");
      toast("望 主线 · 天象观测站", "D_张提到的「老地方」——市郊天象观测站。老张的旧电脑里存着密码本与三份证据，先去那里。在星途地图上点击标记，或搜索「天象观测站」。", "warn", () => openApp("map"), 9000);
      setTimeout(() => toast("网 星搜 · 政务内网", "拿到密码本后，搜索「政务内网」入侵政府后台，解开《双子计划_实施方案_2048.docx》。", "", () => openApp("browser"), 12000), 3000);
      break;
    case "gov_decrypted":
      showChapter("第三章：双重人格",
        "官方文件证实：10月15日夜里，3号仓库有一批「货物」要转运——里面可能有北辰的母亲。留给你的时间不多了。而就在这时，北辰发来紧急消息：那个「人」，回来了。");
      setTimeout(() => toast("盾 辰天集团安全网关拦截", "本会话已被标记。辰天法务部正在溯源你的访问——你看到了不该看到的东西。", "danger", null, 9000), 1200);
      setTimeout(() => {
        setFlag("ch3_started");
        S.flags.chat_unread = true;
        renderIcons();
        chatPush("them", "沈记者！！你在吗！！快回我！！", "加密用户BC");
        setTimeout(() => chatPush("them", "我刚刚在窗外看到了他。他回来了！他就在楼下！！就在楼下啊！", "加密用户BC"), 900);
        setTimeout(() => chatPush("them", "他看起来……不太一样了。他瘦了，也高了。而且他好像知道所有的事情，他看我的眼神就像……就像在看一个占了他的位置的人。", "加密用户BC"), 1800);
        setTimeout(() => chatSys("「北辰」撤回了一条消息"), 2700);
        setTimeout(() => chatPush("them", "对不起，我刚才想说什么来着……算了，当我没说。", "加密用户BC"), 3500);
        setTimeout(() => chatPush("alarm", "【短信 · 陌生号码】开门"), 4500);
        setTimeout(() => {
          toast("讯 加密频道 · 紧急", "加密用户BC：他回来了！他就在楼下！——快打开加密频道！", "danger", () => openApp("chat"));
          renderIcons();
        }, 5000);
      }, 2600);
      break;
    case "b_letter":
      setClock("22:30");
      showChapter("第四章：母体档案库",
        "「我的信用积分卡密码是『双子星』。」——用北辰B留下的后门，进入生命延续中心的员工系统，调出那份被涂改的原始评估报告。");
      break;
    case "truth_known":
      deliverMail("chen2", 1000);
      setClock("23:58");
      chatPush("alarm", "【北辰B · 实时定位】临港市东郊化工厂3号仓库。我已经混进去了。我看到了林母，还有其他被关押的人。我需要一个外部支援。后天晚上之前——不，就是今晚。");
      setTimeout(() => {
        showChapter("第五章：最后的抉择",
          "10月14日深夜。原始评估报告、举报人的录音、转运的情报——全部摆在你的桌上。北辰B在仓库里等你。发布，营救，还是沉默？",
          () => {
            if (S.difficulty !== "easy") setTimeout(() => showChoice(), 800);
          });
      }, 1800);
      break;
  }
  renderObjectives();
  renderIcons();
}

function showChoice() {
  if (has("game_over") || has("choice_route1")) return;
  openModal(`
    <div class="choice-box">
      <h3>${svgIcon("scale")} 最后的抉择</h3>
      <div class="cb-sub">10月14日，深夜。你手上有全部的真相。记者，你选哪一条路？</div>
      <div class="choice-item" data-action="choose-1">
        <div class="ci-title">${svgIcon("report")} 发布新闻 —— 曝光一切</div>
        <div class="ci-desc">把评估报告、录音、论坛截图、林父邮件整理成深度报道，立即发布。让全城的光照进3号仓库——但「转运」就在今晚，舆论跑得过警笛吗？</div>
      </div>
      <div class="choice-item" data-action="choose-2">
        <div class="ci-title">${svgIcon("monitor")} 支援小林B —— 现场营救</div>
        <div class="ci-desc">不报道。入侵仓库监控系统，帮他关掉警报、指引路线。你将是他在黑暗里唯一的眼睛。</div>
      </div>
      <div class="choice-item" data-action="choose-3">
        <div class="ci-title">${svgIcon("moon")} 隐藏证据 —— 保全小林A</div>
        <div class="ci-desc">删除一切。让北辰A忘掉所有事，作为「优选体」安全地活下去——代价是让另一个孩子，连同真相一起消失。</div>
      </div>
    </div>`);
}


function refreshApp(appId) {
  const body = document.querySelector(`[data-body="${appId}"]`);
  if (!body) return;
  const scroller = body.querySelector(".app-root") || body;
  const st = scroller.scrollTop;
  if (appId === "mail") body.innerHTML = mailHtml();
  else if (appId === "cloud") body.innerHTML = S.ui.cloud.view ? cloudView(S.ui.cloud.view) : cloudHome();
  else if (appId === "browser") body.innerHTML = renderBrowser();
  else if (appId === "remote") body.innerHTML = remoteScreen();
  else if (appId === "chat") body.innerHTML = chatHtml();
  else if (appId === "map") body.innerHTML = mapHtml();
  else if (appId === "id") body.innerHTML = idScreen();
  else if (appId === "voice") body.innerHTML = voiceHtml();
  else if (appId === "cms") body.innerHTML = cmsScreen();
  else if (appId === "log") body.innerHTML = logHtml();
  else if (appId === "obj") body.innerHTML = objectivesHtml();
  else if (appId === "doc") body.innerHTML = docReaderHtml();
  if (st > 0) {
    const s2 = body.querySelector(".app-root") || body;
    requestAnimationFrame(() => { if (s2.isConnected) s2.scrollTop = st; });
  }
}

function docReaderHtml() {
  return `<div class="app-root doc-reader">
    <div class="doc-toolbar">
      <span class="doc-file">${svgIcon("file")} 城中村拆迁手记_试读版.docx</span>
      <span class="doc-tag">未刊稿 · 试读</span>
    </div>
    <div class="doc-page">
      <div class="doc-title">城中村拆迁手记</div>
      <div class="doc-sub">——槐树街片区最后的三百天</div>
      <div class="doc-byline">沈砚 · 星都观察者（实习记者）</div>
      <div class="doc-hr"></div>
      <h4 class="doc-chapter">第一章 白纸黑字</h4>
      <p>槐树街片区的拆迁公告，是2066年3月17日贴在老槐树下的。用的是最厚的铜版纸，盖着区城建局的公章，红得刺眼。</p>
      <p>公告说，这里要建“星都数字经济产业园”。</p>
      <p>从那天起，我在槐树街蹲了三个月。四十七户人家，我敲开了四十四扇门。剩下三扇，一扇上了锁，一扇住着不肯开门的老人，一扇的门缝里塞着法院的封条。</p>
      <p>第一个愿意跟我说话的，是巷口修表的陈师傅。他把手表零件摊了一桌子，头也不抬地说：“记者同志，你知道一块表为什么会停吗？不是没上弦，是齿轮被人换了。”</p>
      <p>补偿方案贴出来的那天晚上，居委会的喇叭响了一整夜。开发商的工作人员挨家挨户送“慰问品”——一桶油，一袋米，一张印着电话的卡片。卡片背面印着一行小字：签约享额外奖励，越早越划算。</p>
      <p>我没敢告诉任何人，那家开发商的名字，我在三个月前的一份政府招标文件里见过。它同时出现在两个完全不相干的项目里。</p>
      <div class="doc-end">（试读结束 · 全文未刊稿）</div>
    </div>
  </div>`;
}
function mailHtml() {
  const list = inbox.filter(m => {
    const f = (S.ui.mail.filter || "").trim();
    if (!f) return true;
    return (m.from + m.subject + m.body).includes(f);
  });
  const sel = list.find(m => m.id === S.ui.mail.sel && S.ui.mail.acctSel === "me");
  let readPane = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--dim)">选择一封邮件</div>`;
  if (sel) {
    const acts = (sel.actions || []).map(a => {
      let disabled = "", extra = "";
      if (a.act === "reply-beichen") {
        disabled = has("reply_sent") ? "disabled" : "";
        if (has("reply_sent")) extra = "（已回复 · 一封信只回一次）";
      }
      if (a.act === "tell-xiaolin") {
        disabled = has("told_xiaolin") ? "disabled" : "";
        if (has("told_xiaolin")) extra = "（已告知）";
      }
      return `<button class="btn btn-primary" data-action="${a.act}" ${disabled}>${a.label}</button><span class="locked-note">${extra}</span>`;
    }).join("");
    readPane = `
      <h3>${esc(sel.subject)}</h3>
      <div class="mail-meta">发件人：${esc(sel.from)} &nbsp;|&nbsp; ${esc(sel.time)}</div>
      <div class="mail-content">${esc(sel.body)}</div>
      <div class="mail-actions">${acts}</div>`;
  }
  return `<div class="mail-layout">
    <div class="mail-list">
      <div class="mail-search">${svgIcon("search")}<input id="mail-filter" placeholder="搜索邮件（如：双子 / 销毁 / 北辰）" value="${esc(S.ui.mail.filter)}"></div>
      ${list.map(m => `
      <div class="mail-item ${m.unread ? "unread" : ""} ${sel && sel.id === m.id ? "selected" : ""}" data-action="mail-select" data-arg="${m.id}">
        <div class="mi-from">${esc(m.from)}</div>
        <div class="mi-subject">${esc(m.subject)}</div>
        <div class="mi-time">${esc(m.time)}</div>
      </div>`).join("")}</div>
    <div class="mail-read">${readPane}</div>
  </div>`;
}

function renderBrowser() {
  const p = S.ui.browser.page;
  if (p === "forum_top") setTimeout(() => setFlag("forum_read_top"), 200);
  if (p === "forum_b2") setTimeout(() => setFlag("forum_read_b2"), 200);
  if (p === "forum_zhang") setTimeout(() => setFlag("forum_read_zhang"), 200);
  if (p === "forum_ct") setTimeout(() => { setFlag("forum_read_ct"); toast("404 实时拦截", "辰天安全网关标记了这次访问。有人在看着你。", "danger"); }, 200);
  const fn = PAGES[p] || PAGES.noresult;
  const urlMap = {
    home: "sos.xd.net/home", results: "sos.xd.net/search?q=" + encodeURIComponent(S.ui.browser.query),
    gov_health: "www.xdhealth.gov.cn", center_official: "www.clc.xd.gov.cn",
    wiki_disease: "baike.xd.net/薛定谔-阿尔茨海默复合症", wiki_missing: "baike.xd.net/双子计划",
    social_beichen: "social.xd.net/linbeichen", lg_baike: "baike.lg.gov.cn",
    news_meeting: "observer.xd.news/2066/1012", factory: "map.xd.net/place/lingang_factory",
    rumor_destroy: "baike.xd.net/海外深造", credit: "credit.xd.gov.cn",
    novel: "novel.xd.net/shuangzi", map_34: "map.xd.net/place/hongxing34",
    missing: "people.xd.net/search", mall: "map.xd.net/place/wanxiang",
    food: "food.xd.net", pet: "pet.xd.net",
    li_doctor: "id.xd.gov/leak/cache", forum: "anyong.onion", forum_top: "anyong.onion/t/90021",
    forum_b2: "anyong.onion/t/90417", forum_zhang: "anyong.onion/t/91002", noresult: "about:blank",
    obs_locked: "map.xd.net/place/observatory", obs_article: "bbs.xd.net/thread/obs_2031",
    observatory: "map.xd.net/place/observatory · 实景",
    filtered_promo: "search.xd.net/filtered", notfound_place: "search.xd.net/notfound/place",
    notfound_li: "search.xd.net/notfound/li", notfound_zhang: "search.xd.net/notfound/zhang",
    notfound_gov: "search.xd.net/notfound/gov",
  };
  S.ui.browser.pageUrl = urlMap[p] || "sos.xd.net";
  return fn();
}


document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-action]");
  if (!t) return;
  const act = t.dataset.action, arg = t.dataset.arg;
  const R = {
    "start-game": () => {
      S.difficulty = (arg === "normal") ? "normal" : "easy";
      $("#intro-screen").classList.add("hidden");
      $("#hire-screen").classList.remove("hidden");
      playHireChat();
      beep(660, .14, .06);
      setTimeout(() => beep(880, .2, .05, .12), 160);
    },
    "hire-accept": () => {
      const bar = $("#hc-input-bar");
      if (bar) bar.innerHTML = `<span class="hc-sent">✓ 已发送：明日赴约。</span>`;
      setTimeout(() => {
        const wrap = $("#hire-card-wrap");
        if (wrap) wrap.classList.remove("hidden");
        beep(740, .1, .05);
      }, 1500);
    },
    "toggle-resume": () => {
      const bar = $("#hc-resume-bar");
      if (bar) bar.classList.toggle("folded");
    },
    "doc-read": () => {
      const hire = $("#hire-screen");
      if (!hire || hire.querySelector(".hc-doc-overlay")) return;
      const ov = document.createElement("div");
      ov.className = "hc-doc-overlay";
      ov.innerHTML = `<div class="hc-doc-box">${docReaderHtml()}<button class="btn btn-sm hc-doc-close" data-action="doc-close">✕ 关闭试读</button></div>`;
      hire.appendChild(ov);
    },
    "doc-close": () => {
      const ov = document.querySelector("#hire-screen .hc-doc-overlay");
      if (ov) ov.remove();
    },
    "hire-start": () => {
      $("#hire-screen").classList.add("hidden");
      runBoot(() => {
        $("#desktop").classList.remove("hidden");
        S.started = true;
        setClockDate("2066-10-12"); setClock("09:23");
        renderIcons(); renderObjectives();
        toast("游 难度：" + (S.difficulty === "easy" ? "简单" : "普通"),
          S.difficulty === "easy"
            ? "右侧会显示任务目标，闲置时还有提示。祝你查案顺利。"
            : "任务目标与提示已全部关闭。这座城市的水面之下，只能靠你自己了。", "warn", null, 9000);
        setTimeout(() => toast("邮 新邮件", "<b>星空之下（匿名）</b>：【求助】我的父母消失了", "", () => {
          openApp("mail"); S.ui.mail.sel = "m_anon"; S.ui.mail.acct = "me"; S.ui.mail.acctSel = "me"; refreshAll();
        }, 12000));
      });
    },
    "quick-replay": () => {
      S.difficulty = "easy";
      S.flags.game_over = false;
      S.flags.choice_route1 = false;
      $("#intro-screen").classList.add("hidden");
      $("#desktop").classList.remove("hidden");
      S.started = true;
      setClockDate("2066-10-14"); setClock("23:58");
      ["cloud_opened","e_chat1","e_chat2","e_chat3","e_photo","e_note",
       "remote_granted","r_work","r_photo1","r_photo2","r_photo3","safe_opened","usbA_opened","video_watched","letter_read",
       "ch1_done","invite_known","forum_open","forum_read_top","forum_read_b2","forum_read_zhang",
       "dm_read","obs_unlocked","obs_diary","obs_bribe","obs_map","gov_hacked","gov_decrypted",
       "backdoor_available","b_letter","li_played","vp_ab"].forEach(f => S.flags[f] = true);
      S.ui.chat.msgs = []; S.ui.chat.initialized = false;
      inbox.forEach(m => m.unread = false);
      renderIcons(); renderObjectives();
      toast("速 快速重玩", "已解锁第五章：最后的抉择。这一次，你会选择哪条路？", "warn", null, 8000);
      setFlag("truth_known");
    },
    "open-start": () => $("#start-menu").classList.toggle("hidden"),
    "open-objectives": () => openApp("obj"),
    "toggle-objective": () => { $("#objective-panel").classList.toggle("collapsed"); },
    "win-close": () => closeWin(arg),
    "win-min": () => { const w = S.windows[arg]; if (w) { w.minimized = true; w.el.style.display = "none"; updateTaskbar(); } },
    "win-max": () => {
      const w = S.windows[arg]; if (!w) return;
      const el = w.el;
      if (el.classList.contains("maximized")) {
        el.classList.remove("maximized");
        if (w._saved) { el.style.left = w._saved.x; el.style.top = w._saved.y; el.style.width = w._saved.w; el.style.height = w._saved.h; }
      } else {
        w._saved = { x: el.style.left, y: el.style.top, w: el.style.width, h: el.style.height };
        el.classList.add("maximized");
      }
      focusWin(arg);
    },
    "close-peephole": () => {
      $("#peephole-screen").classList.add("hidden");
      if (S._peepAfter) { const q = S._peepAfter; S._peepAfter = null; q(); }
    },
    "restart": () => location.reload(),
    "to-intro": () => {
      $("#ending-screen").classList.add("hidden");
      S.flags.game_over = false;
      S.flags.choice_route1 = false;
      $("#intro-screen").classList.remove("hidden");
      try {
        const done = JSON.parse(localStorage.getItem("wig_endings") || "[]");
        const bar = $("#quick-replay-bar");
        if (bar && done.length) bar.classList.remove("hidden");
      } catch (e) {}
    },
    "author-to-intro": () => {
      closeModal();
      $("#ending-screen").classList.add("hidden");
      S.flags.game_over = false;
      S.flags.choice_route1 = false;
      $("#intro-screen").classList.remove("hidden");
      try {
        const done = JSON.parse(localStorage.getItem("wig_endings") || "[]");
        const bar = $("#quick-replay-bar");
        if (bar && done.length) bar.classList.remove("hidden");
      } catch (e) {}
    },
    "author-note": () => {
      openModal(`<div class="pass-box" style="text-align:center;max-width:620px;width:94%">
        <h3 style="justify-content:center">作者寄语</h3>
        <div class="pass-hint" style="text-align:left;line-height:2;font-size:13.5px;max-height:64vh;overflow-y:auto;padding-right:6px">感谢你。<br><br>感谢你扮演沈砚。感谢你读完每一封邮件，翻过每一张照片的背面，在没有人告诉你要去哪的时候，还是把那些没有人愿意记住的名字，一个一个捡了起来。<br><br>这是我第一次做WIG游戏。如果有问题和建议，欢迎向我反馈。<br><br>在此之前，我只会写故事。我不知道什么叫状态机，不知道变量会打架，不知道一个按钮的位置能调一整个下午。写下第一版的时候，我甚至不确定它能不能跑起来。<br><br>但它跑起来了。<br><br>我必须诚实地说：这个游戏，是我和 AI 一起做出来的。剧本、世界观、那些藏在日志里的小字、那句“镜子不恨人，镜子只是记得”——是我写的。<br><br>但从第一行 console.log到最后一版调试，从状态机到时间压力条，从证据板的拖拽逻辑到三个结局的分支判定，AI 陪我走完了全程。它不知道我为什么执意要写林北辰，但它帮我把每一个 undefined 和每一处 null 都找了出来。<br><br>它是我第一个、也是唯一一个程序员同事。<br><br>有时候我觉得这件事有点奇妙：一个关于“复制体”和“备份”的故事，最终是被一个由无数文本训练出来的存在，帮我一砖一瓦砌完的。我不知道这算不算一种呼应。<br><br>但我知道，如果没有它，这个游戏可能还停在“我只会写故事”的阶段。如果没有我，那些代码也只是一个空壳，不会有人替林北辰多说一句话。是人决定了故事走向哪里，是 AI 让故事能够抵达你面前。<br><br>现在你已经通关三次。你知道那瓶水还是温的，你知道那面镜子里有第二个人影，你知道“海外深造”四个字底下压着多少名字。你可能比我更熟悉这些角色的呼吸。<br><br>这就是我做这个游戏想要的东西：不是让你猜对谜底，而是让你在心里，替他们多活了一遍。谢谢你替我做到了。谢谢你愿意在这个城市里，为一个十八岁的男孩停下来。<br><br>最后，谢谢你走完全部三个结局。<br><br>但是。请等一下。<br><br>当你合上这个故事的时候，有没有一个念头闪过——<br><br>那 001 到 099 号呢？<br><br>故事里只提到过一句话：母体是双子计划最初的那批备份体，编号 001 到 099，全部活过了 18 岁，却从来没有被处置。<br><br>他们是谁？<br><br>他们被关在哪里？<br><br>这六年里，他们看着身边的人一个一个被“送走”，他们又做了什么？<br><br>还有那个在暗涌论坛置顶了十年帖子、从来没有露过真面目的守夜人——他到底是一个人，还是一个组织，还是一种更古老的东西？<br><br>以及，那个在档案里被涂黑的 07 号。他到底是死了，还是只是被藏起来了？三个月后，沈砚会在一个深夜，收到一封没有发件人的邮件。邮件正文只有五个字：<br><br>「他还活着。07。」<br><br>——《星都双子2 · 双生之影》，敬请期待。<br><br>—— rwxws</div>
        <div class="pass-buttons" style="justify-content:center;gap:10px">
          <button class="btn" data-action="pass-cancel">关闭</button>
          <button class="btn btn-primary" data-action="author-to-intro">回到简介</button>
        </div></div>`);
    },
    "show-choice": () => showChoice(),
    "fb-interact": () => openModal(`<div class="pass-box" style="text-align:center">
      <h3 style="justify-content:center">${svgIcon("chat")} 贴文互动</h3>
      <div class="pass-hint">贴文互动功能维护中，请稍后再试。</div>
      <div class="pass-buttons" style="justify-content:center">
        <button class="btn" data-action="pass-cancel">知道了</button>
      </div></div>`),
    "play-v3": () => { const ev = evidences.find(x => x.id === "v3"); if (ev) playEvidence(ev); },

    
    "mail-select": () => {
      const m = inbox.find(x => x.id === arg);
      if (!m) return;
      m.unread = false;
      S.ui.mail.sel = arg; S.ui.mail.acctSel = "me";
      refreshApp("mail"); renderIcons();
    },
    "open-cloud": () => { openApp("cloud"); },
    "open-mail-from-cms": () => { openApp("mail"); S.ui.mail.sel = "m_anon"; refreshApp("mail"); },
    "reply-beichen": () => {
      if (has("reply_sent")) return;
      if (!prologueDone()) {
        toast("邮 材料还不够", "先看完网盘里的全部线索（3张截图、照片、文本），再给他一个负责任的答复。", "warn");
        return;
      }
      setFlag("reply_sent");
      refreshApp("mail");
      deliverMail("beichen1", 1600);
    },
    "open-remote": () => {
      if (has("remote_granted")) { openApp("remote"); return; }
      openModal(`
        <div class="pass-box">
          <h3>${svgIcon("monitor")} 远程连接 · LIN-PC</h3>
          <div class="pass-hint">请输入远程桌面地址和密码<br><span style="color:var(--dim)">北辰在邮件中提供了连接信息</span></div>
          <div class="id-form" style="text-align:left;margin-top:10px">
            <div style="font-size:12px;color:var(--dim);margin-bottom:4px">地址</div>
            <input id="remote-addr" placeholder="例：192.168.3.107" autocomplete="off">
            <div style="font-size:12px;color:var(--dim);margin:8px 0 4px">临时密码</div>
            <input id="remote-pass" type="password" placeholder="临时密码" autocomplete="off">
          </div>
          <div class="pass-error" id="remote-error"></div>
          <div class="pass-buttons" style="justify-content:center;margin-top:14px">
            <button class="btn" data-action="pass-cancel">取消</button>
            <button class="btn btn-primary" data-action="remote-connect-try">连接</button>
          </div>
        </div>`);
    },
    "remote-connect-try": () => {
      const addr = ($("#remote-addr").value || "").trim();
      const pass = ($("#remote-pass").value || "").trim();
      if (addr === "192.168.3.107" && pass === "bc1027") {
        closeModal(); ding();
        setFlag("remote_granted");
        openApp("remote");
      } else {
        beepErr();
        const el = $("#remote-error");
        if (el) el.textContent = "连接失败。地址或密码错误。（提示：查看北辰的回复邮件）";
      }
    },
    "open-cloud-from-cms": () => openApp("cloud"),
    "hack-gov": () => {
      if (has("gov_hacked")) return;
      if (!has("obs_unlocked")) { toast("锁 需要密码本", "先去天象观测站拿到密码本，再回来入侵政务内网。", "warn"); return; }
      const term = $("#hack-terminal");
      if (!term) return;
      term.style.display = "block";
      term.innerHTML = `<div class="txt-file" style="font-size:12px;line-height:1.9;min-height:100px;color:#a8d8b8">
        > 正在扫描目标 10.0.0.254:443 ...<br>
        > 发现注入点 /admin/login<br>
        > 绕过认证 ... 成功<br>
        > 获取会话 ... 管理员权限<br>
        > 正在下载文件：双子计划_实施方案_2048.docx<br>
        > <span style="color:var(--accent)">✓ 下载完成 · AES-256 加密（密文已缓存）</span></div>`;
      beep(300, .3, .04);
      beep(440, .2, .03, .4);
      beep(660, .15, .03, .7);
      setTimeout(() => {
        setFlag("gov_hacked");
        toast("夹 入侵成功", "已获取官方内部文件（AES-256 加密）。用观测站拿到的密码本解开它。", "danger");
        refreshApp("browser");
        ding();
      }, 2200);
    },


    
    "cloud-unlock": () => {
      const v = ($("#cloud-pass").value || "").trim();
      if (v === "20481015") {
        setFlag("cloud_opened"); ding(); refreshApp("cloud");
        toast("开 网盘已解锁", "2048年10月15日——北辰的生日。文件夹「线索」已打开。", "");
      } else { beepErr(); const el = $("#cloud-error"); if (el) el.textContent = "密码错误。提示：YYYYMMDD，8位。他今年18岁。"; }
    },
    "cloud-view": () => { S.ui.cloud.view = arg; refreshApp("cloud"); checkPrologue(); },
    "cloud-home": () => { S.ui.cloud.view = null; refreshApp("cloud"); },
    "toggle-photo-back": () => { if (t) t.classList.toggle("flipped"); },
    "cloud-exif": () => {
      setFlag("exif_checked");
      const box = $("#exif-box");
      if (box) box.innerHTML = `<div class="transcript" style="margin-top:10px"><div class="t-label">文件属性 · 2048留念.jpg</div>
        <div class="mono" style="font-size:12.5px;line-height:2">拍摄日期：2048-06-01<br>设备：XINGDU-P20<br>GPS：北纬39°54′，东经116°23′<br>（尝试搜索这组坐标……）</div></div>`;
    },

    
    "remote-view": () => {
      if (arg === "usbA") {
        if (has("usbA_opened")) { S.ui.remote.view = "usbA"; refreshApp("remote"); return; }
        S._passTries = 0;
        S._passForceHint = "「星空还在」——保险箱里那张纸条上的接头暗号。";
        passwordModal({
          title: "U盘A · 已加密",
          hint: `密码提示（老张附言）：「密码还是老样子，你知道的。」<br>${svgIcon("spark")} 和纸条上那句接头暗号是同一句。`,
          placeholder: "输入暗号",
          check: v => v === "星空还在",
          onOk: () => { setFlag("usbA_opened"); S.ui.remote.view = "usbA"; refreshApp("remote"); tryCh1Done(); },
        });
        return;
      }
      S.ui.remote.view = arg; refreshApp("remote");
    },
    "remote-desktop": () => { S.ui.remote.view = "desktop"; refreshApp("remote"); },
    "remote-folder2": () => {
      if (has("safe_opened")) { S.ui.remote.view = "safe_inside"; refreshApp("remote"); return; }
      S._passTries = 0;
      S._passForceHint = "2049年3月12日——北辰第一次开口叫「妈妈」的日子 → 20490312";
      passwordModal({
        title: "林父的保险箱",
        hint: `密码提示：「北辰第一次开口说话的日子」。<br>${svgIcon("spark")} 加密频道里，北辰告诉过你：2049年3月12日。`,
        placeholder: "8位数字（YYYYMMDD）",
        numeric: true,
        check: v => v === "20490312",
        onOk: () => { setFlag("safe_opened"); S.ui.remote.view = "safe_inside"; refreshApp("remote"); tryCh1Done(); },
      });
    },
    "restore-letter": () => {
      setFlag("letter_read"); tryCh1Done();
      refreshApp("remote");
      setTimeout(() => { const lb = $("#letter-box"); if (lb) lb.innerHTML = letterHtml(); }, 50);
    },

    
    "chat-ask-safe": () => {
      setFlag("safe_asked");
      chatPush("me", "北辰，我爸保险箱的密码提示——你说你问过妈妈？");
      chatPush("them", "嗯。「我第一次开口说话的日子」。2049年3月12日，我第一次开口叫妈妈。八位数字：20490312。", "加密用户BC");
      refreshApp("chat");
    },
    "chat-choice": () => {
      if (has("ch3_chose")) return;
      setFlag("ch3_chose");
      if (arg === "open") {
        chatPush("me", "开门吧。就当是面对一个『弟弟』。我在线，有任何动静马上说话。");
      } else {
        chatPush("me", "别开！锁好门，装作家里没人。隔着门也能谈。");
      }
      setTimeout(() => {
            if (arg === "open") chatPush("them", "……他没进来。他只是把一个信封塞进北辰手里，然后转身走了。走之前他回头看了我一眼。那一眼，像看了我一辈子。", "加密用户BC");
            else chatPush("them", "……我没开门。他在门外站了很久，一句话没说，把一个信封塞进门缝就走了。", "加密用户BC");
            setTimeout(() => {
              chatPush("them", "我把信封拍给你。", "加密用户BC");
              chatPush("envelope", `哥哥（请允许我这么叫你）：

我知道你害怕我。我也害怕我自己。

小时候，我们总是一起玩。你喜欢看星星，我喜欢看电路板。妈妈说我太安静了，你太闹了。但我觉得那样很好，我们刚好互补。

后来，他们把我带走了。在那个白色的房间里，我每天都在想，他们为什么不要我了。是我不够好吗？还是我天生就是不该存在的错误？

我恨过你。我恨你抢走了他们。

但现在我知道了，他们为了救你，把我变成了「魔鬼」。他们在我的评估报告上写了「反社会」、「危险」。那是假的。我只是……不知道该怎么像你一样笑得那么开心。

明天晚上，妈妈会在3号仓库被转移。他们要把所有「不听话的冗余体」集中销毁。如果你还认我这个弟弟，就来救妈妈。我会在仓库等你们。

他们说我脑子里装着「回声计划」的初始密钥。我不知道什么是回声，但我知道——他们想把所有「冗余体」的意识，变成数字奴隶。

对了，我的信用积分卡密码是「双子星」。你可以用这个进入生命延续中心的员工系统，调出我的原始评估报告。你会发现，我本来才是那个应该活下来的人。

——你的弟弟，北辰B`);
              toast("邮 北辰B的信", "信里藏着进入母体档案库的钥匙——读完它。", "warn", () => openApp("chat"));
            }, 900);
      }, 1100);
    },
    "chat-letter-done": () => {
      setFlag("backdoor_available");
      setFlag("b_letter");
      setTimeout(() => {
        toast("引 下一步", "回到桌面，打开「居民ID系统」——多出了一个「隐蔽后门（北辰B提供）」标签页。", "warn", () => openApp("id"), 12000);
      }, 1200);
    },

    
    "map-pin": () => {
      const pin = MAP_PINS.find(p => p.name === arg);
      const info = (pin || {}).info || "";
      const el = $("#map-info");
      if (arg.includes("天象观测站") && has("dm_read")) {
        if (el) el.innerHTML = `<b>${svgIcon("pin")} ${esc(arg)}</b><br>${esc(info)}<br><br><button class="btn btn-primary" data-action="obs-enter-from-map">${svgIcon("key")} 进入观测站（D_张情报关联地点）</button>`;
        return;
      }
      if (el) el.innerHTML = `<b>${svgIcon("pin")} ${esc(arg)}</b><br>${esc(info)}`;
    },
    "pin-34": () => { S.ui.map.view = "street"; refreshApp("map"); },
    "pin-factory": () => toast("位 3号仓库", "临港市东郊 · 紧邻货运铁路 · 新增监控（9月架设）", "warn"),
    "open-streetview": () => { S.ui.map.view = "street"; openApp("map"); },
    "map-maintenance": () => toast("卫 星途地图", "该功能正在<b>地图维护中</b>，暂不可用。", "warn", null, 3500),
    "gov-decrypt": () => {
      const k = ($("#gov-dec-key").value || "").trim();
      if (k === "0412") {
        setFlag("gov_decrypted");
        toast("开 解密成功", "密码本校验通过，《双子计划_实施方案_2048.docx》已可读。", "warn", null, 6000);
        refreshApp("browser");
      } else {
        beepErr();
        const e = $("#gov-dec-err");
        if (e) e.textContent = "✕ 密钥错误——加密层拒绝。再想想观测站墙上那个红笔圈住的四位数字。";
      }
    },
    "map-city": () => { S.ui.map.view = "city"; refreshApp("map"); },

    
    "obs-enter-from-map": () => {
      closeWin("map");
      S.ui.obs.view = "outside";
      S.ui.browser.page = "observatory";
      openApp("browser");
      refreshApp("browser");
    },
    "obs-enter-pc": () => {
      S.ui.obs.view = "pc";
      refreshApp("browser");
    },
    "obs-look-around": () => {
      const box = $("#obs-around");
      if (box) box.innerHTML = `<div class="hint-box" style="margin-top:12px">${svgIcon("flashlight")} 你仔细看了看周围：行军床下有一双男式运动鞋（42码），保温壶里的水还是温的——老张可能刚离开不久。墙上钉着一张星图，某个星座的位置被红笔圈了出来，旁边写着：「0412」。</div>`;
    },
    "obs-unlock": () => {
      const v = ($("#obs-pass").value || "").trim();
      if (v === "0412") {
        S.ui.obs.unlocked = true;
        S.ui.obs.view = "pc_home";
        ding();
        refreshApp("browser");
        toast("开 电脑解锁", "老张的电脑打开了。桌面上有三个文件——日记、账目、结构图。", "warn");
      } else {
        beepErr();
        S.ui.obs.tried = S.ui.obs.tried || [];
        if (!S.ui.obs.tried.includes(v)) S.ui.obs.tried.push(v);
        const el = $("#obs-error");
        if (el) el.textContent = `密码错误。已尝试：${S.ui.obs.tried.join("、")}——想想老张儿子的编号。`;
      }
    },
    "obs-file": () => {
      S.ui.obs.view = arg;
      refreshApp("browser");
      if (arg === "diary") beep(660, .1, .04);
      if (arg === "bribe") beep(440, .1, .04);
      if (arg === "warehouse_map") beep(550, .1, .04);
    },
    "obs-back-pc": () => { S.ui.obs.view = "pc_home"; refreshApp("browser"); },
    "obs-back-outside": () => { S.ui.obs.view = "outside"; refreshApp("browser"); },
    "dial": () => {
      const d = String(arg);
      beep(600, .08, .06);
      if (d === "6") {
        S.ui.map.dial = "6";
        beepRing();
        setFlag("invite_known");
        refreshApp("map");
      } else {
        S.ui.map.dial = "";
        S.ui.map.tried = S.ui.map.tried || [];
        if (!S.ui.map.tried.includes(d)) S.ui.map.tried.push(d);
        S.ui.map.phoneMsg = `「您拨打的号码是空号，请查证后再拨。」——忙音。（已试过：${S.ui.map.tried.join("、")}）再试一位。`;
        beepErr();
        refreshApp("map");
      }
    },

    
    "forum-enter": () => { closeModal(); S.ui.browser.page = "forum"; refreshApp("browser"); },
    "forum-gate": () => {
      const v = ($("#invite-input").value || "").trim();
      if (v === "2048") {
        setFlag("forum_open"); ding();
        openModal(`<div class="pass-box" style="text-align:center">
          <h3 style="justify-content:center">临时账号分配</h3>
          <div class="pass-hint">「暗涌」不记录真实身份。系统为你分配临时代号：<br><b style="font-size:24px;color:#7fd6a0;letter-spacing:4px;font-family:var(--mono)">夜航者_2048</b><br><br>水面上是他们的城市，水面下是我们的。</div>
          <div class="pass-buttons" style="justify-content:center">
            <button class="btn btn-primary" data-action="forum-enter">进入「暗涌」</button>
          </div></div>`);
      } else {
        beepErr(); const el = $("#forum-error");
        if (el) el.textContent = "邀请码无效。邀请码藏在「老地方」的一部老电话里。";
      }
    },

    
    "do-search": () => {
      if (arg) { doSearch(arg); return; }
      const el = $("#search-input"); if (el) doSearch(el.value);
    },
    "quick-search": () => doSearch(arg),
    "open-page": () => { S.ui.browser.page = arg; refreshApp("browser"); },
    "gov-sub": () => { S.ui.govSub = arg || "crlcs"; refreshApp("browser"); },
    "center-sub": () => { S.ui.centerSub = arg || "home"; refreshApp("browser"); },
    "maint": () => toast("维 页面维护中", "该板块正在维护，暂未开放。", "warn", null, 3500),
    "go-home": () => { S.ui.browser.page = "home"; S.ui.browser.query = ""; S.ui.browser.results = null; refreshApp("browser"); },
    "browser-back": () => {
      if (S.ui.browser.page !== "home") {
        S.ui.browser.page = "home"; S.ui.browser.query = ""; S.ui.browser.results = null; refreshApp("browser");
        beep(500, .05, .03);
      }
    },
    "browser-forward": () => { beep(400, .05, .02); },
    "browser-refresh": () => { refreshApp("browser"); beep(600, .08, .03); toast("刷 已刷新", "页面已重新加载。", "", null, 2000); },
    "clear-search-history": () => { S.searchHistory = []; refreshApp("browser"); },

    
    "id-mode": () => { S.ui.id.mode = arg; refreshApp("id"); },
    "id-login": () => {
      const u = $("#id-user").value.trim(), p = $("#id-pass").value.trim();
      if (u === "GAZ-0307" && p === "observer2066") { S.ui.id.pressLogged = true; ding(); refreshApp("id"); }
      else { beepErr(); $("#id-error").textContent = "账号或密码错误。账号密码在你的主编发来的邮件里。"; }
    },
    "id-query": () => { S.ui.id.query = $("#id-query").value.trim(); refreshApp("id"); },
    "bd-login": () => {
      const p = $("#bd-pass").value.trim();
      if (p === "双子星") {
        S.ui.id.backdoorLogged = true; ding();
        toast("洞 越权成功", "「欢迎，林北辰B。访问权限：次级管理员。」", "danger");
        refreshApp("id");
      } else { beepErr(); $("#bd-error").textContent = "密码错误。北辰B说过：他的信用积分卡密码。"; }
    },
    "arch-query": () => { S.ui.id.archQuery = $("#arch-query").value.trim(); refreshApp("id"); },
    "arch-recheck": () => { S.ui.id.recheck = true; refreshApp("id"); },
    "dec-tape": () => {
      const k = ($("#tape-dec-key").value || "").trim();
      if (k === "2048") {
        S.ui.id.tapeDecrypted = true;
        toast("开 解密完成", "录音已解密，现在可以播放了。", "", null, 3000);
        refreshApp("id");
      } else {
        beepErr();
        const e = $("#tape-dec-err");
        if (e) e.textContent = "✕ 私钥不匹配——这扇地下的门，暗号是那四个你最早记住的数字。";
      }
    },
    "play-li-tape": () => {
      const box = $("#tape-box");
      if (!box || has("li_played")) return;
      S.flags.li_played = true;
      beep(300, .6, .04); beep(280, .8, .03, .5);
      setTimeout(() => { box.innerHTML = liTapeHtml(); setFlag("truth_known"); }, 2000);
    },

    
    "voice-select": () => { S.ui.voice.sel = arg; refreshApp("voice"); },
    "voice-play": () => {
      S.ui.voice.sel = arg; refreshApp("voice");
      const ev = evidences.find(x => x.id === arg);
      if (ev) playEvidence(ev);
    },
    "voice-stop": () => { stopVoiceAudio(); S.ui.voice.sel = null; refreshApp("voice"); },
    "play-morse": () => { playVoiceAudio("assets/Morse code.wav"); toast("摩斯密码音频", "正在播放……对照星图旁的点划，翻译出四位数字。", "", null, 4000); },
    "vp-compare": () => {
      const a = $("#vp-a").value, b = $("#vp-b").value;
      S.ui.voice.vpA = a; S.ui.voice.vpB = b;
      let result = "";
      if (a === b) result = "⚠ 请选择两段<b>不同</b>的音频进行比对。";
      else {
        const rule = VP_RULES.find(r => (r.a === a && (r.b === b || r.b === "*")) || (r.a === b && r.b === a));
        result = rule ? rule.text : "<span class='diff'>声纹不一致。</span>两段音频来自不同的人。";
        const isAB = (x) => x === "v1" || x === "v4";
        if ((a === "v3" && isAB(b)) || (b === "v3" && isAB(a))) {
          if (!has("vp_ab")) {
            setFlag("vp_ab");
            toast("因 声纹分析 · 证据入档", "结论：<b>存在两个「林北辰」。</b>这份比对报告足以支撑报道、向中心施压——带着它继续调查。", "warn", null, 11000);
          }
        }
      }
      S.ui.voice.vpResult = result;
      refreshApp("voice");
    },

    /* CMS */
    "cms-tab": () => { S.ui.cms.tab = arg; refreshApp("cms"); },
    "publish-report": () => {
      openModal(`<div class="pass-box" style="text-align:center">
        <h3 style="justify-content:center">${svgIcon("alert")} 确认发布？</h3>
        <div class="pass-hint">这篇报道将推送至全城四千万人。一旦发出，无法撤回。<br>你确定要按下这个按钮吗？</div>
        <div class="pass-buttons" style="justify-content:center">
          <button class="btn" data-action="pass-cancel">再想想</button>
          <button class="btn btn-danger" data-action="publish-confirm">发布（结局一）</button>
        </div></div>`);
    },
    "publish-confirm": () => {
      closeModal();
      setClockDate("2066-10-15"); setClock("00:12");
      const t = $("#cms-title");
      showNewsburst(t && t.value ? t.value : null);
    },
    "nb-go": () => { $("#newsburst-screen").classList.add("hidden"); showEnding(1); },

    
    "choose-1": () => {
      closeModal(); setFlag("choice_route1"); openApp("cms");
      S.ui.cms.tab = "editor"; refreshApp("cms");
      toast("记 写下真相", "编辑器已解锁。检查你的标题和正文，然后按下那个按钮。", "danger");
    },
    "choose-2": () => {
      closeModal();
      setClockDate("2066-10-15"); setClock("00:47");
      showMonitor();
    },
    "choose-3": () => {
      closeModal();
      openModal(`<div class="pass-box" style="text-align:center">
        <h3 style="justify-content:center">${svgIcon("moon")} 确认删除一切？</h3>
        <div class="pass-hint">删除帖子、格式化U盘、销毁录音。<br>让北辰A忘了这一切，安全地活下去——<br>代价是让另一个孩子，连同真相一起消失。<br><b>这个选择无法撤销。</b></div>
        <div class="pass-buttons" style="justify-content:center">
          <button class="btn" data-action="pass-cancel">住手</button>
          <button class="btn btn-danger" data-action="delete-confirm">删除一切（结局三）</button>
        </div></div>`);
    },
    "delete-confirm": () => {
      closeModal();
      setClockDate("2066-10-15"); setClock("00:03");
      showEnding(3);
    },
    "mon-step": () => monStep(parseInt(arg, 10)),

    
    "pass-try": () => tryPassword(),
    "pass-cancel": () => closeModal(),
  };
  if (R[act]) { e.stopPropagation(); R[act](); }
});

function checkPrologue() {
  if (prologueDone()) setFlag("prologue_done");
}


document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const t = e.target;
  if (!t || !t.id) return;
  if (t.id === "search-input") doSearch(t.value);
  else if (t.id === "cloud-pass") document.querySelector('[data-action="cloud-unlock"]')?.click();
  else if (t.id === "pass-input") tryPassword();
  else if (t.id === "invite-input") document.querySelector('[data-action="forum-gate"]')?.click();
  else if (t.id === "id-pass") document.querySelector('[data-action="id-login"]')?.click();
  else if (t.id === "id-query") document.querySelector('[data-action="id-query"]')?.click();
  else if (t.id === "bd-pass") document.querySelector('[data-action="bd-login"]')?.click();
  else if (t.id === "arch-query") document.querySelector('[data-action="arch-query"]')?.click();
  else if (t.id === "mail-filter") mailFilter(t.value);
});

document.addEventListener("input", (e) => {
  if (e.target && e.target.id === "mail-filter") mailFilter(e.target.value);
});

["mousedown", "touchstart"].forEach(ev => document.addEventListener(ev, (e) => {
  const sm = $("#start-menu");
  if (sm && !sm.classList.contains("hidden") && !e.target.closest("#start-menu") && !e.target.closest('[data-action="open-start"]')) {
    sm.classList.add("hidden");
  }
}, { passive: true }));

["mousedown", "touchstart"].forEach(ev => $("#modal-layer").addEventListener(ev, (e) => { if (e.target.id === "modal-layer") closeModal(); }, { passive: true }));


const LOG_POOL = [
  ["mailsvc", "邮件服务连接失败，正在重试 (3/5)", "err"],
  ["content-filter", "舆情安全策略已更新（版本 2066.10.14-3）", ""],
  ["credit-sync", "居民信用积分批量同步完成 · 异常账户 17", "warn"],
  ["clc-gw", "生命延续中心专线握手成功 · 对方证书将于 11 天后过期", "warn"],
  ["watchdog", "进程 anyong-probe 已被终止 —— 策略：静默", "warn"],
  ["fs", "目录 SystemVolume\\del_queue 清理完成 · 已粉碎 1,304 个文件", ""],
  ["audit", "词条「双子计划」复审通过（维持：不存在）", "ok"],
  ["net", "检测到端口扫描 · 源地址伪装为 0.0.0.0 · 已忽略", ""],
  ["clock-sync", "授时中心偏差 +0.34s 已校正", ""],
  ["ui", "主题包「星都蓝 v9」热更新完成", ""],
  ["camera-mesh", "临港东郊网格：新增节点 ×2 · 固件 3.3.1", "warn"],
  ["mailsvc", "垃圾邮件拦截：『热心市民』类邮件 41 封", ""],
  ["id-gov", "户籍档案访问审计：GAZ-0307 查询次数 +1", "warn"],
  ["push", "早安推送队列：『今天也是为文明努力的一天』×41,000,000", ""],
  ["kernel", "内存整理完成 · 释放 218MB", ""],
  ["uplink", "与邻市临港的同步延迟 412ms · 阈值 400ms", "warn"],
];
let logSeq = 0;
function logTimestamp() {
  const s = String(Math.floor(Math.random() * 60)).padStart(2, "0");
  return `${S.clock.date} ${S.clock.time}:${s}`;
}
function logLine() {
  const [tag, msg, kind] = LOG_POOL[Math.floor(Math.random() * LOG_POOL.length)];
  logSeq++;
  const cls = kind === "err" ? "tl-err" : kind === "warn" ? "tl-warn" : kind === "ok" ? "tl-ok" : "";
  return `<div><span class="tl-time">${logTimestamp()}</span><span class="${cls}">[${tag}] ${esc(msg)}</span></div>`;
}
function logHtml() {
  let seed = "";
  for (let i = 0; i < 7; i++) seed += logLine();
  return `<div class="term-root">
    <div class="term-head"><span class="th-dot"></span>system-monitor · root@xingdu-os · 全部行为匿名上报</div>
    <div class="term-body" id="log-body">${seed}</div>
  </div>`;
}
setInterval(() => {
  const body = document.getElementById("log-body");
  if (!body || !S.started) return;
  body.insertAdjacentHTML("beforeend", logLine());
  while (body.children.length > 90) body.removeChild(body.firstChild);
  body.scrollTop = body.scrollHeight + 200;
}, 2400);


let lastActive = Date.now();
["mousedown", "keydown", "touchstart"].forEach(ev => document.addEventListener(ev, () => { lastActive = Date.now(); }, true));
setInterval(() => {
  if (!S.started || S.flags.game_over || S.difficulty !== "easy") return;
  if (Date.now() - lastActive < 50000) return;
  lastActive = Date.now();
  const pool = [];
  if (!has("cloud_opened")) pool.push("试试打开「星云网盘」——密码是8位的生日。");
  if (has("cloud_opened") && !prologueDone()) pool.push("照片背面要点一下照片才看得见；也别忘了点「查看文件属性」。");
  if (has("remote_granted") && !has("safe_opened")) pool.push("保险箱的密码提示说的是北辰本人——加密频道里问他最快。");
  if (has("ch1_done") && !has("invite_known")) pool.push("照片EXIF里的坐标，能搜到老城区的一个老地址。");
  if (has("invite_known") && !has("forum_open")) pool.push("老电话的自动应答录音可以反复听——邀请码就念在里面。");
  if (has("dm_read") && !has("obs_unlocked")) pool.push("D_张提到「老地方」——星途地图上的天象观测站。老张的旧电脑里有密码本（0412）和三份证据。");
  if (has("obs_unlocked") && !has("gov_hacked")) pool.push("密码本到手了——在星搜里搜索「政务内网」，入侵政府后台。");
  if (has("gov_hacked") && !has("gov_decrypted")) pool.push("官方文件是加密的——密码本就是观测站墙上红笔圈出的四位数字。");
  if (has("b_letter") && !has("truth_known")) pool.push("北辰B给的密码是四个汉字，不是数字。");
  if (has("truth_known") && !has("game_over")) pool.push("右侧的任务目标面板里，有一个红色的按钮。");
  if (!pool.length) pool.push("桌面上那个「系统监控」窗口，偶尔会滚出一些不该被看到的东西。");
  toast("提 闪念", pool[Math.floor(Math.random() * pool.length)], "", null, 9000);
}, 8000);



function runBoot(onDone) {
  const msgs = ["正在建立加密连接…", "验证设备指纹…", "载入居民信用档案…", "同步舆情安全策略…", "欢迎回来。"];
  let i = 0;
  const fill = $("#boot-fill"), msg = $("#boot-msg");
  $("#boot-screen").classList.remove("hidden");
  fill.style.width = "0%";
  const timer = setInterval(() => {
    i++;
    fill.style.width = (i / msgs.length) * 100 + "%";
    msg.textContent = msgs[Math.min(i - 1, msgs.length - 1)];
    if (i >= msgs.length) {
      clearInterval(timer);
      setTimeout(() => {
        $("#boot-screen").classList.add("hidden");
        onDone();
      }, 500);
    }
  }, 550);
}
function boot() {
  
  $("#boot-screen").classList.add("hidden");
  $("#intro-screen").classList.remove("hidden");
  
  if (window.innerWidth <= 760) {
    const op = $("#objective-panel");
    if (op) op.classList.add("collapsed");
  }
}
boot();


(function checkQuickReplay() {
  try {
    const done = JSON.parse(localStorage.getItem("wig_endings") || "[]");
    if (done.length) {
      const bar = $("#quick-replay-bar");
      if (bar) bar.classList.remove("hidden");
    }
  } catch (e) {}
})();
