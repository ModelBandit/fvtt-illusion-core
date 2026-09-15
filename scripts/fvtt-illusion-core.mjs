const MODULE_ID = "fvtt-illusion-core";
const ROOT_SELECTOR = "[data-fvtt-illusion-core-root]";
const API_VERSION = 1;
const DEFAULT_LANGUAGE = "ko";
const LANGUAGE_PATH = `modules/${MODULE_ID}/lang`;

let languageData = {};
const moduleInitializers = new Map();

// Core가 먼저 기본 언어 맵을 메모리에 올려 서브 모듈의 init 단계에서도 사용할 수 있게 한다.
try {
  const response = await fetch(`/${LANGUAGE_PATH}/${DEFAULT_LANGUAGE}.json`, { cache: "no-cache" });
  if (response.ok) {
    const data = await response.json();
    languageData = data && typeof data === "object" ? data : {};
  }
} catch (error) {
  console.warn(`${MODULE_ID} | default language preload failed`, error);
}

const state = {
  selected: new Set(),
  illusion: new Set(),
  root: null,
  moduleHost: null,
  modules: new Map(),
  mounted: false,
  collapsed: false
};

const api = {
  id: MODULE_ID,
  apiVersion: API_VERSION,
  getPlayers,
  getSnapshot,
  getSelectedUserIds: () => Array.from(state.selected),
  isSelected: userId => state.selected.has(userId),
  getIllusionUserIds: () => Array.from(state.illusion),
  isIllusionActive: userId => state.illusion.has(userId),
  setIllusionActive,
  toggleIllusion,
  isCollapsed: () => state.collapsed,
  setCollapsed: setPanelCollapsed,
  registerModule,
  unregisterModule,
  getRegisteredModuleIds: () => Array.from(state.modules.keys()),
  // 0.1.x 서브 모듈 호환용 별칭. 신규 모듈은 registerModule을 사용한다.
  registerFeature,
  unregisterFeature,
  refresh: refreshFrame,
  getLanguage: () => game.settings.get(MODULE_ID, "language") ?? DEFAULT_LANGUAGE,
  getLanguageName,
  localize,
  getLanguageMap,
  loadLanguage,
  registerInitializer
};

// 모듈 평가 시점에는 Foundry의 game 객체를 참조하지 않는다.
// 서브 모듈이 가벼운 initializer를 미리 등록할 수 있도록 전역 API만 먼저 공개한다.
globalThis.FVTTIllusionCore = api;

Hooks.once("init", () => {
  // game.modules는 Foundry init 시점부터 사용한다.
  const coreModule = game.modules.get(MODULE_ID);
  if (coreModule) coreModule.api = api;
  game.settings.register(MODULE_ID, "language", {
    name: localize("core.languageSettingName"),
    hint: localize("core.languageSettingHint"),
    scope: "world",
    config: true,
    type: String,
    choices: { ko: getLanguageName("ko") },
    default: DEFAULT_LANGUAGE,
    onChange: async () => {
      await loadLanguage();
      refreshCoreSettingLocalization();
      refreshFrame();
      Hooks.callAll(`${MODULE_ID}.languageChanged`, api.getLanguage());
    }
  });

  game.settings.register(MODULE_ID, "selectedPlayers", {
    scope: "world",
    config: false,
    type: Object,
    default: { ids: [] },
    onChange: syncSelectionFromSetting
  });

  game.settings.register(MODULE_ID, "illusionPlayers", {
    scope: "world",
    config: false,
    type: Object,
    default: { ids: [] },
    onChange: syncIllusionFromSetting
  });

  game.settings.register(MODULE_ID, "panelCollapsed", {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  // Foundry 설정 등록 등 각 서브 모듈이 직접 처리해야 하는 작업은 여기서 실행하지 않는다.
  // Core 데이터/API 준비만 끝난 뒤, 미리 등록된 가벼운 초기화 함수에 Core API를 전달한다.
  for (const [id, initializer] of moduleInitializers) {
    try {
      initializer(api);
    } catch (error) {
      console.error(`${MODULE_ID} | initializer failed: ${id}`, error);
    }
  }
});

Hooks.once("ready", async () => {
  await refreshLanguageChoices();
  await loadLanguage();
  refreshCoreSettingLocalization();

  const savedSelection = game.settings.get(MODULE_ID, "selectedPlayers") ?? { ids: [] };
  const savedIllusion = game.settings.get(MODULE_ID, "illusionPlayers") ?? { ids: [] };
  state.selected = new Set(Array.isArray(savedSelection.ids) ? savedSelection.ids : []);
  state.illusion = new Set(Array.isArray(savedIllusion.ids) ? savedIllusion.ids : []);

  if (game.user?.isGM) {
    state.collapsed = Boolean(game.settings.get(MODULE_ID, "panelCollapsed"));
    pruneState();
    mountFrame();
    await Promise.all([persistSelection(), persistIllusion()]);
  }
  Hooks.callAll(`${MODULE_ID}.ready`, api);
});

Hooks.on("renderChatLog", () => {
  if (!game.user?.isGM) return;
  queueMicrotask(mountFrame);
});

Hooks.on("createUser", refreshUsers);
Hooks.on("updateUser", refreshUsers);
Hooks.on("deleteUser", refreshUsers);

function getPlayers() {
  return Array.from(game.users ?? [])
    .filter(user => !user.isGM)
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang || undefined));
}

