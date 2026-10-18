/* ==================================================================
   后日谈《灯塔》 · 独立模块（END/epilogue.js）
   ------------------------------------------------------------------
   第一部《星都双子》结局一《真相的重量》之后的后日谈，全部内容都在
   这个文件里，主游戏的 game.js 不含任何后日谈剧情文本：

     · 场景结构：演出幕 / 黑幕 / 监视居住角标 / 简介页回看入口（自动注入）
     · 演出文本与状态机（七拍 + 法庭 + 终幕）
     · 三封专属邮件（撤稿函 / 诉讼通知 / 传票与取保候审）
     · 与主游戏的交互钩子：邮件判定、任务目标、终刊辞文档、任务目标入口

   接入方式（index.html，顺序不能反）：
     <link rel="stylesheet" href="END/epilogue.css">
     <script src="END/epilogue.js"></script>
     <script src="game.js"></script>
   game.js 末尾会调用 EPI.init()；若本文件缺失，主游戏照常运行，
   只是没有后日谈入口。

   依赖 game.js 暴露的公共能力：
     S / inbox / pendingMails / APPS / $ / esc / svgIcon
     openApp / closeWin / refreshApp / refreshAll / renderIcons / renderObjectives
     toast / showChapter / openModal / closeModal / beep / ding
     setClock / setClockDate / deliverMail / clearMailTimers
   ================================================================== */
