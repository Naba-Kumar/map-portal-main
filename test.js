const viewProjSelect = document.getElementById('view-projection');
const  scaleProjection = getProjection(viewProjSelect.value);

const scaleControl = new ScaleLine({
  units: 'metric',
  bar: true,
  steps: 4,
  text: true,
  minWidth: 140,
});

const map = new Map({
  controls: defaultControls().extend([scaleControl]),
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  target: 'map',
  view: new View({
    center: transform([0, 52], 'EPSG:4326', scaleProjection),
    zoom: 6,
    projection: scaleProjection,
  }),
});

function onChangeProjection() {
  const currentView = map.getView();
  const currentProjection = currentView.getProjection();
  const newProjection = getProjection(viewProjSelect.value);
  const currentResolution = currentView.getResolution();
  const currentCenter = currentView.getCenter();
  const currentRotation = currentView.getRotation();
  const newCenter = transform(currentCenter, currentProjection, newProjection);
  const currentMPU = currentProjection.getMetersPerUnit();
  const newMPU = newProjection.getMetersPerUnit();
  const currentPointResolution =
    getPointResolution(currentProjection, 1 / currentMPU, currentCenter, 'm') *
    currentMPU;
  const newPointResolution =
    getPointResolution(newProjection, 1 / newMPU, newCenter, 'm') * newMPU;
  const newResolution =
    (currentResolution * currentPointResolution) / newPointResolution;
  const newView = new View({
    center: newCenter,
    resolution: newResolution,
    rotation: currentRotation,
    projection: newProjection,
  });
  map.setView(newView);
}
viewProjSelect.addEventListener('change', onChangeProjection);