function getSnapshot() {
  return {
    players: getPlayers(),
    selectedUserIds: Array.from(state.selected),
    illusionUserIds: Array.from(state.illusion)
  };
}

function setsEqual(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function describeSetChange(previous, next) {
  const changed = new Set([...previous, ...next].filter(id => previous.has(id) !== next.has(id)));
  const changedUserId = changed.size === 1 ? changed.values().next().value : null;
  return { changedUserId, active: changedUserId === null ? null : next.has(changedUserId) };
}

function syncSelectionFromSetting(value) {
  const next = new Set(Array.isArray(value?.ids) ? value.ids : []);
  if (setsEqual(state.selected, next)) return;

  const previous = state.selected;
  state.selected = next;
  const { changedUserId, active } = describeSetChange(previous, next);
  const detail = {
    changedUserId,
    selected: active,
    selectedUserIds: Array.from(next)
  };
  Hooks.callAll(`${MODULE_ID}.selectionChanged`, detail);
  notifyModulesSelectionChanged(detail);
  if (game.user?.isGM) {
    renderPlayerList();
    renderModules();
  }
}

function syncIllusionFromSetting(value) {
  const next = new Set(Array.isArray(value?.ids) ? value.ids : []);
  if (setsEqual(state.illusion, next)) return;

  const previous = state.illusion;
  state.illusion = next;
  const { changedUserId, active } = describeSetChange(previous, next);
  const detail = {
    changedUserId,
    active,
    illusionUserIds: Array.from(next)
  };
  Hooks.callAll(`${MODULE_ID}.illusionChanged`, detail);
  notifyModulesIllusionChanged(detail);
  if (game.user?.isGM) {
    renderPlayerList();
    renderModules();
  }
}

function pruneState() {
  const validIds = new Set(getPlayers().map(user => user.id));
  for (const set of [state.selected, state.illusion]) {
    for (const id of Array.from(set)) {
      if (!validIds.has(id)) set.delete(id);
    }
  }
}

async function persistSelection() {
  if (!game.user?.isGM) return;
  await game.settings.set(MODULE_ID, "selectedPlayers", { ids: Array.from(state.selected) });
}

async function persistIllusion() {
  if (!game.user?.isGM) return;
  await game.settings.set(MODULE_ID, "illusionPlayers", { ids: Array.from(state.illusion) });
}

function mountFrame() {
  if (!game.user?.isGM) return;

  let root = document.querySelector(ROOT_SELECTOR);
  if (!root) {
    root = document.createElement("section");
    root.className = "fic-root";
    root.dataset.fvttIllusionCoreRoot = "true";
    root.innerHTML = `
      <div class="fic-panel" data-fic-panel>
        <div class="fic-header">
          <span class="fic-title">${escapeHtml(localize("core.title", "Illusion Control"))}</span>
          <span class="fic-help">${escapeHtml(localize("core.help", "체크: 채팅 대상 · 토글: 환상 상태"))}</span>
        </div>
        <div class="fic-players" data-fic-players></div>
        <div class="fic-modules" data-fic-modules></div>
      </div>
      <button type="button" class="fic-collapse-toggle" data-fic-collapse-toggle></button>
    `;
    document.body.appendChild(root);
  }

  state.root = root;
  state.moduleHost = root.querySelector("[data-fic-modules]");
  state.mounted = true;

  const toggleButton = root.querySelector("[data-fic-collapse-toggle]");
  if (toggleButton && toggleButton.dataset.bound !== "true") {
    toggleButton.dataset.bound = "true";
    toggleButton.addEventListener("click", () => void setPanelCollapsed(!state.collapsed));
  }
  applyCollapsedState();

  renderPlayerList();
  renderModules();
}

function applyCollapsedState() {
  if (!state.root) return;
  state.root.classList.toggle("is-collapsed", state.collapsed);

  const button = state.root.querySelector("[data-fic-collapse-toggle]");
  if (!button) return;
  const action = state.collapsed ? localize("core.expand", "펼치기") : localize("core.collapse", "접기");
  button.textContent = state.collapsed ? "▶" : "◀";
  button.title = `Illusion Control ${action}`;
  button.setAttribute("aria-label", `Illusion Control ${action}`);
  button.setAttribute("aria-expanded", String(!state.collapsed));
}

async function setPanelCollapsed(collapsed) {
  if (!game.user?.isGM) return state.collapsed;
  const previous = state.collapsed;
  const next = Boolean(collapsed);
  if (previous === next) return next;

  state.collapsed = next;
  applyCollapsedState();
  try {
    await game.settings.set(MODULE_ID, "panelCollapsed", next);
  } catch (error) {
    state.collapsed = previous;
    applyCollapsedState();
    console.error(`${MODULE_ID} | panel collapsed state save failed`, error);
    ui.notifications?.error(`UI 접기 상태 저장 실패: ${error.message}`);
  }
  return state.collapsed;
}

function renderPlayerList() {
  if (!state.root) return;
  const host = state.root.querySelector("[data-fic-players]");
  if (!host) return;

  pruneState();
  host.replaceChildren();

  const players = getPlayers();
  if (!players.length) {
    const empty = document.createElement("span");
    empty.className = "fic-empty";
    empty.textContent = localize("core.noPlayers", "등록된 플레이어가 없습니다.");
    host.appendChild(empty);
    return;
  }

  for (const player of players) {
    const row = document.createElement("div");
    row.className = "fic-player";
    row.dataset.userId = player.id;

    const sendLabel = document.createElement("label");
    sendLabel.className = "fic-send-target";
    sendLabel.title = localize("core.sendTargetTitle", "{name} 개인 채팅 입력 대상", { name: player.name });

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.userId = player.id;
    checkbox.checked = state.selected.has(player.id);
    checkbox.setAttribute("aria-label", localize("core.sendTargetAria", "{name} 채팅 대상", { name: player.name }));
    checkbox.addEventListener("change", async () => {
      const previous = !checkbox.checked;
      if (checkbox.checked) state.selected.add(player.id);
      else state.selected.delete(player.id);

      try {
        await persistSelection();
        const detail = {
          changedUserId: player.id,
          selected: checkbox.checked,
          selectedUserIds: Array.from(state.selected)
        };
        Hooks.callAll(`${MODULE_ID}.selectionChanged`, detail);
        notifyModulesSelectionChanged(detail);
        renderModules();
      } catch (error) {
        console.error(`${MODULE_ID} | selection save failed`, error);
        checkbox.checked = previous;
        if (previous) state.selected.add(player.id);
        else state.selected.delete(player.id);
        ui.notifications?.error(localize("core.selectionSaveFailed", "채팅 대상 저장 실패: {error}", { error: error.message }));
      }
    });

    sendLabel.append(checkbox);

    const illusionButton = document.createElement("button");
    illusionButton.type = "button";
    illusionButton.className = "fic-illusion-toggle";
    illusionButton.dataset.userId = player.id;
    updateIllusionButton(illusionButton, player);
    illusionButton.addEventListener("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      illusionButton.disabled = true;
      try {
        await toggleIllusion(player.id);
      } catch (error) {
        console.error(`${MODULE_ID} | illusion toggle failed`, error);
        ui.notifications?.error(localize("core.illusionSaveFailed", "환상 상태 저장 실패: {error}", { error: error.message }));
      } finally {
        illusionButton.disabled = false;
      }
    });

    row.append(sendLabel, illusionButton);
    host.appendChild(row);
  }
}

