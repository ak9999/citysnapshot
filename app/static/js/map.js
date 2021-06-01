// This example requires the Visualization library. Include the libraries=visualization
// parameter when you first load the API. For example:
// <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=visualization">



var map;
var heatmap;
var markersArray = [];
var queryString = '/q';

function ready(fn){
    if(document.attachEvent ? document.readyState === "complete" : document.readyState != "loading"){
        fn();
    }else{
        document.addEventListener('DOMContentLoaded',fn);
    }
}

function clearOverlays() {
  for (var i = 0; i < markersArray.length; i++ ) {
    markersArray[i].setMap(null);
  }
  markersArray.length = 0;
}

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: {
            lat: 40.730815,
            lng: -73.997471
        },
        // Make it Night View
        styles: [
            {elementType: 'geometry', stylers: [{color: '#242f3e'}]},
            {elementType: 'labels.text.stroke', stylers: [{color: '#242f3e'}]},
            {elementType: 'labels.text.fill', stylers: [{color: '#746855'}]},
            {
              featureType: 'administrative.locality',
              elementType: 'labels.text.fill',
              stylers: [{color: '#d59563'}]
            },
            {
              featureType: 'poi',
              elementType: 'labels.text.fill',
              stylers: [{color: '#d59563'}]
            },
            {
              featureType: 'poi.park',
              elementType: 'geometry',
              stylers: [{color: '#263c3f'}]
            },
            {
              featureType: 'poi.park',
              elementType: 'labels.text.fill',
              stylers: [{color: '#6b9a76'}]
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{color: '#38414e'}]
            },
            {
              featureType: 'road',
              elementType: 'geometry.stroke',
              stylers: [{color: '#212a37'}]
            },
            {
              featureType: 'road',
              elementType: 'labels.text.fill',
              stylers: [{color: '#9ca5b3'}]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry',
              stylers: [{color: '#746855'}]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry.stroke',
              stylers: [{color: '#1f2835'}]
            },
            {
              featureType: 'road.highway',
              elementType: 'labels.text.fill',
              stylers: [{color: '#f3d19c'}]
            },
            {
              featureType: 'transit',
              elementType: 'geometry',
              stylers: [{color: '#2f3948'}]
            },
            {
              featureType: 'transit.station',
              elementType: 'labels.text.fill',
              stylers: [{color: '#d59563'}]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{color: '#17263c'}]
            },
            {
              featureType: 'water',
              elementType: 'labels.text.fill',
              stylers: [{color: '#515c6d'}]
            },
            {
              featureType: 'water',
              elementType: 'labels.text.stroke',
              stylers: [{color: '#17263c'}]
            }
          ],
        mapTypeId: google.maps.MapTypeId.MAP,
        disableDefaultUI: true
    });

    // Auto Complete
        var input = document.getElementById('pac-input');

        var autocomplete = new google.maps.places.Autocomplete(input);

        // Bind the map's bounds (viewport) property to the autocomplete object,
        // so that the autocomplete requests use the current map bounds for the
        // bounds option in the request.
        autocomplete.bindTo('bounds', map);

        var infowindow = new google.maps.InfoWindow();
        var infowindowContent = document.getElementById('infowindow-content');
        infowindow.setContent(infowindowContent);
        // whats this??

        var marker = new google.maps.Marker({
          map: map,
          anchorPoint: new google.maps.Point(0, -29)
        });

        autocomplete.addListener('place_changed', function() {
          infowindow.close();
          marker.setVisible(false);
          var place = autocomplete.getPlace();
          if (!place.geometry) {
            // User entered the name of a Place that was not suggested and
            // pressed the Enter key, or the Place Details request failed.
            window.alert("No details available for input: '" + place.name + "'");
            return;
          }

          // If the place has a geometry, then present it on a map.
          if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
          } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);  // Why 17? Because it looks good.
          }
          marker.setPosition(place.geometry.location);
          marker.setVisible(true);


          var address = '';
          if (place.address_components) {
            address = [
              (place.address_components[0] && place.address_components[0].short_name || ''),
              (place.address_components[1] && place.address_components[1].short_name || ''),
              (place.address_components[2] && place.address_components[2].short_name || '')
            ].join(' ');
          }

          infowindowContent.children['place-icon'].src = place.icon;
          infowindowContent.children['place-name'].textContent = place.name;
          infowindowContent.children['place-address'].textContent = address;
          infowindow.open(map, marker);
        });


    // end of Auto Complete

    var request = new XMLHttpRequest();
    request.open('GET', '/q', true);

    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            // Success!
            var data = JSON.parse(request.responseText);
            let result = [];
            for (var i = 0; i < data.length; i++) {
                result.push(new google.maps.LatLng(data[i].latitude, data[i].longitude));
            }


            heatmap = new google.maps.visualization.HeatmapLayer({
                data: result,
                map: map
            });
            changeGradient();
        }
    };
    request.onerror = function() {
        // There was a connection error of some sort

    };

    request.send();
}