(function () {
  "use strict";

  var EPI = {};

  /* ---------------- 常量 ---------------- */
  var LS_KEY = "wig_epilogue_unlocked";
  var DOC_NAME_MAIN = "城中村拆迁手记 · 试读";
  var DOC_NAME_EPI = "终刊辞 · 遗稿";
  // 邮件拍的统一提示语：读完信 → 点 X 关闭窗口 → 黑屏进入下一步
  var MAIL_TIP = "阅读完邮件点 X 号关闭窗口，黑屏之后进入下一步。";
  // 虚构声明：演出幕页脚与任务栏左侧共用同一句
  var DISCLAIMER = "本后日谈为架空虚构剧情，其中涉及的法律情节均为虚构设定，请勿与现实世界对照。";

  /* ---------------- 状态 ---------------- */
  function blank() {
    return {
      __epi: true,
      active: false,
      beat: 0,
      timers: [],
      fadeT: [],
      logArmed: false,
      docReady: false,
      archived: false,
      courtPending: false,
      mailWait: null,
      mailNeed: null,
      echoShown: false,
    };
  }
  // 取当前状态；若主游戏刚刚重启（S.epi 被清空），自动补一份完整结构
  function es() {
    if (!S.epi || !S.epi.__epi) S.epi = blank();
    return S.epi;
  }
  EPI.blankState = blank;
  EPI.isActive = function () { return !!(S.epi && S.epi.active); };

  function unlocked() { try { return localStorage.getItem(LS_KEY) === "1"; } catch (e) { return false; } }
  function unlock() { try { localStorage.setItem(LS_KEY, "1"); } catch (e) {} }
  EPI.unlocked = unlocked;
  EPI.unlock = unlock;

  /* ==================================================================
     一、注入场景结构
     ================================================================== */
  var SCENE_HTML =
    '\n<!-- ===== 后日谈 · 演出幕（END/epilogue.js 注入） ===== -->\n' +
    '<div id="epilogue-screen" class="fullscreen-layer hidden">\n' +
    '  <div class="epi-inner">\n' +
    '    <div class="epi-kicker" id="epi-kicker"></div>\n' +
    '    <div class="epi-lines" id="epi-lines"></div>\n' +
    '    <div class="epi-actions" id="epi-actions"></div>\n' +
    '    <div class="epi-foot">※ ' + DISCLAIMER + '</div>\n' +
    '  </div>\n' +
    '</div>\n' +
    '\n<!-- 时间流逝 · 渐变黑过场（覆盖全部界面，含通知与目标面板） -->\n' +
    '<div id="epi-fade"></div>\n';

  function injectDom() {
    // 1) 演出幕 + 黑幕：挂在 body 末尾（fixed 定位，与主游戏层级无关）
    if (!document.getElementById("epilogue-screen")) {
      var tmp = document.createElement("div");
      tmp.innerHTML = SCENE_HTML;
      while (tmp.firstChild) document.body.appendChild(tmp.firstChild);
    }

    // 2) 右上角「监视居住」角标：必须在 #desktop 内，否则压不过窗口层
    if (!document.getElementById("epi-house-arrest")) {
      var desk = document.getElementById("desktop");
      if (desk) {
        var ha = document.createElement("div");
        ha.id = "epi-house-arrest";
        ha.className = "hidden";
        ha.dataset.action = "epi-house-arrest";
        ha.title = "监视居住执行告知书";
        ha.innerHTML = '<span class="eha-dot"></span><span class="eha-txt">监视居住</span>';
        var wl = document.getElementById("window-layer");
        if (wl) desk.insertBefore(ha, wl); else desk.appendChild(ha);
      }
    }

    // 3) 任务目标面板上的「读完点 X」常驻提示行
    if (!document.getElementById("objective-hint")) {
      var op = document.getElementById("objective-panel");
      var ot = document.getElementById("objective-text");
      if (op) {
        var oh = document.createElement("div");
        oh.id = "objective-hint";
        oh.className = "op-hint hidden";
        if (ot) ot.insertAdjacentElement("afterend", oh); else op.appendChild(oh);
      }
    }

    // 4) 简介页 · 已解锁回看入口
    if (!document.getElementById("epi-replay-bar")) {
      var qr = document.getElementById("quick-replay-bar");
      if (qr) {
        var rb = document.createElement("div");
        rb.id = "epi-replay-bar";
        rb.className = "qr-epi hidden";
        rb.innerHTML = '<span class="qr-epi-tag">已解锁 · 结局一后日谈：灯塔</span>' +
          '<button class="btn" data-action="epi-start">▶ 回看后日谈 · 灯塔</button>';
        qr.appendChild(rb);
      }
    }

    // 5) 任务栏左侧的虚构声明：只在后日谈期间显示，主线不出现
    if (!document.getElementById("epi-disclaimer")) {
      var tb = document.getElementById("taskbar");
      if (tb) {
        var dc = document.createElement("div");
        dc.id = "epi-disclaimer";
        dc.className = "hidden";
        dc.title = DISCLAIMER;
        dc.textContent = "※ " + DISCLAIMER;
        tb.insertBefore(dc, tb.firstChild);
      }
    }
  }

  /* ==================================================================
     二、清场（退出后日谈后不把「未来时间线」的痕迹留到下一周目）
     ================================================================== */
  function clearMails() {
    if (!inbox.some(function (m) { return /^m_epi_/.test(m.id); })) return false;
    inbox = inbox.filter(function (m) { return !/^m_epi_/.test(m.id); });
    if (S.ui.mail && /^m_epi_/.test(S.ui.mail.sel || "")) S.ui.mail.sel = null;
    if (S.windows.mail) refreshApp("mail");
    return true;
  }

  function clearTimers() { (es().timers || []).forEach(function (t) { clearTimeout(t); }); es().timers = []; }
  function later(fn, ms) { var t = setTimeout(fn, ms); es().timers.push(t); return t; }

  EPI.reset = function () {
    closeScreen();
    fadeCancel();
    clearMailTimers();
    (es().timers || []).forEach(function (t) { clearTimeout(t); });
    S.epi = blank();
    var ic = $("#epi-house-arrest"); if (ic) ic.classList.add("hidden");
    var dc = $("#epi-disclaimer"); if (dc) dc.classList.add("hidden");
    document.body.classList.remove("epi-dim");
    document.body.classList.remove("epi-active");
    clearMails();
    // observer.xd.news 的关停页不要留在浏览器里
    if (S.ui.browser && S.ui.browser.page === "obs_shutdown") {
      S.ui.browser.page = "home"; S.ui.browser.query = ""; S.ui.browser.results = null;
      S.ui.browser.pageUrl = "search.xd.net/home";
    }
    setDocName();
  };

  /* ==================================================================
     三、时间流逝 · 渐变黑过场
     先渐入全黑 → 在全黑中改时钟/换场景 → 再渐出。
     切换点以 transitionend 为准（附定时兜底），保证任何机器上都不会
     「半黑切换」；系统开启「减少动态效果」时直接切换，不做动画。
     ================================================================== */
  var _swap = null;
  function fadeCancel() {
    (es().fadeT || []).forEach(function (t) { clearTimeout(t); });
    es().fadeT = [];
    var f = $("#epi-fade");
    if (f && _swap) f.removeEventListener("transitionend", _swap);
    _swap = null;
    if (f) f.classList.remove("on");
  }
  function fadeRun(fn) {
    var f = $("#epi-fade");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!f || reduce) { fn(); return; }
    fadeCancel();
    f.classList.add("on");
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      f.removeEventListener("transitionend", onEnd);
      _swap = null;
      try { fn(); } finally {
        // 全黑留一拍，再把黑幕渐出
        es().fadeT = [setTimeout(function () {
          var el = $("#epi-fade"); if (el) el.classList.remove("on");
          es().fadeT = [];
        }, 180)];
      }
    };
    var onEnd = function (e) { if (e && e.propertyName && e.propertyName !== "opacity") return; finish(); };
    _swap = onEnd;
    f.addEventListener("transitionend", onEnd);
    es().fadeT = [setTimeout(finish, 1000)];   // 兜底：过渡事件未触发时也能正常推进
  }

  /* ==================================================================
     四、桌面元素同步（文档名 / 图标 / 简介页入口）
     ================================================================== */
  function setDocName() {
    if (!APPS.doc) return;
    if (EPI.isActive() && es().docReady) { APPS.doc.name = DOC_NAME_EPI; APPS.doc._epiName = true; }
    else if (APPS.doc._epiName) { APPS.doc.name = DOC_NAME_MAIN; delete APPS.doc._epiName; }
  }
  EPI.setDocName = setDocName;

  // 后日谈专属桌面图标（终刊辞 / 遗稿）
  EPI.icons = function () {
    if (!EPI.isActive() || !es().docReady) return [];
    return [{
      id: "doc", glyph: "文",
      label: es().archived ? "遗稿<br>（已归档）" : "终刊辞<br>（未发布）",
      badge: 0,
    }];
  };

  EPI.showReplayEntry = function () {
    var bar = $("#quick-replay-bar");
    var epi = $("#epi-replay-bar");
    if (!bar || !epi) return;
    if (unlocked()) { epi.classList.remove("hidden"); bar.classList.remove("hidden"); }
  };

  /* ==================================================================
     五、演出幕
     ================================================================== */
  function openScreen(grey) {
    var el = $("#epilogue-screen");
    if (!el) return;
    el.classList.remove("hidden", "closing");
    el.classList.toggle("grey", !!grey);
    document.body.classList.add("epi-stage");   // 演出幕期间让通知区让位（移动端会盖住正文）
  }
  function closeScreen() {
    var el = $("#epilogue-screen");
    if (el) { el.classList.add("hidden"); el.classList.remove("closing"); }
    document.body.classList.remove("epi-stage");
  }

  function lineHtml(l, delay) {
    var d = (typeof delay === "number") ? delay : 0;
    if (l && l.term) {
      return '<div class="epi-term">' + l.term.map(function (x, j) { return lineHtml(x, j * 0.14); }).join("") + '</div>';
    }
    var txt = (typeof l === "string") ? l : (l.text || "");
    var cls = (typeof l === "object" && l.cls) ? " " + l.cls : "";
    var raw = (typeof l === "object" && l.html !== undefined) ? l.html : esc(txt);
    return '<div class="epi-line' + cls + '" style="animation-delay:' + Math.min(d, 12) + 's">' + raw + '</div>';
  }

  function render(kicker, lines, actions, grey) {
    openScreen(grey);
    var k = $("#epi-kicker"); if (k) k.innerHTML = kicker || "";
    var box = $("#epi-lines");
    if (box) {
      // 逐行累积出场时间：普通行间隔 0.16s，`pause` 表示这行之前额外停顿；
      // 终端块按行数占用时间，避免后文在日志还在刷的时候就冒出来。
      var acc = 0;
      box.innerHTML = (lines || []).map(function (l) {
        if (l && typeof l === "object" && l.pause) acc += l.pause;
        var node = lineHtml(l, acc);
        if (l && l.term) acc += Math.min(l.term.length * 0.14, 3) + 0.55;
        else acc += 0.16;
        return node;
      }).join("");
    }
    var act = $("#epi-actions");
    if (act) {
      act.innerHTML = "";
      (actions || []).forEach(function (a) {
        var b = document.createElement("button");
        b.className = "btn " + (a.primary ? "btn-primary" : "");
        b.innerHTML = a.label;
        b.onclick = function () { beep(660, .05, .03); if (a.onClick) a.onClick(); };
        act.appendChild(b);
      });
    }
  }

  // 入侵那一刻的红屏（脚本：屏幕一片红色，然后是一行小字）
  function redFlash() {
    var f = $("#epi-fade");
    if (!f) return;
    f.classList.add("red", "flash");
    void f.offsetWidth;
    f.classList.add("on");
    later(function () { var el = $("#epi-fade"); if (el) el.classList.remove("on"); }, 340);
    later(function () { var el = $("#epi-fade"); if (el) { el.classList.remove("red"); el.classList.remove("flash"); } }, 1300);
  }

  // 演出幕淡出后再收起（法庭退庭用）
  function closeSoft(cb) {
    var el = $("#epilogue-screen");
    if (!el || el.classList.contains("hidden")) { if (cb) cb(); return; }
    el.classList.add("closing");
    var t = setTimeout(function () {
      el.classList.remove("closing");
      el.classList.add("hidden");
      document.body.classList.remove("epi-stage");
      if (cb) cb();
    }, 520);
    es().timers.push(t);
  }

  /* ==================================================================
     六、目标面板 / 邮件提示
     ================================================================== */
  function mailRead() {
    var need = (S.epi && S.epi.mailNeed) || [];
    return need.some(function (id) {
      var m = inbox.find(function (x) { return x.id === id; });
      return m && !m.unread;
    });
  }
  function mailHintText() {
    if (!EPI.isActive() || !es().mailWait) return "";
    if (!mailRead()) return MAIL_TIP;
    return "信读完了？点 X 号关闭窗口，黑屏之后进入下一步。";
  }
  // 邮件正文底部的同款提示（只对「读完能推进」的那封显示）
  EPI.mailTipFor = function (id) {
    if (!EPI.isActive() || !es().mailWait) return "";
    if (!(es().mailNeed || []).includes(id)) return "";
    return MAIL_TIP;
  };
  // 任务目标面板上的常驻提示行（元素由本模块注入）
  EPI.updateObjectiveHint = function () {
    var oh = $("#objective-hint");
    if (!oh) return;
    var ht = mailHintText();
    oh.textContent = ht;
    oh.classList.toggle("hidden", !ht);
  };

  function objectiveText() {
    if (!EPI.isActive()) return "";
    var b = es().beat;
    if (b >= 7) return "后日谈 · 完（两年后，故事继续）";
    if (b === 1) return "留意辰天的下一步。";
    if (b === 2) return "48 小时。看着时钟。";
    if (b === 3) return "等辰天的下一步。";
    if (b === 4) return "取保候审期间。等开庭。";
    if (b === 5) return es().docReady ? "写下终刊辞。" : "有人敲门。";
    if (b === 6) return es().courtPending ? "开庭。" : "监视居住。";
    return "……";
  }
  EPI.objectiveText = objectiveText;

  function objectiveList() {
    var b = es().beat;
    var L = [];
    var add = function (text, done, current) { L.push({ text: text, done: done, current: current }); };
    add("目睹报道引爆全城（结局一）", true, false);
    add("收下辰天法务部的撤稿函，没有撤稿", b > 2, b === 2);
    add("深夜面对「回声」：入侵，或到此为止", b > 3, b === 3);
    add("收到诉讼通知与传票，取保候审", b > 4, b === 4);
    add("写下终刊辞，归档为「遗稿」", b > 5, b === 5);
    add("出庭，听判决", b > 6, b === 6);
    if (b > 6) add("后日谈 · 完：灯塔", true, true);
    return L;
  }
  EPI.objectiveList = objectiveList;

  // 「任务目标」窗口里的内容（后日谈期间覆盖主游戏版本）
  EPI.objectivesHtml = function () {
    if (!EPI.isActive()) return "";
    var list = objectiveList().filter(function (i) { return i.done || i.current; })
      .map(function (i) { return '<li class="' + (i.done ? "done" : "") + ' ' + (i.current ? "current" : "") + '">' + i.text + '</li>'; }).join("");
    var mt = mailHintText();
    return '<div class="app-root">\n' +
      '    <h3 class="app-title">后日谈 · 灯塔</h3>\n' +
      '    <div class="app-sub">当前：' + esc(objectiveText()) + '</div>\n' +
      '    <ul class="obj-list">' + list + '</ul>\n' +
      (mt ? '<div class="hint-box" style="border-left-color:#d99a2b;background:rgba(255,180,84,.10);color:#8a5a00">' + svgIcon("letter") + ' ' + mt + '</div>' : "") +
      '\n    <div class="hint-box">' + svgIcon("spark") + ' 后日谈会跟着你的操作推进。出现提示时，顺着提示走即可；桌面上的每一个窗口，都可能是线索。</div>\n' +
      '  </div>';
  };

  /* ==================================================================
     七、进入
     ================================================================== */
  EPI.start = function () {
    EPI.reset();
    // 从结局页进来时，上一局留下的窗口不应带到后日谈里
    Object.keys(S.windows).forEach(function (k) { closeWin(k); });
    es().active = true;
    document.body.classList.add("epi-active");
    var dsc = $("#epi-disclaimer"); if (dsc) dsc.classList.remove("hidden");
    S.started = true;
    unlock();
    S.flags.epilogue_unlocked = true;
    $("#intro-screen").classList.add("hidden");
    $("#ending-screen").classList.add("hidden");
    $("#desktop").classList.remove("hidden");
    setDocName();
    renderIcons(); renderObjectives();
    // 邮箱复位：避免上一局留下的搜索词/账户把后日谈的邮件挡住
    S.ui.mail.filter = ""; S.ui.mail.acct = "me"; S.ui.mail.acctSel = "me";
    setClockDate("2066-10-15"); setClock("00:12");
    toast("塔 后日谈 · 灯塔", "报道发出的那个凌晨之后，故事还没有结束。", "", null, 7000);
    beat(1);
  };

  /* ==================================================================
     八、状态机
     ================================================================== */
  function beat(n) {
    if (!EPI.isActive()) return;
    es().beat = n;
    clearTimers();
    // 时间跳转统一走「渐变黑」过场：黑幕盖住界面后再改时钟、换场景
    fadeRun(function () {
      setDocName();
      renderObjectives();
      renderIcons();
      if (n === 1) beat1();
      else if (n === 2) beat2();
      else if (n === 3) beat3();
      else if (n === 4) beat4();
      else if (n === 5) beat5();
      else if (n === 6) beat6();
    });
  }
  function goto(n) { if (!EPI.isActive()) return; if (es().beat >= n) return; beat(n); }

  /* —— 第一拍 · 轰动 —— */
  function beat1() {
    // 脚本：00:12（发布）→ 08:00（报道发出六小时后）
    setClockDate("2066-10-15"); setClock("08:00");
    render("FIRST · 轰动", [
      "报道发出六个小时，热搜第一。",
      "天亮的时候，星都四千万人，几乎人人都在说同一件事。",
      "那天下午，特警突入 3 号仓库，救出林北辰的父母，以及十七名即将被「转运」的冗余体。",
      "那天晚上，辰天集团股价跌停。深夜，辰天发布声明：系「个别底层员工的违规操作」，与集团无关。",
      { text: "所有人都知道这是断尾求生。", cls: "dim" },
      { text: "但所有人都没有证据。", cls: "dim" },
    ], [{ label: "继续 →", primary: true, onClick: function () { closeScreen(); goto(2); } }]);
  }

  /* —— 第二拍 · 撤稿函 —— */
  function beat2() {
    closeScreen();
    setClockDate("2066-10-18"); setClock("09:00");
    // 邮件判定：读完撤稿函 + 点 X 关闭窗口 → 黑屏进入第三拍（无自动跳转）
    es().mailWait = 3;
    es().mailNeed = ["m_epi_recall"];
    renderObjectives();
    deliver("epi_recall", 900);
    toast("函 撤稿函", "辰天集团法务部发来一封函告——四十八小时的倒计时，开始了。<span class=\"t-hint\">" + MAIL_TIP + "</span>", "warn", function () { openApp("mail"); }, 12000);
  }

  /* —— 第三拍 · 深夜 —— */
  function beat3() {
    closeScreen();
    setClockDate("2066-10-19"); setClock("23:47");
    es().logArmed = true;
    if (S.windows.log) refreshApp("log");
    toast("监 系统监控 · 日志", "日志停在一行新的条目上——点开「系统监控」，看看那行字。", "warn", function () { openApp("log"); }, 13000);
    later(curtain, 45000);
  }
  function curtain() {
    if (!EPI.isActive() || es().beat !== 3 || es().echoShown) return;
    es().echoShown = true;
    es().logArmed = false;
    clearTimers();
    if (S.windows.log) refreshApp("log");
    render("THIRD · 深夜", [
      "深夜十一点四十七分。",
      "他把老张的密码本又翻了一遍。",
      { text: "「回声」这个名字，他在北辰B 的信里见过——「他们想把所有冗余体的意识，变成数字奴隶。」", cls: "quote" },
      "他把手指放在回车键上。",
      { text: "屏幕上的光标闪了七下。", cls: "dim" },
    ], [
      { label: "入侵「回声」", primary: true, onClick: function () { echo(true); } },
      { label: "到此为止", onClick: function () { echo(false); } },
    ]);
  }
  function echo(invaded) {
    var lines = invaded ? [
      "> 握手成功 · 复用密码本 0412 · 通过身份验证",
      "> 获取会话：CT-ECHO-ADMIN",
      "> 发现 4 个目标文件夹：",
      "[1] 回声计划_总纲",
      "[2] 母体档案_001-099",
      "[3] 07_特殊处置记录",
      "[4] 辰天CTO办公室_通信备份",
      "> 下载中 ... 47% ... 61% ...",
      { text: "> ⚠ 检测到反向追踪", cls: "warn" },
      { text: "> ⚠ 会话已被标记", cls: "warn" },
      { text: "> 紧急断开 · 连接已中断", cls: "bad" },
    ] : [
      "> 回车键没有按下去。",
      "> 他把终端关上了。",
      { text: "> ⚠ 但网关的日志里，那一次被标记的会话，已经写下了他的名字。", cls: "warn" },
    ];
    beep(300, .3, .05);
    render("THIRD · 深夜", [
      { term: lines },
      { text: invaded ? "他只拿到了一部分。" : "他没有拿。可辰天，已经记住了他。", cls: "mid" },
      { text: invaded ? "但这一部分，已经够了。" : "有些人，不会因为一个记者收手，就当他没来过。", cls: "dim" },
    ], [{ label: "继续 →", primary: true, onClick: function () { closeScreen(); goto(4); } }]);
    // 终端刷完之后那一下子红屏
    if (invaded) later(redFlash, 1900);
  }

  /* —— 第四拍 · 传票 —— */
  function beat4() {
    closeScreen();
    setClockDate("2067-01-12"); setClock("22:41");
    // 邮件判定：读完诉讼通知 / 传票，点 X 关闭窗口 → 黑屏进入第五拍（无自动跳转）
    es().mailWait = 5;
    es().mailNeed = ["m_epi_suit", "m_epi_subpoena"];
    renderObjectives();
    deliver("epi_suit", 800);
    deliver("epi_subpoena", 1900);
    toast("函 两封新邮件", "辰天法务部与星都市青云区地方法院，各寄来一封。<span class=\"t-hint\">" + MAIL_TIP + "</span>", "warn", function () { openApp("mail"); }, 12000);
  }

  /* —— 第五拍 · 关门 —— */
  function beat5() {
    closeScreen();
    setClockDate("2067-01-16"); setClock("10:00");
    render("FIFTH · 关门", [
      { text: "叩、叩、叩。", cls: "big" },
    ], [{ label: "去开门", primary: true, onClick: function () { interrogation(); } }], true);
  }
  function interrogation() {
    render("FIFTH · 关门", [
      { text: "「沈砚。」", cls: "mid" },
      "「你是否在 10 月 19 日前后，访问过 10.88.0.14:8443？」",
      { text: "「那篇报道，我看过。写得不错。」", cls: "quote" },
    ], [{ label: "……", primary: true, onClick: function () { closeScreen(); shutdownNotice(); } }]);
  }
  function shutdownNotice() {
    closeScreen();
    openModal('<div class="pass-box" style="text-align:left;max-width:560px;width:94%">\n' +
      '    <div class="epi-doc">\n' +
      '      <div class="epi-doc-head blue">星都市新闻出版管理处 · 责令停业通知书<span class="edh-no">星新出停〔2067〕第 0003 号</span></div>\n' +
      '      <div class="epi-doc-body">\n' +
      '        <div class="edb-title">责令停业通知书</div>\n' +
      '        <p>《星都观察者》网络媒体平台：</p>\n' +
      '        <p>经核查，你平台多次刊发未经核实的调查报道，扰乱网络信息秩序。现责令《星都观察者》网络媒体平台自本通知送达之日起，永久停止运营。</p>\n' +
      '        <div class="edb-sign">星都市新闻出版管理处<br>2067 年 1 月 16 日</div>\n' +
      '        <div class="edb-hr"></div>\n' +
      '        <div class="epi-note"><span class="en-title">沈砚的批注</span>\n' +
      '          <p>他没有申辩。申辩也没有用。</p>\n' +
      '          <p>他把通知书折了两折，放进了抽屉。</p>\n' +
      '        </div>\n' +
      '      </div>\n' +
      '    </div>\n' +
      '    <div class="pass-buttons" style="justify-content:center;margin-top:16px">\n' +
      '      <button class="btn btn-primary" data-action="epi-after-shutdown">关闭</button>\n' +
      '    </div>\n' +
      '  </div>');
  }
  function afterShutdown() {
    closeModal();
    beep(300, .2, .05);
    S.ui.browser.page = "obs_shutdown";
    openApp("browser");
    refreshApp("browser");
    toast("网 星都观察者", "obs 已经打不开了。该写点什么了——点这里打开「终刊辞」。", "danger", function () { openApp("doc"); }, 14000);
    es().docReady = true;
    renderIcons(); renderObjectives();
  }

  /* —— 终刊辞 / 遗稿 —— */
  function finalDocHtml() {
    var archived = !!es().archived;
    return '<div class="app-root doc-reader">\n' +
      '    <div class="doc-toolbar">\n' +
      '      <span class="doc-file">' + svgIcon("file") + ' ' + (archived ? "遗稿.docx" : "终刊辞.docx") + '</span>\n' +
      '      <span class="doc-tag">' + (archived ? "已归档 · 终刊" : "未发布 · 终刊辞") + '</span>\n' +
      '    </div>\n' +
      '    <div class="doc-page">\n' +
      '      <div class="doc-title">' + (archived ? "遗稿" : "终刊辞") + '</div>\n' +
      '      <div class="doc-sub">—— 写给这座还在运转的城市</div>\n' +
      '      <div class="doc-byline">沈砚 · 星都观察者（实习记者）</div>\n' +
      '      <div class="doc-hr"></div>\n' +
      '      <h4 class="doc-chapter">一</h4>\n' +
      '      <p>今天是 2067 年 1 月 16 日。这间编辑部，最后一次亮着灯。</p>\n' +
      '      <p>这间编辑部，是从一间租来的阁楼里长出来的。三年，我们只做一件事：把官方通稿里「不予公开」的那部分，替你们找回来。</p>\n' +
      '      <h4 class="doc-chapter">二</h4>\n' +
      '      <p>我们被起诉过，被限流过，被威胁过。主编接过无数个深夜的电话，同事删掉了自己的社交账号。但我们从没删过一篇稿。</p>\n' +
      '      <p>因为每一个「赴海外深造」的孩子，都该有一个被记住的名字。</p>\n' +
      '      <h4 class="doc-chapter">三</h4>\n' +
      '      <p>现在，门要关了。停业通知书上的那枚公章，红得和我们印过的第一份纸一样。</p>\n' +
      '      <p>我不后悔。如果重来一次，我还是会把那篇报道发出去——哪怕代价是此刻我坐在这里，敲下这些字。</p>\n' +
      '      <h4 class="doc-chapter">四</h4>\n' +
      '      <p>留给我们的时间不多了。但请记住：<br>灯灭了，不是因为天亮了。<br>是因为有人，把它交给了另一个人。</p>\n' +
      '      <p>《星都观察者》，至此终刊。</p>\n' +
      '      <div class="doc-end">写于 2067 年 1 月 16 日 · 编辑部最后一次亮着灯' + (archived ? " · 已归档" : "") + '</div>\n' +
      '    </div>\n' +
      '    <div style="text-align:center;padding:16px 0 6px">\n' +
      '      ' + (archived
        ? '<span class="locked-note">已归档。标题：遗稿。</span>'
        : '<button class="btn btn-primary" data-action="epi-archive">归 档</button>') + '\n' +
      '    </div>\n' +
      '  </div>';
  }
  // 供主游戏的文档窗口调用：没进入终刊辞阶段时返回 null，交回主游戏
  EPI.activeDocHtml = function () {
    if (!EPI.isActive() || !es().docReady) return null;
    return finalDocHtml();
  };

  function archive() {
    if (es().archived) return;
    es().archived = true;
    ding();
    if (S.windows.doc) refreshApp("doc");
    renderIcons();
    toast("文 已归档", "文档标题改成了两个字：遗稿。", "", null, 5000);
    later(function () { closeWin("doc"); landmark(); }, 1600);
  }
  function landmark() {
    render("", [
      { text: "他给北辰发了一条消息：「学校那边，先别回去。等我消息。」", cls: "dim" },
      { text: "然后走进雪里。", cls: "dim" },
      { text: "灯 塔", cls: "big" },
    ], [{ label: "继续 →", primary: true, onClick: function () { closeScreen(); goto(6); } }]);
  }

  /* —— 第六拍 · 判决 —— */
  function beat6() {
    closeScreen();
    setClockDate("2067-11-14"); setClock("14:30");
    es().courtPending = true;
    renderObjectives();          // 目标从「监视居住」切到「开庭」，必须在本拍内刷新
    showChapter("判决", "2067年11月14日。深秋。");
    toast("判 开庭", "判决日到了。点击右侧「任务目标」，进入法庭。", "warn", function () { openApp("obj"); }, 13000);
    later(courtroom, 13000);
  }
  function courtroom() {
    if (!EPI.isActive() || !es().courtPending) return;
    es().courtPending = false;
    clearTimers();
    var cb = $("#chapter-banner"); if (cb) cb.classList.remove("show");
    if (S.windows.obj) refreshApp("obj");
    renderObjectives();
    render("CHAPTER · 判决", [
      { text: "星都市青云区地方法院。刑事审判第三庭。", cls: "mid" },
      { text: "案号：（2067）星都青刑初字第 0119 号。", cls: "dim" },
      { text: "案由：非法获取计算机信息系统数据、非法侵入计算机信息系统。", cls: "dim" },
      { text: "原定 3 月 8 日的庭审，延期了两次。", cls: "dim" },
      { text: "公诉机关指控：被告人沈砚，于 2066 年 10 月至 2067 年 1 月期间，未经授权侵入星都市政务内网及辰天集团有限公司信息系统，非法获取数据，情节严重。", pause: 0.7 },
      { text: "法庭经审理查明：事实清楚，证据确实、充分。公诉机关指控罪名成立。", pause: 0.7 },
      "鉴于被告人归案后如实供述、认罪悔罪，在取保候审期间遵守规定、未发生社会危险性，且涉案数据未造成直接经济损失，依法可以从轻处罚。",
      { text: "判决如下：", cls: "mid", pause: 0.8 },
      "一、被告人沈砚犯非法获取计算机信息系统数据罪，判处监视居住两年；",
      "二、扣押在案的电子设备，予以没收；",
      "三、责令被告人于判决生效之日起十日内，删除其持有的全部涉案数据副本。",
      { text: "审判长敲下法槌。", cls: "dim", pause: 0.9 },
      { text: "「闭庭。」", cls: "mid" },
    ], [{ label: "退庭 →", primary: true, onClick: function () { closeSoft(function () { afterVerdict(); }); } }]);
  }
  function afterVerdict() {
    es().beat = 7;
    renderObjectives();
    var ic = $("#epi-house-arrest");
    if (ic) ic.classList.remove("hidden");
    beep(300, .3, .05);
    toast("居 监视居住执行告知书", "桌面上多了一枚灰色的小图标，点开看看。", "warn", function () {
      var i = $("#epi-house-arrest"); if (i) i.click();
    }, 12000);
  }
  function houseArrestModal() {
    openModal('<div class="pass-box" style="text-align:left;max-width:560px;width:94%">\n' +
      '    <div class="epi-doc">\n' +
      '      <div class="epi-doc-head">监视居住执行告知书<span class="edh-no">星公（监）〔2067〕第 0119 号</span></div>\n' +
      '      <div class="epi-doc-body">\n' +
      '        <p>沈砚，男，24岁。</p>\n' +
      '        <p>执行期限：两年，自 2067 年 11 月 14 日起至 2069 年 11 月 13 日止。</p>\n' +
      '        <div class="edb-list">\n' +
      '          <p>一、未经执行机关批准不得离开执行处所；</p>\n' +
      '          <p>二、不得会见他人或者通信；</p>\n' +
      '          <p>三、在传讯的时候及时到案；</p>\n' +
      '          <p>四、不得以任何形式干扰证人作证；</p>\n' +
      '          <p>五、不得毁灭、伪造证据或者串供。</p>\n' +
      '        </div>\n' +
      '        <p>执行处所：星都市老城区青云路 12 号。</p>\n' +
      '      </div>\n' +
      '    </div>\n' +
      '    <div class="epi-note"><span class="en-title">架空设定说明</span>\n' +
      '      <p>本后日谈为架空虚构作品，所涉罪名、法律文书与程序均为剧情需要而虚构，与现实世界的任何法律、机构、案件无关。</p>\n' +
      '    </div>\n' +
      '    <div class="pass-buttons" style="justify-content:center;margin-top:16px">\n' +
      '      <button class="btn btn-primary" data-action="epi-finale">关闭</button>\n' +
      '    </div>\n' +
      '  </div>');
  }
  function finale() {
    closeModal();
    document.body.classList.add("epi-dim");
    render("", [
      { text: "后日谈 · 完", cls: "big" },
      { text: "2067年11月14日。星都，深秋。", cls: "mid" },
      { text: "故事将在两年后继续。", cls: "dim" },
    ], [{ label: "回到简介", primary: true, onClick: function () { toIntro(); } }]);
  }
  function toIntro() {
    unlock();
    S.flags.epilogue_done = true;
    EPI.reset();
    S.flags.game_over = false;
    S.flags.choice_route1 = false;
    renderObjectives(); renderIcons();
    $("#ending-screen").classList.add("hidden");
    $("#intro-screen").classList.remove("hidden");
    EPI.showReplayEntry();
  }

  /* ==================================================================
     九、专属邮件（三封）
     ================================================================== */
  var MAILS = {
    epi_recall: {
      id: "m_epi_recall", from: "辰天集团法务部", time: "2066-10-18 09:00", unread: true,
      subject: "【函告】撤稿要求",
      body: "关于贵平台 2066 年 10 月 15 日发布的报道，本集团要求：删稿、更正、道歉、赔偿。请于四十八小时内答复。（函告编号 2026-CL-1018）",
      html: '<div class="epi-doc">\n' +
        '      <div class="epi-doc-head">辰天集团 · 法务部　函告<span class="edh-no">编号：2026-CL-1018</span></div>\n' +
        '      <div class="epi-doc-body">\n' +
        '        <div class="edb-title">关于《代号「双子」》一文的撤稿要求</div>\n' +
        '        <p>《星都观察者》编辑部：</p>\n' +
        '        <p>关于贵平台于 2066 年 10 月 15 日发布的《代号「双子」：谁替我们的孩子决定了生死？》一文，本集团现提出如下要求：</p>\n' +
        '        <div class="edb-list">\n' +
        '          <p>一、立即删除涉案报道及其全部转载、摘编；</p>\n' +
        '          <p>二、在贵平台首页连续三十日刊登更正声明；</p>\n' +
        '          <p>三、公开道歉，并说明报道系基于未经核实的信息；</p>\n' +
        '          <p>四、就本集团因此遭受的商誉损失，保留进一步追究法律责任的权利。</p>\n' +
        '        </div>\n' +
        '        <p>上述各项，请于收到本函后四十八小时内予以答复。</p>\n' +
        '        <div class="edb-sign">辰天集团有限公司 法务部<br>2066 年 10 月 18 日</div>\n' +
        '        <div class="edb-hr"></div>\n' +
        '        <div class="epi-note"><span class="en-title">沈砚的批注</span>\n' +
        '          <p>从报道发出到函告送达，中间隔了三天整。</p>\n' +
        '          <p>每一条要求都留在法律的边界之内——但边界之外，一寸也没多让。</p>\n' +
        '          <p>他点了一下保存。</p>\n' +
        '          <p><b>没有撤稿。</b></p>\n' +
        '        </div>\n' +
        '      </div>\n' +
        '    </div>',
      actions: [],
    },
    epi_suit: {
      id: "m_epi_suit", from: "辰天集团法务部", time: "2067-01-12 22:41", unread: true,
      subject: "【后续告知】诉讼通知",
      body: "关于本集团诉贵平台及沈砚侵害商誉、侵犯商业秘密一案，现已由星都市青云区地方法院立案受理。案号：（2067）星都青刑初字第 0119 号。",
      html: '<div class="epi-doc">\n' +
        '      <div class="epi-doc-head">辰天集团 · 法务部　后续告知<span class="edh-no">编号：2026-CL-1018-02</span></div>\n' +
        '      <div class="epi-doc-body">\n' +
        '        <div class="edb-title">诉讼通知</div>\n' +
        '        <p>《星都观察者》编辑部、沈砚先生：</p>\n' +
        '        <p>关于本集团诉贵平台及沈砚侵害商誉、侵犯商业秘密一案，现已由星都市青云区地方法院立案受理。</p>\n' +
        '        <p>本案已立案，案号：（2067）星都青刑初字第 0119 号。</p>\n' +
        '        <p>相关法律文书将另行送达，请做好应诉准备。</p>\n' +
        '        <div class="edb-sign">辰天集团有限公司 法务部<br>2067 年 1 月 12 日</div>\n' +
        '        <div class="edb-hr"></div>\n' +
        '        <div class="epi-note"><span class="en-title">沈砚的批注</span><p>他还没有撤稿。</p></div>\n' +
        '      </div>\n' +
        '    </div>',
      actions: [],
    },
    epi_subpoena: {
      id: "m_epi_subpoena", from: "星都市青云区地方法院", time: "2067-01-12 22:41", unread: true,
      subject: "传票（（2067）星都青刑初字第 0119 号）",
      body: "案号：（2067）星都青刑初字第 0119 号。案由：非法获取计算机信息系统数据、非法侵入计算机信息系统。定于 2067 年 3 月 8 日上午 9 时开庭。同日送达《取保候审决定书》，保证人：陈静。",
      html: '<div class="epi-doc">\n' +
        '      <div class="epi-doc-head blue">星都市青云区地方法院　传票<span class="edh-no">（2067）星都青刑初字第 0119 号</span></div>\n' +
        '      <div class="epi-doc-body">\n' +
        '        <div class="edb-title">传 票</div>\n' +
        '        <p>案号：（2067）星都青刑初字第 0119 号。</p>\n' +
        '        <p>案由：非法获取计算机信息系统数据、非法侵入计算机信息系统。</p>\n' +
        '        <p>被传唤人：沈砚。</p>\n' +
        '        <p>定于 2067 年 3 月 8 日上午 9 时开庭。请你准时到庭。</p>\n' +
        '        <div class="edb-hr"></div>\n' +
        '        <div class="edb-sub">同日，沈砚收到一份《取保候审决定书》。</div>\n' +
        '        <div class="edb-title" style="font-size:15px">取保候审决定书</div>\n' +
        '        <p>办案机关认为：其涉嫌罪名不属于暴力犯罪，涉案数据未造成直接经济损失，且其到案后如实供述、无逃跑风险，符合取保候审条件。</p>\n' +
        '        <p>决定对其取保候审，期限十二个月。</p>\n' +
        '        <p>保证方式：保证人保证。保证人：陈静（《星都观察者》主编）。</p>\n' +
        '        <p>取保候审期间，沈砚应当遵守以下规定：</p>\n' +
        '        <div class="edb-list">\n' +
        '          <p>一、未经执行机关批准不得离开所居住的市、县；</p>\n' +
        '          <p>二、住址、工作单位和联系方式发生变动的，在二十四小时以内向执行机关报告；</p>\n' +
        '          <p>三、在传讯的时候及时到案；</p>\n' +
        '          <p>四、不得以任何形式干扰证人作证；</p>\n' +
        '          <p>五、不得毁灭、伪造证据或者串供。</p>\n' +
        '        </div>\n' +
        '        <div class="edb-hr"></div>\n' +
        '        <div class="epi-note"><span class="en-title">沈砚的批注</span>\n' +
        '          <p>他读到「保证人：陈静」这一行时，停了一下。</p>\n' +
        '          <p>陈姐没跟他说过这件事。他给她打了个电话。陈姐只说了一句：</p>\n' +
        '          <p>「你要是跑了，我这主编就别想当了。」</p>\n' +
        '          <p>然后挂了。</p>\n' +
        '          <p>窗外的雪还在下。他把传票和取保候审决定书并排放在桌上，看了很久。</p>\n' +
        '          <p><b>他还没有撤稿。</b></p>\n' +
        '        </div>\n' +
        '      </div>\n' +
        '    </div>',
      actions: [],
    },
  };

  // 走主游戏同一条投递通道（任务栏闪烁 / 提示音 / 图标红点都复用），
  // 但推进类邮件本拍已有带提示的通知，不再重复弹「新邮件」。
  function deliver(key, delay) {
    deliverMail(key, delay, { quiet: true });
  }

  /* ==================================================================
     十、日志里的一行「信标」
     ================================================================== */
  EPI.logBlock = function () {
    if (!S.epi || !S.epi.logArmed) return "";
    var t = "2066-10-19 23:47";
    return '<div id="epi-log-block">\n' +
      '      <div><span class="tl-time">' + t + '</span><span class="tl-warn">[信标] 检测到辰天集团边缘节点 · 10.88.0.14:8443</span></div>\n' +
      '      <div><span class="tl-time">' + t + '</span><span class="tl-warn">[信标] 老张的密码本可复用</span></div>\n' +
      '      <div class="epi-log-click" data-action="epi-log-echo" style="cursor:pointer"><span class="tl-time">' + t + '</span><span class="tl-err" style="text-decoration:underline;text-decoration-style:dotted">[信标] 目标：集团高级服务器 · 内部代号「回声」　← 点击查看</span></div>\n' +
      '    </div>';
  };

  /* ==================================================================
     十一、主游戏调用点（钩子）
     ================================================================== */

  // 关闭邮箱窗口：读完信才算过，未读只提醒不推进
  EPI.onMailClosed = function () {
    var st = S.epi;
    if (!st || !st.active || !st.mailWait) return;
    if (mailRead()) {
      var next = st.mailWait;
      st.mailWait = null; st.mailNeed = null;
      renderObjectives();
      later(function () { goto(next); }, 220);
    } else {
      toast("邮 这封还没读", "先把信读完，再点右上角的 X 关闭窗口。<span class=\"t-hint\">黑屏之后，才会进入下一步。</span>", "warn", null, 9000);
    }
  };

  // 点击「任务目标」：第六拍 = 进入法庭；其余拍交回主游戏正常开窗
  EPI.onObjectiveClick = function () {
    if (!EPI.isActive()) return false;
    if (es().beat >= 6 && es().courtPending) { courtroom(); return true; }
    return false;
  };

  // 结局一达成：解锁并插入「后日谈 · 灯塔」入口
  EPI.onEnding = function (n) {
    if (n !== 1) return;
    unlock();
    S.flags.epilogue_unlocked = true;
    var box = document.querySelector("#ending-screen .ending-inner");
    if (box && !box.querySelector(".epi-enter-btn")) {
      var tip = document.createElement("div");
      tip.className = "ending-tip epi-enter-tip";
      tip.innerHTML = "报道没有结束这个故事——它只是把它，推到了下一个冬天。";
      var eb = document.createElement("button");
      eb.className = "btn btn-primary btn-lg epi-enter-btn";
      eb.innerHTML = "▶ 后日谈 · 灯塔";
      eb.style.cssText = "margin-right:10px";
      eb.onclick = function () { $("#ending-screen").classList.add("hidden"); EPI.start(); };
      var firstBtn = box.querySelector("button");
      if (firstBtn) box.insertBefore(eb, firstBtn); else box.appendChild(eb);
      if (firstBtn) box.insertBefore(tip, firstBtn); else box.appendChild(tip);
    }
  };

  // data-action 里的后日谈按钮
  var ACTIONS = {
    "epi-start": function () { $("#intro-screen").classList.add("hidden"); EPI.start(); },
    "epi-log-echo": function () { curtain(); },
    "epi-after-shutdown": function () { afterShutdown(); },
    "epi-archive": function () { archive(); },
    "epi-house-arrest": function () { houseArrestModal(); },
    "epi-finale": function () { finale(); },
  };
  EPI.handleAction = function (act, arg) {
    var fn = ACTIONS[act];
    if (!fn) return false;
    fn(arg);
    return true;
  };

  /* ==================================================================
     十二、初始化
     ================================================================== */
  EPI.init = function () {
    injectDom();
    Object.assign(pendingMails, MAILS);   // 让主游戏的投递通道认识这三封信
    es();                                 // 补齐状态结构
    EPI.showReplayEntry();
  };

  window.EPI = EPI;
})();