function updateIllusionButton(button, player) {
  const active = state.illusion.has(player.id);
  button.classList.toggle("is-active", active);
  button.setAttribute("aria-pressed", String(active));
  button.title = active
    ? localize("core.illusionOn", "{name}: 환상 ON (눌러서 해제)", { name: player.name })
    : localize("core.illusionOff", "{name}: 환상 OFF (눌러서 적용)", { name: player.name });
  button.replaceChildren();

  const name = document.createElement("span");
  name.className = "fic-illusion-player-name";
  name.textContent = player.name;

  const indicator = document.createElement("span");
  indicator.className = "fic-illusion-indicator";
  indicator.setAttribute("aria-hidden", "true");

  button.append(indicator, name);
}

async function setIllusionActive(userId, active) {
  if (!game.user?.isGM) return false;
  const player = getPlayers().find(user => user.id === userId);
  if (!player) return false;

  const previous = state.illusion.has(userId);
  const next = Boolean(active);
  if (previous === next) return next;

  if (next) state.illusion.add(userId);
  else state.illusion.delete(userId);

  try {
    await persistIllusion();
  } catch (error) {
    if (previous) state.illusion.add(userId);
    else state.illusion.delete(userId);
    throw error;
  }

  const detail = {
    changedUserId: userId,
    active: next,
    illusionUserIds: Array.from(state.illusion)
  };
  Hooks.callAll(`${MODULE_ID}.illusionChanged`, detail);
  notifyModulesIllusionChanged(detail);
  renderPlayerList();
  renderModules();
  return next;
}

