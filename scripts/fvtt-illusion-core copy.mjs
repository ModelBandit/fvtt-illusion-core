import { MODULE_ROOT, LoadFileNames, LoadFile } from "./settings/utility.mjs";
import { syncSelectionFromSetting, syncIllusionFromSetting } from "./settings/settings.mjs"
import { SharedData } from "./SharedData.mjs";

const LANGUAGE_DIR = `${MODULE_ROOT}/lang`;
const ROOT_SELECTOR = "[data-fvtt-illusion-core-root]";
let SELECTED_LANGUAGE = "ko";

let LANGUAGE_FILES;
let LOCALIZE_DATA;
let MODULE_INFO;

// fvtt init
Hooks.once("init", () => {
  game.settings.register(SharedData.moduleInfo.id, "language", {
    name: localize(SharedData.langBase.core.languageSettingName),
    hint: localize(SharedData.langBase.core.languageSettingHint),
    scope: "world",
    config: true,
    type: String,
    choices: SharedData.langFileMap,
    default: SELECTED_LANGUAGE
  });

  game.settings.register(SharedData.moduleInfo.id, "selectedPlayers", {
    scope: "world",
    config: false,
    type: Object,
    default: { ids: [] },
    onChange: syncSelectionFromSetting
  });

  game.settings.register(SharedData.moduleInfo.id, "illusionPlayers", {
    scope: "world",
    config: false,
    type: Object,
    default: { ids: [] },
    onChange: syncIllusionFromSetting
  });

  game.settings.register(SharedData.moduleInfo.id, "panelCollapsed", {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });
  
});

// first module init
Hooks.once("setup", async () => {
  console.log("-----setup-----");
  LANGUAGE_FILES = await LoadFileNames(LANGUAGE_DIR);
  // console.log(`file list is ${LANGUAGE_FILES}`);
  SharedData.langFiles = LANGUAGE_FILES;
  
  LOCALIZE_DATA = await LoadFile(LANGUAGE_DIR, SELECTED_LANGUAGE, "json");
  // console.log(`title is ${LOCALIZE_DATA}`);
  for(const moduleName of Object.keys(LOCALIZE_DATA))
  {
    for(const key of Object.keys(LOCALIZE_DATA[moduleName]))
    {
      SharedData.langBase[key] = LOCALIZE_DATA[key];
    }
  }

  MODULE_INFO = await LoadFile(MODULE_ROOT, "module", "json");
  // console.log(`id is ${MODULE_INFO}`);
  for(const key of Object.keys(MODULE_INFO))
  {
    SharedData.moduleInfo[key] = MODULE_INFO[key];
  }
  
  
});


// world initialize
Hooks.once("ready", async () => {
  
});