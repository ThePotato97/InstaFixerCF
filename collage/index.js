import * as imports from "./pkg/collage_bg.js";

// switch between both syntax for node and for workerd
import wkmod from "./pkg/collage_bg.wasm";
import * as nodemod from "./pkg/collage_bg.wasm";
if (typeof process !== "undefined" && process.release.name === "node") {
  imports.__wbg_set_wasm(nodemod);
} else {
  const instance = new WebAssembly.Instance(wkmod, {
    "./collage_bg.js": imports,
  });
  imports.__wbg_set_wasm(instance.exports);
}

export * from "./pkg/collage_bg.js";