ready(initMap);


function recv_data(data_url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
            callback(xmlHttp.responseText);
        }
    };
    xmlHttp.open("GET", data_url, true); // asynchronous request
    xmlHttp.send(null);
}


function changeGradient() {
    var gradient = [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
    ]
    heatmap.set('gradient', gradient);
}

function allData(x){
    heatmap.setMap(null);
    clearOverlays();
    var request = new XMLHttpRequest();
    if(x === ''){
      queryString = '/q';
    }else if (x === 'NYPD'){
      queryString = '/q?&agency=NYPD';
    }else if (x === 'FDNY'){
      queryString = '/q?&agency=FDNY';
    }else if(x === 'DOHMH'){
      queryString = '/q?&agency=DOHMH';
    }else{
      queryString = '/q?&agency=DEP';
    }


    request.open('GET', queryString, true);

    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            // Success!
            var data = JSON.parse(request.responseText);
            let result = [];
            var infowindow = new google.maps.InfoWindow();
            for (var i = 0; i < data.length; i++) {
                result.push(new google.maps.LatLng(data[i].latitude, data[i].longitude));
                if(queryString !== '/q'){
                  var marker = new google.maps.Marker({
                   position: new google.maps.LatLng(data[i].latitude, data[i].longitude),
                    map: map
                  });

                  showDescriptor(map, infowindow, data[i].descriptor, marker);
                  markersArray.push(marker);
                }
            }

            heatmap = new google.maps.visualization.HeatmapLayer({
                data: result,
                map: map
            });
            changeGradient();
        }
    };
    request.onerror = function() {
        // There was a connection error of some sort

    };

    request.send();
}

function complaintType(){
  ///q?&agency=NYPD&type=noise
    heatmap.setMap(null);
    clearOverlays();
    var request = new XMLHttpRequest();
    var query = '';
    if(queryString === '/q'){
      query = queryString + '?&type=' + document.getElementById('complaint').value;
    }else{
      query = queryString + '&type=' + document.getElementById('complaint').value;
    }

    request.open('GET', query, true);

    request.onload = function() {
        if (request.status >= 200 && request.status < 400) {
            // Success!
            var data = JSON.parse(request.responseText);
            let result = [];
            var infowindow = new google.maps.InfoWindow();
            for (var i = 0; i < data.length; i++) {
                result.push(new google.maps.LatLng(data[i].latitude, data[i].longitude));
                var marker = new google.maps.Marker({
                 position: new google.maps.LatLng(data[i].latitude, data[i].longitude),
                 map: map
                });
                showDescriptor(map, infowindow, data[i].complaint_type, marker);
                markersArray.push(marker);
            }

            heatmap = new google.maps.visualization.HeatmapLayer({
                data: result,
                map: map
            });
            changeGradient();
        }
    };
    request.onerror = function() {
        // There was a connection error of some sort

    };

    request.send();
}
document.getElementById('complaint').onkeydown = function(event) {
    if (event.keyCode == 13) {
        complaintType();
    }
}
function Toggle (){
  var dropDown = document.getElementById('dropTop');
      dropDown.classList.toggle('display');
}

function showDescriptor(map, infowindow, complaintType, marker) {
  google.maps.event.addListener(marker, 'click', function() {
    infowindow.setContent(complaintType);
    infowindow.open(map, marker);
  });
}