import { MODULE_ROOT, LoadFileNames, LoadFile } from "./settings/utility.mjs";
import { syncSelectionFromSetting, syncIllusionFromSetting } from "./settings/settings.mjs"
import { SharedData, getLanguageName } from "./SharedData.mjs";

const LANGUAGE_DIR = `${MODULE_ROOT}/lang`;
const ROOT_SELECTOR = "[data-fvtt-illusion-core-root]";


// fvtt init
Hooks.once("init", async () => {
  
  const MODULE_INFO = await LoadFile(MODULE_ROOT, "module", "json");
  // console.log(`id is ${MODULE_INFO}`);
  for(const key of Object.keys(MODULE_INFO))
  {
    SharedData.moduleInfo[key] = MODULE_INFO[key];
  }
  game.settings.register(SharedData.moduleInfo.id, "language", {
    name: SharedData.langBase.core.languageSettingName,
    hint: SharedData.langBase.core.languageSettingHint,
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      required: true,
      blank: false,
      initial: game.i18n.lang,
      choices: SharedData.langFiles
    })
  });

  // get settings language 
  const LANG = game.settings.get(
        SharedData.moduleInfo.id,
        "language"
    );

  // load data
  const LOCALIZE_DATA = await LoadFile(LANGUAGE_DIR, LANG ?? "ko", "json");
  // console.log(`title is ${LOCALIZE_DATA}`);
  for(const moduleName of Object.keys(LOCALIZE_DATA)){
    for(const key of Object.keys(LOCALIZE_DATA[moduleName])){
      SharedData.langBase[moduleName][key] = LOCALIZE_DATA[moduleName][key];
      // console.log(`LOCALIZE_DATA is ${SharedData.langBase[moduleName][key]}`);
      // console.log(`langBase is ${LOCALIZE_DATA[moduleName][key]}`);
    }
  }
  // localize data setter
  const setting = game.settings.settings.get(`${SharedData.moduleInfo.id}.language`);

  setting.name = game.i18n.localize(SharedData.langBase["core"]["languageSettingName"]);
  setting.hint = game.i18n.localize(SharedData.langBase["core"]["languageSettingHint"]);
  
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
  const setting = game.settings.settings.get(
      `${SharedData.moduleInfo.id}.language`
  );

  // console.log("Field choices:", setting.type.choices);

  const LANGUAGE_FILES = await LoadFileNames(LANGUAGE_DIR);
  // console.log(`file list is ${LANGUAGE_FILES}`);
  for(const vKey of LANGUAGE_FILES)
  {
    if(vKey in SharedData.langFiles == false)
    {
      SharedData.langFiles[vKey] = getLanguageName(vKey);
    }
  }
  // console.log("Field choices:", setting.type.choices);
  
  
});


// world initialize
Hooks.once("ready", async () => {
  
});