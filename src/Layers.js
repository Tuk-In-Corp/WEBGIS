// export const fetchLayers = (setLayers) => {
//   fetch("http://localhost:8084/geoserver/wfs?service=WFS&version=1.1.0&request=GetCapabilities")
//     .then((response) => response.text())
//     .then((data) => {
//       const parser = new DOMParser();
//       const xmlDoc = parser.parseFromString(data, "text/xml");
//       const layers = Array.from(xmlDoc.getElementsByTagName("Name")).map((node) => node.textContent);
//       setLayers(layers);
//     })
//     .catch((error) => console.error("Error fetching dropdown layers:", error));
// };

// export const fetchAvailableLayers = (setAvailableLayers, setShowLayersModal) => {
//   fetch("http://localhost:8084/geoserver/wms?service=WMS&version=1.1.1&request=GetCapabilities")
//     .then((response) => response.text())
//     .then((data) => {
//       try {
//         const parser = new DOMParser();
//         const xmlDoc = parser.parseFromString(data, "text/xml");
//         const layers = Array.from(xmlDoc.getElementsByTagName("Layer"))
//           .filter((layer) => layer.getElementsByTagName("Name").length > 0)
//           .map((layer, index) => ({
//             serial: index + 1,
//             name: layer.getElementsByTagName("Name")[0].textContent,
//             title: layer.getElementsByTagName("Title")[0]?.textContent || "No Title",
//             abstract: layer.getElementsByTagName("Abstract")[0]?.textContent || "No Abstract",
//           }));

//         setAvailableLayers(layers);
//         setShowLayersModal(true);
//       } catch (error) {
//         console.error("Error parsing Available Layers:", error);
//       }
//     })
//     .catch((error) => console.error("Error fetching available layers:", error));
// };

// export const fetchFeatures = (layerName, setSelectedLayer, setAttributeData, setFeatures, setShowAttributeTable, wmsLayer) => {
//   setSelectedLayer(layerName);
//   wmsLayer.getSource().updateParams({ LAYERS: layerName });

//   fetch(`http://localhost:8084/geoserver/wfs?service=WFS&request=GetFeature&typeName=${layerName}&outputFormat=application/json`)
//     .then((response) => response.json())
//     .then((data) => {
//       if (!data.features.length) {
//         console.error("No features found for the layer.");
//         return;
//       }

//       setAttributeData(data.features.map((feature) => feature.properties));
//       setFeatures(data.features);
//       setShowAttributeTable(true);
//     })
//     .catch((error) => console.error("Error fetching features:", error));
// };
