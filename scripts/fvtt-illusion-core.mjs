const MODULE_ID = "fvtt-illusion-core";
const ROOT_SELECTOR = "[data-fvtt-illusion-core-root]";

const state = {
  selected: new Set(),
  illusion: new Set(),
  root: null,
  featureHost: null,
  features: new Map(),
  mounted: false
};

const api = {
  id: MODULE_ID,
  getRoot: () => state.root,
  getPlayers,
  getSelectedUserIds: () => Array.from(state.selected),
  isSelected: userId => state.selected.has(userId),
  getIllusionUserIds: () => Array.from(state.illusion),
  isIllusionActive: userId => state.illusion.has(userId),
  setIllusionActive,
  toggleIllusion,
  registerFeature,
  unregisterFeature,
  refresh: refreshFrame
};

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "selectedPlayers", {
    scope: "world",
    config: false,
    type: Object,
    default: { ids: [] }
  });

  game.settings.register(MODULE_ID, "illusionPlayers", {
    scope: "world",
    config: false,
    type: Object,
    default: { ids: [] }
  });

  const self = game.modules.get(MODULE_ID);
  if (self) self.api = api;
  globalThis.FVTTIllusionCore = api;
});

Hooks.once("ready", async () => {
  if (!game.user?.isGM) return;

  const savedSelection = game.settings.get(MODULE_ID, "selectedPlayers") ?? { ids: [] };
  const savedIllusion = game.settings.get(MODULE_ID, "illusionPlayers") ?? { ids: [] };
  state.selected = new Set(Array.isArray(savedSelection.ids) ? savedSelection.ids : []);
  state.illusion = new Set(Array.isArray(savedIllusion.ids) ? savedIllusion.ids : []);

  pruneState();
  mountFrame();
  await Promise.all([persistSelection(), persistIllusion()]);
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
      <div class="fic-header">
        <span class="fic-title">Illusion Control</span>
        <span class="fic-help">체크: 채팅 대상 · 토글: 환상 상태</span>
      </div>
      <div class="fic-players" data-fic-players></div>
      <div class="fic-features" data-fic-features></div>
    `;
    document.body.appendChild(root);
  }

  state.root = root;
  state.featureHost = root.querySelector("[data-fic-features]");
  state.mounted = true;

  renderPlayerList();
  renderFeatures();
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
    empty.textContent = "등록된 플레이어가 없습니다.";
    host.appendChild(empty);
    return;
  }

  for (const player of players) {
    const row = document.createElement("div");
    row.className = "fic-player";
    row.dataset.userId = player.id;

    const sendLabel = document.createElement("label");
    sendLabel.className = "fic-send-target";
    sendLabel.title = `${player.name} 개인 채팅 입력 대상`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.userId = player.id;
    checkbox.checked = state.selected.has(player.id);
    checkbox.setAttribute("aria-label", `${player.name} 채팅 대상`);
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
        notifyFeaturesSelectionChanged(detail);
        renderFeatures();
      } catch (error) {
        console.error(`${MODULE_ID} | selection save failed`, error);
        checkbox.checked = previous;
        if (previous) state.selected.add(player.id);
        else state.selected.delete(player.id);
        ui.notifications?.error(`채팅 대상 저장 실패: ${error.message}`);
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
        ui.notifications?.error(`환상 상태 저장 실패: ${error.message}`);
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
    ? `${player.name}: 환상 ON (눌러서 해제)`
    : `${player.name}: 환상 OFF (눌러서 적용)`;
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
  notifyFeaturesIllusionChanged(detail);
  renderPlayerList();
  renderFeatures();
  return next;
}

async function toggleIllusion(userId) {
  return setIllusionActive(userId, !state.illusion.has(userId));
}

function registerFeature(definition) {
  if (!definition?.id || typeof definition.render !== "function") {
    throw new Error("FVTT Illusion Core feature requires an id and render(host, context) function.");
  }
  state.features.set(definition.id, definition);
  if (game.ready && game.user?.isGM) {
    mountFrame();
    renderFeatures();
  }
  return () => unregisterFeature(definition.id);
}

function unregisterFeature(id) {
  state.features.delete(id);
  const section = state.featureHost?.querySelector(`[data-fic-feature-id="${CSS.escape(id)}"]`);
  section?.remove();
  state.root?.classList.toggle("has-features", state.features.size > 0);
}

function makeContext() {
  return {
    core: api,
    root: state.root,
    players: getPlayers(),
    selectedUserIds: Array.from(state.selected),
    isSelected: userId => state.selected.has(userId),
    illusionUserIds: Array.from(state.illusion),
    isIllusionActive: userId => state.illusion.has(userId)
  };
}

function renderFeatures() {
  if (!state.featureHost) return;
  const activeIds = new Set(state.features.keys());
  for (const child of Array.from(state.featureHost.children)) {
    if (!activeIds.has(child.dataset.ficFeatureId)) child.remove();
  }

  const context = makeContext();
  for (const [id, feature] of state.features) {
    let section = state.featureHost.querySelector(`[data-fic-feature-id="${CSS.escape(id)}"]`);
    if (!section) {
      section = document.createElement("section");
      section.className = "fic-feature";
      section.dataset.ficFeatureId = id;
      state.featureHost.appendChild(section);
    }
    try {
      feature.render(section, context);
    } catch (error) {
      console.error(`${MODULE_ID} | feature render failed: ${id}`, error);
    }
  }
  state.root?.classList.toggle("has-features", state.features.size > 0);
}

function notifyFeaturesSelectionChanged(detail) {
  for (const [id, feature] of state.features) {
    try {
      feature.onSelectionChanged?.(detail, makeContext());
    } catch (error) {
      console.error(`${MODULE_ID} | feature selection handler failed: ${id}`, error);
    }
  }
}

function notifyFeaturesIllusionChanged(detail) {
  for (const [id, feature] of state.features) {
    try {
      feature.onIllusionChanged?.(detail, makeContext());
    } catch (error) {
      console.error(`${MODULE_ID} | feature illusion handler failed: ${id}`, error);
    }
  }
}

function refreshFrame() {
  if (!game.user?.isGM) return;
  mountFrame();
  renderPlayerList();
  renderFeatures();
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
    notifyFeaturesSelectionChanged(selectionDetail);

    const illusionDetail = {
      changedUserId: null,
      active: null,
      illusionUserIds: Array.from(state.illusion)
    };
    Hooks.callAll(`${MODULE_ID}.illusionChanged`, illusionDetail);
    notifyFeaturesIllusionChanged(illusionDetail);
  });
}
