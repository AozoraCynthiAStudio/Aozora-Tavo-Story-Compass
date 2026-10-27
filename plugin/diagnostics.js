// Shared by the ordered entry scripts. Never record story text or API payloads.
var aozoraCompassLog = (function () {
  var version = "1.0.1";
  var captureSuggestions = false;
  var runSequence = 0;
  var runs = [];
  var session = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  var key = "aozoraCompass.diagnosticsV1";
  var rows = [];
  var importantLimit = 600;
  var layoutLimit = 30;
  var limit = importantLimit + layoutLimit;
  var layoutRecent = Object.create(null);
  var droppedImportant = 0;
  var droppedLayout = 0;
  var storeState = "loading";
  var timer = null;
  var writing = false;
  var revision = 0;
  var savedRevision = -1;
  var fields = ["source", "stage", "request", "name", "code", "ms", "count", "characters", "promptCharacters", "resultCharacters", "busy", "refreshing", "connected", "open", "hidden", "disabled", "width", "height", "scrollHeight", "clientHeight", "viewportWidth", "viewportHeight", "legacyRoots", "fallback", "chatId", "messageId", "reason", "selectedEntries", "selectedCharacters", "inFlight", "enabled", "supportedEntries", "unsupportedEntries", "filteredEntries", "selectedChunks", "overBudget", "profileCharacters", "personaCharacters", "filterMs", "bookId", "entryId", "availableEntries", "availableCharacters", "scannedEntries", "skippedForBudget", "essentialOverBudget", "run", "category", "selected", "currentHits", "backgroundHits", "sceneHits", "discoveryEntries", "discoveryPool", "sceneTermCount", "skippedDisabled", "skippedEmpty", "skippedMeta", "modelCalls", "sdkTimeout", "localTimeout", "context", "settingsOverride", "maxCompletionTokens", "settingsSource", "firstTokenTiming", "tokenUsage", "packetJsonCharacters", "guideCharacters", "previousBatchCount", "previousCharacters", "hiddenMessages", "historyCandidates", "omittedHistory", "sceneScore", "sceneKeyHits", "sceneBodyHits", "suppressedTerms", "frequencyCutoff", "qualifiedSceneEntries", "characterEntry", "characterCandidates", "selectedCharacterEntries", "directoryEntries", "directoryCharacters", "directorySelected", "relationHits", "aliasCount", "namedCharacterCandidates", "relatedCharacterCandidates", "originalCharacters", "targetCharacters", "skippedUnits", "castEntries", "worldEntries", "memoryHookEntries"];

  function safeData(data) {
    var result = {};
    fields.forEach(function (name) {
      var value = data && data[name];
      if (typeof value === "boolean" || (typeof value === "number" && isFinite(value))) result[name] = value;
      else if (typeof value === "string") result[name] = value.slice(0, 96);
    });
    ["complete", "validOptions"].forEach(function (name) {
      var value = data && data[name];
      if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) result[name] = value;
    });
    ["selectedMemoryIndices", "sourceMessageIds", "messageRoles", "missingRoutes"].forEach(function (name) {
      if (data && Array.isArray(data[name])) result[name] = data[name].slice(0,256).filter(function (value) { return typeof value === "number" || typeof value === "string"; }).map(function (value) { return typeof value === "string" ? value.slice(0,48) : value; });
    });
    if (captureSuggestions && data && Array.isArray(data.options)) result.options = data.options.slice(0,5).map(function (item) { return { title:String(item.title || "").slice(0,48), draft:String(item.draft || "").slice(0,700) }; });
    return result;
  }

  function errorData(error) {
    var name = String(error && error.name || "Error");
    var code = String(error && error.code || "");
    var message = String(error && error.message || "");
    var category = /timeout|超时/i.test(message) ? "timeout" : /permission|forbidden|unauthoriz|权限/i.test(message) ? "permission" : /network|fetch|connection|网络/i.test(message) ? "network" : /剧情.*变化|context|chat.*chang/i.test(message) ? "context-changed" : "unclassified";
    return { name: /^[A-Za-z]+Error$|^Error$/.test(name) ? name : "Error", code: /^[A-Za-z0-9_-]{1,48}$/.test(code) ? code : "", category:category };
  }

  function isLayout(event) { return /^(?:panel\.bounds|panel\.layout|options\.layout)$/.test(event); }

  function trimRows(list) {
    var important = 0, layout = 0, kept = [];
    for (var i = list.length - 1; i >= 0; i--) {
      if (isLayout(list[i].event)) {
        if (layout++ >= layoutLimit) { droppedLayout++; continue; }
      } else if (important++ >= importantLimit) { droppedImportant++; continue; }
      kept.push(list[i]);
    }
    return kept.reverse();
  }

  function log(event, data) {
    var details = safeData(data);
    if (isLayout(event)) {
      var previous = layoutRecent[event];
      var signature = JSON.stringify(details);
      var now = Date.now();
      if (previous && (previous.signature === signature && now - previous.at < 30000 || previous.reason === details.reason && now - previous.at < 2000)) return;
      layoutRecent[event] = { at: now, signature: signature, reason: details.reason };
    }
    rows.push({ at: new Date().toISOString(), session: session, version: version, event: event, data: details });
    rows = trimRows(rows);
    revision++;
    schedule();
  }

  function bounded(call) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var deadline = setTimeout(function () { if (!settled) { settled = true; reject(new Error("timeout")); } }, 5000);
      Promise.resolve().then(call).then(function (value) {
        if (settled) return;
        settled = true; clearTimeout(deadline); resolve(value);
      }, function (error) {
        if (settled) return;
        settled = true; clearTimeout(deadline); reject(error);
      });
    });
  }

  function schedule() {
    if (storeState !== "ready" || writing || timer || savedRevision === revision) return;
    timer = setTimeout(function () { timer = null; flush(); }, 750);
  }

  async function flush() {
    if (storeState !== "ready" || writing) return;
    writing = true;
    var snapshotRevision = revision;
    var snapshot = { version: version, rows: rows.slice(), retention: { droppedImportant: droppedImportant, droppedLayout: droppedLayout } };
    try {
      await bounded(function () { return tavo.variable.set(key, snapshot, "global"); });
      savedRevision = snapshotRevision;
    } catch (error) {
      // Stop retrying a stalled writer, whose underlying call may still finish.
      storeState = "unavailable";
      log("log.storage.unavailable", errorData(error));
    } finally {
      writing = false;
      schedule();
    }
  }

  async function restore() {
    try {
      var saved = await bounded(function () { return tavo.variable.get(key, "global"); });
      if (saved && Array.isArray(saved.rows)) {
        var previous = saved.rows.slice(-limit).filter(function (row) {
          return row && typeof row.event === "string" && typeof row.at === "string";
        }).map(function (row) {
          return { at: row.at.slice(0, 30), session: String(row.session || "").slice(0, 32), version: String(row.version || "").slice(0, 20), event: row.event.slice(0, 80), data: safeData(row.data) };
        });
        if (saved.retention) {
          droppedImportant += Math.max(0, Number(saved.retention.droppedImportant) || 0);
          droppedLayout += Math.max(0, Number(saved.retention.droppedLayout) || 0);
        }
        rows = trimRows(previous.concat(rows));
      }
      storeState = "ready";
      log("log.storage.ready");
    } catch (error) {
      storeState = "unavailable";
      log("log.storage.unavailable", errorData(error));
    }
  }

  function geometry(root, dialog) {
    var rect = root && root.getBoundingClientRect ? root.getBoundingClientRect() : null;
    return { connected: !!(root && root.isConnected), open: !!(dialog && dialog.open), hidden: !!(root && root.hidden), width: rect ? Math.round(rect.width) : 0, height: rect ? Math.round(rect.height) : 0, scrollHeight: root ? root.scrollHeight : 0, clientHeight: root ? root.clientHeight : 0, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight };
  }

  function scoped(target) {
    var run = null;
    var active = false;
    function tagged(event, data) {
      var details = Object.assign({}, data || {}, { run: run ? run.id : "", chatId: String(target.chatId || ""), messageId: String(target.messageId || "") });
      if (run && active) {
        run.stage = event + (data && data.stage ? ":" + data.stage : "");
        if (event === "generation.request") run.modelCalls++;
      }
      log(event, details);
    }
    return {
      log: tagged, error: errorData, geometry: geometry,
      hasRun: function () { return active; },
      beginRun: function (source) {
        if (active) return;
        run = { id:session+"-"+(++runSequence),startedAt:Date.now(),source:source,modelCalls:0,stage:"request.begin",outcome:"running" };
        active = true; runs.push(run); runs = runs.slice(-12);
        tagged("request.begin", { source:source });
      },
      endRun: function (outcome) {
        if (!active || !run) return;
        run.outcome = outcome; run.ms = Date.now()-run.startedAt;
        tagged("request.end", { reason:outcome,ms:run.ms,modelCalls:run.modelCalls });
        active = false;
      }
    };
  }

  async function exportFile() {
    log("log.export.request");
    await restored;
    var exportedAt = new Date().toISOString();
    var header = { kind: "aozora-diagnostic-header", plugin: "Aozora剧情罗盘", version: version, session: session, exportedAt: exportedAt, storage: storeState, userAgent: navigator.userAgent, rows: rows.length, firstRetainedAt: rows.length ? rows[0].at : null, captureSuggestions:captureSuggestions, runs:runs.map(function (run) { return Object.assign({},run,{ms:run.outcome==="running"?Date.now()-run.startedAt:run.ms}); }), retention: { importantLimit: importantLimit, layoutLimit: layoutLimit, droppedImportant: droppedImportant, droppedLayout: droppedLayout }, note: "不记录聊天、人物卡、世界书或模型思考原文；captureSuggestions说明是否包含解析后的五条建议。字符数不等于token数；本接口不提供首token耗时、实际推理量或服务端排队时间，不能据总耗时断定瓶颈。布局与关键记录分开限量，没有action.received不能证明用户没有点击。" };
    var text = JSON.stringify(header) + "\n" + rows.map(function (row) { return JSON.stringify(row); }).join("\n") + "\n";
    try {
      var name = "AozoraCompass_" + version + "_" + exportedAt.replace(/[:.]/g, "-") + ".jsonl";
      // This opens the user's save/share sheet. Completion does not prove a file was saved.
      await tavo.file.export(name, text, { encoding: "utf8" });
      log("log.export.sheet.closed", { characters: text.length });
    } catch (error) {
      log("log.export.failed", errorData(error));
      throw error;
    }
  }

  log("entry.diagnostics.boot");
  var restored = restore();
  return { log: log, error: errorData, geometry: geometry, flush: flush, exportFile: exportFile, scoped: scoped, version: version };
})();