async function toggleIllusion(userId) {
  return setIllusionActive(userId, !state.illusion.has(userId));
}

function registerModule(definition) {
  if (!definition?.id || typeof definition.id !== "string") {
    throw new Error("FVTT Illusion Core module requires a string id.");
  }
  if (state.modules.has(definition.id)) {
    throw new Error(`FVTT Illusion Core module is already registered: ${definition.id}`);
  }
  const renderControl = definition.renderControl ?? definition.render ?? null;
  if (renderControl !== null && typeof renderControl !== "function") {
    throw new Error("FVTT Illusion Core module renderControl must be a function.");
  }

  const registered = {
    ...definition,
    id: definition.id,
    title: String(definition.title ?? definition.id),
    description: String(definition.description ?? ""),
    order: Number.isFinite(definition.order) ? definition.order : 100,
    renderControl
  };
  state.modules.set(registered.id, registered);
  if (game.ready && game.user?.isGM) {
    mountFrame();
  }
  try {
    registered.onRegistered?.(makeContext(registered.id));
  } catch (error) {
    state.modules.delete(registered.id);
    renderModules();
    throw error;
  }
  return () => {
    if (state.modules.get(registered.id) === registered) unregisterModule(registered.id);
  };
}

function unregisterModule(id) {
  const registered = state.modules.get(id);
  if (!registered) return false;
  try {
    registered.onUnregistered?.(makeContext(id));
  } catch (error) {
    console.error(`${MODULE_ID} | module unregister handler failed: ${id}`, error);
  }
  state.modules.delete(id);
  const section = state.moduleHost?.querySelector(`[data-fic-module-id="${CSS.escape(id)}"]`);
  section?.remove();
  state.root?.classList.toggle("has-modules", hasRenderableModules());
  return true;
}

function registerFeature(definition) {
  return registerModule({
    ...definition,
    renderControl: definition?.render
  });
}

function unregisterFeature(id) {
  return unregisterModule(id);
}

function makeContext(moduleId = null) {
  return {
    core: api,
    moduleId,
    players: getPlayers(),
    selectedUserIds: Array.from(state.selected),
    isSelected: userId => state.selected.has(userId),
    illusionUserIds: Array.from(state.illusion),
    isIllusionActive: userId => state.illusion.has(userId)
  };
}

function hasRenderableModules() {
  return Array.from(state.modules.values()).some(module => module.renderControl);
}

function renderModules() {
  if (!state.moduleHost) return;
  const renderable = Array.from(state.modules.values())
    .filter(module => module.renderControl)
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title));
  const activeIds = new Set(renderable.map(module => module.id));
  for (const child of Array.from(state.moduleHost.children)) {
    if (!activeIds.has(child.dataset.ficModuleId)) child.remove();
  }

  for (const module of renderable) {
    const id = module.id;
    let section = state.moduleHost.querySelector(`[data-fic-module-id="${CSS.escape(id)}"]`);
    if (!section) {
      section = document.createElement("section");
      section.className = "fic-module";
      section.dataset.ficModuleId = id;
      section.innerHTML = `
        <div class="fic-module-header">
          <span class="fic-module-title"></span>
          <span class="fic-module-description"></span>
        </div>
        <div class="fic-module-controls" data-fic-module-controls></div>
      `;
      state.moduleHost.appendChild(section);
    }
    section.querySelector(".fic-module-title").textContent = module.title;
    const description = section.querySelector(".fic-module-description");
    description.textContent = module.description;
    description.hidden = !module.description;
    state.moduleHost.appendChild(section);
    try {
      module.renderControl(section.querySelector("[data-fic-module-controls]"), makeContext(id));
    } catch (error) {
      console.error(`${MODULE_ID} | module render failed: ${id}`, error);
    }
  }
  state.root?.classList.toggle("has-modules", renderable.length > 0);
}

