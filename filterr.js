document.getElementById('selectButton').addEventListener('click', function () {
    const selectedState = document.getElementById('state').value;
    const selectedDistrict = document.getElementById('district').value;
    console.log("Selected State:", selectedState);
    console.log("Selected District:", selectedDistrict);

    function getCoordinatesFromFeature(feature) {
        return feature.getGeometry().getExtent();
    }

    function getFilterByProperty(propertyName, value) {
        return function (feature) {
            return feature.get(propertyName).toLowerCase() === value.toLowerCase();
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

    function addLayerWithGeoJSON(url, propertyName, value, style, layerName) {
        const vectorSource = new VectorSource({
            url: url,
            format: new GeoJSON()
        });

        vectorSource.once('change', function () {
            vectorSource.forEachFeature(function (feature) {
                if (!getFilterByProperty(propertyName, value)(feature)) {
                    vectorSource.removeFeature(feature);
                } else {
                    const extent = getCoordinatesFromFeature(feature);
                    map.getView().fit(extent, { duration: 1000 });
                }
            });
        });

        const vectorLayer = createVectorLayer(vectorSource, style, layerName);
        map.addLayer(vectorLayer);
        return vectorLayer;
    }

    function clipOutsidePolygon(clipGeometry, layerName) {
        var mapExtent = worldview.calculateExtent(map.getSize());
        const boundingBoxPolygon = fromExtent(mapExtent);
        const format = new GeoJSON();
        const boundingBoxGeoJSON = format.writeGeometryObject(boundingBoxPolygon);
        const clipGeoJSON = format.writeGeometryObject(clipGeometry);
        const outsidePolygonGeoJSON = turf.difference(boundingBoxGeoJSON, clipGeoJSON);
        const outsideFeature = format.readFeature(outsidePolygonGeoJSON);

        const outsideVectorLayer = new VectorLayer({
            source: new VectorSource({
                features: [outsideFeature]
            }),
            style: new Style({
                fill: new Fill({
                    color: 'rgba(82, 101, 117, 1)'
                })
            })
        });
        outsideVectorLayer.set('name', layerName);
        map.addLayer(outsideVectorLayer);
    }

    removeExistingLayer('districtLayer');
    removeExistingLayer('stateLayer');
    removeExistingLayer('outsideVectorLayer');

    if (selectedDistrict) {
        const districtLayer = addLayerWithGeoJSON(
            './india_Districts.geojson',
            'distname',
            selectedDistrict,
            new Style({
                stroke: new Stroke({
                    color: '#a0a',
                    lineCap: 'butt',
                    width: 1
                })
            }),
            'districtLayer'
        );

        districtLayer.getSource().once('addfeature', function () {
            const districtClipGeometry = districtLayer.getSource().getFeatures()
                .find(feature => getFilterByProperty('distname', selectedDistrict)(feature))
                .getGeometry();
            clipOutsidePolygon(districtClipGeometry, 'outsideVectorLayer');
        });

    } else if (selectedState) {
        const stateLayer = addLayerWithGeoJSON(
            './india_state_geo.json',
            'NAME_1',
            selectedState,
            new Style({
                stroke: new Stroke({
                    color: '#000',
                    lineCap: 'butt',
                    width: 1
                })
            }),
            'stateLayer'
        );

        stateLayer.getSource().once('addfeature', function () {
            const stateClipGeometry = stateLayer.getSource().getFeatures()
                .find(feature => getFilterByProperty('NAME_1', selectedState)(feature))
                .getGeometry();
            clipOutsidePolygon(stateClipGeometry, 'outsideVectorLayer');
        });
    }
});
