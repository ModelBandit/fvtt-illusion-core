import { loadFileNames, loadFile, buildObject } from "./settings/fileSystem.mjs";
import { syncSelectionFromSetting, syncIllusionFromSetting } from "./settings/settings.mjs"
import { SharedData, getLanguageName } from "./SharedData.mjs";

const MODULE_ROOT = "modules/fvtt-illusion-0-core";
const LANGUAGE_DIR = `${MODULE_ROOT}/lang`;
const ROOT_SELECTOR = "[data-fvtt-illusion-core-root]";


// fvtt init
Hooks.once("init", async () => {
  
  const moduleInfo = await loadFile(MODULE_ROOT, "module", "json");
  // console.log(`id is ${moduleInfo}`);
  for(const key of Object.keys(moduleInfo))
  {
    SharedData.moduleInfo.core[key] = moduleInfo[key];
  }
  game.settings.register(SharedData.moduleInfo.core.id, "language", {
    name: SharedData.langBase.core.languageSettingName,
    hint: SharedData.langBase.core.languageSettingHint,
    scope: "world",
    config: true,
    type: new foundry.data.fields.StringField({
      required: true,
      blank: false,
      initial: game.i18n.lang,
      choices: SharedData.langFiles
    }),
    // requiresReload: true // fvtt에 메타데이터를 넘겨서 팝업을 끼고 새로고침
    onChange: () => globalThis.location.reload()
  });

  // get settings language 
  const LANG = game.settings.get(
        SharedData.moduleInfo.core.id,
        "language"
    );

  // load data
  const LOCALIZE_DATA = await loadFile(LANGUAGE_DIR, LANG ?? "ko", "json");
  // console.log(`title is ${LOCALIZE_DATA}`);
  // for(const moduleName of Object.keys(LOCALIZE_DATA)){
  //   for(const key of Object.keys(LOCALIZE_DATA[moduleName])){
  //     SharedData.langBase[moduleName][key] = LOCALIZE_DATA[moduleName][key];
  //     // console.log(`LOCALIZE_DATA is ${SharedData.langBase[moduleName][key]}`);
  //     // console.log(`langBase is ${LOCALIZE_DATA[moduleName][key]}`);
  //   }
  // }
  const asd = Object.keys(LOCALIZE_DATA);
  console.log(asd.length)
  buildObject(SharedData.langBase, LOCALIZE_DATA);

  // localize data setter
  const setting = game.settings.settings.get(`${SharedData.moduleInfo.core.id}.language`);

  setting.name = SharedData.langBase.core.languageSettingName;
  setting.hint = SharedData.langBase.core.languageSettingHint;
  
  game.settings.register(SharedData.moduleInfo.core.id, "selectedPlayers", {
    scope: "world",
    config: false,
    type: Object,
    default: { ids: [] },
    onChange: syncSelectionFromSetting
  });

  game.settings.register(SharedData.moduleInfo.core.id, "illusionPlayers", {
    scope: "world",
    config: false,
    type: Object,
    default: { ids: [] },
    onChange: syncIllusionFromSetting
  });

  game.settings.register(SharedData.moduleInfo.core.id, "panelCollapsed", {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });
  
  globalThis.fvttIllusion = {
    sharedData: SharedData,
    loadFile: loadFile
  };
  Hooks.callAll("fvtt-illusion-core.lateinit");
});

// first module init
Hooks.once("setup", async () => {
  console.log("-----setup-----");
  
  const LANGUAGE_FILES = await loadFileNames(LANGUAGE_DIR);
  // console.log(`file list is ${LANGUAGE_FILES}`);
  //
  for(const vKey of LANGUAGE_FILES)
  {
    if(vKey in SharedData.langFiles == false)
      SharedData.langFiles[vKey] = getLanguageName(vKey);
  }
  // console.log("Field choices:", setting.type.choices);
  
  
});


// world initialize
Hooks.once("ready", async () => {
  
});