function notifyModulesSelectionChanged(detail) {
  for (const [id, module] of state.modules) {
    try {
      module.onSelectionChanged?.(detail, makeContext(id));
    } catch (error) {
      console.error(`${MODULE_ID} | module selection handler failed: ${id}`, error);
    }
  }
}

function notifyModulesIllusionChanged(detail) {
  for (const [id, module] of state.modules) {
    try {
      module.onIllusionChanged?.(detail, makeContext(id));
    } catch (error) {
      console.error(`${MODULE_ID} | module illusion handler failed: ${id}`, error);
    }
  }
}

function refreshFrame() {
  if (!game.user?.isGM) return;
  mountFrame();
  renderPlayerList();
  renderModules();
}

function refreshUsers() {
  if (!game.user?.isGM) return;
  queueMicrotask(async () => {
    pruneState();
    await Promise.all([persistSelection(), persistIllusion()]);
    refreshFrame();

    const selectionDetail = {
      changedUserId: null,
      selected: null,
      selectedUserIds: Array.from(state.selected)
    };
    Hooks.callAll(`${MODULE_ID}.selectionChanged`, selectionDetail);
    notifyModulesSelectionChanged(selectionDetail);

    const illusionDetail = {
      changedUserId: null,
      active: null,
      illusionUserIds: Array.from(state.illusion)
    };
    Hooks.callAll(`${MODULE_ID}.illusionChanged`, illusionDetail);
    notifyModulesIllusionChanged(illusionDetail);
  });
}


/** 언어 코드 하나를 받아 설정창에 표시할 이름 하나를 반환한다. */
function getLanguageName(language) {
  switch (String(language ?? "").toLowerCase()) {
    case "ko": return "한국어";
    case "en": return "English";
    case "ja": return "日本語";
    case "zh-cn": return "简体中文";
    case "zh-tw": return "繁體中文";
    default: return String(language ?? "");
  }
}

function refreshCoreSettingLocalization() {
  const setting = game.settings.settings.get(`${MODULE_ID}.language`);
  if (!setting) return;
  setting.name = localize("core.languageSettingName");
  setting.hint = localize("core.languageSettingHint");
}

async function refreshLanguageChoices() {
  if (!game.user?.isGM) return;
  try {
    const result = await FilePicker.browse("data", LANGUAGE_PATH);
    const files = Array.isArray(result?.files) ? result.files : [];
    const codes = files
      .filter(file => file.toLowerCase().endsWith(".json"))
      .map(file => file.split("/").pop().replace(/\.json$/i, ""))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const setting = game.settings.settings.get(`${MODULE_ID}.language`);
    if (!setting) return;
    const choices = {};
    for (const code of codes) choices[code] = getLanguageName(code);
    if (!Object.keys(choices).length) choices[DEFAULT_LANGUAGE] = getLanguageName(DEFAULT_LANGUAGE);
    setting.choices = choices;

    const current = game.settings.get(MODULE_ID, "language");
    if (!Object.hasOwn(choices, current)) await game.settings.set(MODULE_ID, "language", DEFAULT_LANGUAGE);
  } catch (error) {
    console.warn(`${MODULE_ID} | language file scan failed`, error);
  }
}

async function loadLanguage(language = game.settings.get(MODULE_ID, "language") ?? DEFAULT_LANGUAGE) {
  const requested = String(language || DEFAULT_LANGUAGE);
  for (const code of [...new Set([requested, DEFAULT_LANGUAGE])]) {
    try {
      const response = await fetch(`/${LANGUAGE_PATH}/${encodeURIComponent(code)}.json`, { cache: "no-cache" });
      if (!response.ok) continue;
      const data = await response.json();
      languageData = data && typeof data === "object" ? data : {};
      return languageData;
    } catch (error) {
      console.warn(`${MODULE_ID} | language load failed: ${code}`, error);
    }
  }
  languageData = {};
  return languageData;
}

function registerInitializer(id, initializer) {
  if (!id || typeof initializer !== "function") {
    throw new TypeError(`${MODULE_ID} | registerInitializer requires an id and function`);
  }
  moduleInitializers.set(id, initializer);
  return () => moduleInitializers.delete(id);
}

function getLanguageMap(namespace = null) {
  if (!namespace) return languageData;
  return String(namespace).split(".").reduce((node, part) => node?.[part], languageData) ?? {};
}

function localize(key, fallback = key, replacements = {}) {
  const value = String(key ?? "").split(".").reduce((node, part) => node?.[part], languageData);
  let text = typeof value === "string" ? value : String(fallback ?? key ?? "");
  for (const [name, replacement] of Object.entries(replacements ?? {})) {
    text = text.replaceAll(`{${name}}`, String(replacement));
  }
  return text;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}