function assamStateDistFilter(option) {
  const selectedState = document.getElementById('assam-state').value;
  const selectedDistrict = document.getElementById('assam-district').value;
  const infopopup = document.getElementById("villageInfo");

  if (option === "clear") {
    removeExistingLayer('DistrictLayer');
    removeExistingLayer('DistrictBoundary');
    infopopup.style.display = "none";
    return;
  }

  if (!selectedState) {
    window.alert("Select the State");
    return;
  }

  

  function getFilterByProperty(propertyName, value) {
    return function (feature) {
      const propertyValue = feature.get(propertyName);
      return propertyValue && propertyValue.toLowerCase() === value.toLowerCase();
    };
  }

  function removeExistingLayer(layerName) {
    const existingLayer = map.getLayers().getArray().find(layer => layer.get('name') === layerName);
    if (existingLayer) {
      map.removeLayer(existingLayer);
    }
  }

  function createVectorLayer(source, style, layerName) {
    const vectorLayer = new VectorLayer({
      source: source,
      style: style
    });
    vectorLayer.set('name', layerName);
    return vectorLayer;
  }

  function addLayerWithGeoJSON(url, filterFunction, style, layerName) {
    if(! selectedDistrict && option === 'mask'){
        window.alert("masking applicable for single boundary");
        return;
    }
  
    const vectorSource = new VectorSource({
      url: url,
      format: new GeoJSON()
    });

    vectorSource.on('featuresloadend', function () {
      console.log("GeoJSON loaded.");
    });

    vectorSource.on('featuresloaderror', function () {
      console.error("Error loading GeoJSON.");
    });

    vectorSource.once('change', function () {
      if (vectorSource.getState() === 'ready') {
        const features = vectorSource.getFeatures();
        // console.log(features)
        // console.log("Loaded features: ", features); // Debugging

        const filteredFeatures = features.filter(filterFunction);
        console.log("Filtered features: ", filteredFeatures); // Debugging

        // filteredFeatures.forEach((feature)=>{
        //   // console.log("features is")
        //   // console.log(feature.getProperties())


        // })
        displayDistrictInfo(filteredFeatures)

        vectorSource.clear();
    
        if (option === 'highlight') {
          vectorSource.addFeatures(filteredFeatures);
        } else if (option === 'mask') {
          const mapExtent = worldview.calculateExtent(map.getSize());
          const boundingBoxPolygon = fromExtent(mapExtent);
          const format = new GeoJSON();
  
          // Combine all filtered feature geometries into a single geometry using Turf.js
          let combinedGeometry = null;
          filteredFeatures.forEach((feature) => {
            if (combinedGeometry === null) {
              combinedGeometry = feature.getGeometry().clone();
            } else {
              combinedGeometry = turf.union(combinedGeometry, feature.getGeometry());
            }
          });
  
          if (combinedGeometry) {
            const boundingBoxGeoJSON = format.writeGeometryObject(boundingBoxPolygon);
            const clipGeometryGeoJSON = format.writeGeometryObject(combinedGeometry);
            const outsidePolygonGeoJSON = turf.difference(boundingBoxGeoJSON, clipGeometryGeoJSON);
  
            if (outsidePolygonGeoJSON) {
              const outsideFeature = format.readFeature(outsidePolygonGeoJSON);
              vectorSource.addFeature(outsideFeature);
            } else {
              console.log("Masking operation resulted in no outside features.");
            }
          } else {
            console.log("No valid geometry for masking.");
          }
        }

        if (filteredFeatures.length > 0) {
          const extent = filteredFeatures.reduce((acc, feature) => {
            return olExtent(acc, feature.getGeometry().getExtent());
          }, createEmpty());
          map.getView().fit(extent, { duration: 1000 });
        } else {
          console.log("No features found matching the criteria.");
        }

      }
    });
    
    

    const vectorLayer = createVectorLayer(vectorSource, style, layerName);
    map.addLayer(vectorLayer);
    return vectorLayer;
  }



  function displayDistrictInfo(features) {
    console.log("hey0")
    const villageDetails = document.getElementById('villageDetails');
    let infoHTML = '<h4 style="text-align: center; margin:10px">District Information</h4>';
    infoHTML += '<hr>';
    if (selectedDistrict) {

      infoHTML += `<table style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th style="border: 1px solid black; padding: 8px; text-align: left;">Property</th>
          <th style="border: 1px solid black; padding: 8px; text-align: left;">Value</th>
        </tr>
      </thead>
      <tbody>`;

      // Iterate over each feature to populate the table rows
      features.forEach(function (feature) {
        const properties = feature.getProperties();
        for (const key in properties) {
          if (key !== 'geometry') {
            infoHTML += `<tr>
                          <td style="border: 1px solid black; padding: 8px;">${key}</td>
                          <td style="border: 1px solid black; padding: 8px;">${properties[key]}</td>
                          </tr>`;
          }
        }

      });

      // Close the table
      infoHTML += `</tbody></table>`;

      // Now infoHTML contains the complete HTML table structure with data


    }  else {
      infoHTML += `<h4 style=" margin:10px">Districts in ${selectedState}  : ${features.length}</h4>`;

      // Initialize the HTML for the table
      infoHTML += `<table style="border-collapse: collapse; width: 100%;">
                    <thead>
                      <tr>
                        <th style="border: 1px solid black; padding: 8px; text-align: left;">District Name</th>
                        <th style="border: 1px solid black; padding: 8px; text-align: left;">Area</th>
                      </tr>
                    </thead>
                    <tbody>`;

      // Iterate over each feature to populate the table rows
      features.forEach(function (feature) {
        const properties = feature.getProperties();
        infoHTML += `<tr>
        <td style="border: 1px solid black; padding: 8px;">${properties.District}</td>
        <td style="border: 1px solid black; padding: 8px;">${properties.Area}</td>
        </tr>`;
      });

      // Close the table
      infoHTML += `</tbody></table>`;

      // Now infoHTML contains the complete HTML table structure with data


    }

    villageDetails.innerHTML = infoHTML;
    console.log("hey")
    const infopopup = document.getElementById("villageInfo");
    infopopup.style.display = "block"
  }

  removeExistingLayer('DistrictLayer');
  removeExistingLayer('DistrictBoundary');

  let DistrictLayer;
  if (selectedState && !selectedDistrict) {
    // Show all villages and info within the district
    DistrictLayer = addLayerWithGeoJSON(
      './assam_dist_json.geojson',
      getFilterByProperty('District', selectedState),
      new Style({
        stroke: new Stroke({
          color: '#fcba03',
          lineCap: 'butt',
          width: 4
        }),
        fill: new Fill({
          color: 'rgba(9, 0, 255, .3)'
        })
      }),
      'DistrictLayer'
    );

  }else if (selectedState && selectedDistrict) {
    // Show the specific village with details
    let filterStyle;
    console.log(option)
   if(option==='mask'){
    filterStyle = new Style({
      stroke: new Stroke({
        color: '#fcba03',
        lineCap: 'butt',
        width: 2
      }),
      fill: new Fill({
        color: 'rgba(70, 83, 107, 1)'
      })
    })

   }else{
     filterStyle = new Style({
       stroke: new Stroke({
         color: '#fcba03',
         lineCap: 'butt',
         width: 2
       }),
       fill: new Fill({
         color: 'rgba(70, 83, 107, .1)'
       })
     })
   }
    DistrictLayer = addLayerWithGeoJSON(
      './assam_state_dist.geojson',
      getFilterByProperty('Village', selectedDistrict),
      filterStyle,
      'DistrictLayer'
    );
  }

  let highlight;
  const featureOverlay = new VectorLayer({
    source: new VectorSource(),
    map: map,
    style: new Style({
      stroke: new Stroke({
        color: 'rgba(255, 255, 255, 0.7)',
        width: 2,
      }),
    }),
  });

  const displayFeatureInfo = function (pixel) {
    // const info = document.getElementById('info-content');
    map.forEachFeatureAtPixel(pixel, function (feature, layer) {
      if (layer && layer.get('name') === 'DistrictLayer') {
        document.getElementById('info').style.display = "block";
        const info = document.getElementById('info-content');
        if (feature) {
          info.innerHTML = `<table style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th style="border: 1px solid black; padding: 8px; text-align: left;">${feature.get('District')}</th>
          <th style="border: 1px solid black; padding: 8px; text-align: left;">${feature.get('Area')}</th>

        </tr>
      </thead>
      </table>`;
        } else {
          info.innerHTML = '&nbsp;';
        }

        if (feature !== highlight) {
          if (highlight) {
            featureOverlay.getSource().removeFeature(highlight);
          }
          if (feature) {
            featureOverlay.getSource().addFeature(feature);
          }
          highlight = feature;
        }
        return true; // Stop iteration over features
      }
    });
  };

  map.on('pointermove', function (evt) {
    if (evt.dragging) {
      return;
    }
    const pixel = map.getEventPixel(evt.originalEvent);
    displayFeatureInfo(pixel);
  });

  map.on('click', function (evt) {
    displayFeatureInfo(evt.pixel);
  });

  setTimeout(() => {
    generateLegend();
    console.log("Delayed for 1 second.");
  }, 2000);
}