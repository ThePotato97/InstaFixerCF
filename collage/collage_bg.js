import * as imports from "./collage_bg.js";

// switch between both syntax for node and for workerd
import wkmod from "./collage_bg.wasm";
import * as nodemod from "./collage_bg.wasm";
if (typeof process !== "undefined" && process.release.name === "node") {
  imports.__wbg_set_wasm(nodemod);
} else {
  const instance = new WebAssembly.Instance(wkmod, {
    "./collage_bg.js": imports,
  });
  imports.__wbg_set_wasm(instance.exports);
}

export * from "./collage_bg.js";
