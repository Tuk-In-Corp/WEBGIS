import MousePosition from "ol/control/MousePosition";
import ScaleLine from "ol/control/ScaleLine";
import ZoomSlider from "ol/control/ZoomSlider";
import LayerSwitcher from "ol-layerswitcher";

/**
 * Adds map controls such as scale, zoom slider, mouse position, and layer switcher
 */
export const addMapControls = (map) => {
  map.addControl(new ScaleLine({ units: "metric" }));
  map.addControl(new ZoomSlider());
  map.addControl(new MousePosition());
  map.addControl(new LayerSwitcher({ activationMode: "click", startActive: true }));
};
