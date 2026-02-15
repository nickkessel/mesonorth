let storedData = []; // Store data here to avoid re-fetching on toggle

document.getElementById('getBtn').addEventListener('click', getObservations);
document.getElementById('stationChooser').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        getObservations();
    }
});

// Add event listeners to both radio buttons to trigger a re-render
document.querySelectorAll('input[name="unit"]').forEach(radio => {
    radio.addEventListener('change', renderTable);
});

async function getObservations() {
    const stationInput = document.getElementById('stationChooser');
    const statusDiv = document.getElementById('status');
    const stationId = stationInput.value.trim().toUpperCase();
    document.title = stationId + ' - MesoNorth';

    if (!stationId) {
        statusDiv.textContent = 'Bruh!!! enter a station id....';
        return;
    }

    statusDiv.textContent = 'Loading...';
    
    try {
        const url = `https://api.weather.gov/stations/${stationId}/observations?limit=100`;
        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                'User-Agent': 'mesonorth, kesse1ni@cmich.edu'
            }
        });

        if (!response.ok) throw new Error('Station not found or API error.');

        const data = await response.json();
        storedData = data.features || []; // Save to global variable

        statusDiv.textContent = '';
        renderTable(); // Draw the table

    } catch (error) {
        console.error(error);
        statusDiv.textContent = 'Error fetching data.';
        storedData = []; // Clear old data on error
        renderTable();
    }
}

function renderTable() {
    let tableHeaders = document.getElementById('tableHeaders');
    const stationInfo = document.getElementById('station-info');
    const tableBody = document.getElementById('obsBody');
    const timeHeader = document.getElementById('timeHeader');
    const tempHeader = document.getElementById('tempHeader');
    const dewHeader = document.getElementById('dewHeader');
    const windHeader = document.getElementById('windHeader');
    const windGustHeader = document.getElementById('windGustHeader');
    const windDirHeader = document.getElementById('windDirHeader');
    const pressureHeader = document.getElementById('pressureHeader');
    const presentWxHeader = document.getElementById('currentWxHeader');
    const visHeader = document.getElementById('visHeader');
    const ceilingHeader = document.getElementById('ceilingHeader');
    const prec1hrHeader = document.getElementById('prec1hrHeader');
    const prec6hrHeader = document.getElementById('prec6hrHeader');
    const prec24hrHeader = document.getElementById('prec24hrHeader');
    
    // Check which radio button is selected
    const isMetric = document.querySelector('input[name="unit"][value="metric"]').checked;

    // Update Header
    timeHeader.textContent = 'Time \n (utc)';
    tempHeader.textContent = isMetric ? 'Temp \n(°C)' : 'Temp \n(°F)';
    dewHeader.textContent = isMetric ? 'Dewpoint \n(°C)' : 'Dewpoint \n(°F)';
    windHeader.textContent = isMetric ? 'Wind Speed \n(km/h)' : 'Wind Speed \n(mph)';
    windGustHeader.textContent = isMetric ? 'Wind Gust \n(km/h)' : 'Wind Gust \n(mph)';
    windDirHeader.textContent = 'Wind Dir \n (°)';
    pressureHeader.textContent = 'Pressure \n (mb)';
    presentWxHeader.textContent = 'Present WX';
    visHeader.textContent = isMetric ? 'Visibility \n (m)' : 'Visibility \n (mi)';
    ceilingHeader.textContent = isMetric ? 'Ceiling \n (m)' : 'Ceiling \n (ft)';
    prec1hrHeader.textContent = isMetric ? 'Prec 1hr \n (mm)' : 'Prec 1hr \n (in)';
    prec6hrHeader.textContent = isMetric ? 'Prec 6hr \n (mm)' : 'Prec 6hr \n (in)';
    prec24hrHeader.textContent = isMetric ? 'Prec 24hr \n (mm)' : 'Prec 24hr \n (in)';

    
    tableHeaders.style.whiteSpace = 'pre';
    tableBody.innerHTML = '';

    //set station info:
    const stationName = storedData[0].properties.stationName;
    const stationElev = isMetric ? storedData[0].properties.elevation.value + 'm.  ' : (storedData[0].properties.elevation.value * 3.281).toFixed(0) + 'ft.  ';
    const stationLon = storedData[0].geometry.coordinates[0];
    const stationLat = storedData[0].geometry.coordinates[1];
    stationInfo.textContent = 'Displaying 100 most recent obs for ' + stationName + '\nElevation: ' + stationElev  + stationLon + '°W, ' + stationLat + '°N';
    
    //iterate through most recent obs
    storedData.forEach(feature => {
        const props = feature.properties;
        
        // Skip if no temp data
        if (props.temperature.value === null) return;

        let tempVal = props.temperature.value;
        let dewVal = props.dewpoint.value;
        //sometimes wind things are null which errors it
        let windDisplay;
        if (props.windSpeed.value === null) { //so it doesnt freak out if its null
            windDisplay = '';
        } else {
            let val = props.windSpeed.value;
            if (!isMetric) {
                val = val / 1.609;
            }
            windDisplay = val.toFixed(1);
        }

        let gustDisplay;
        if (props.windGust.value === null) { //so it doesnt freak out if its null
            gustDisplay = '';
        } else {
            let val = props.windGust.value;
            if (!isMetric) {
                val = val / 1.609;
            }
            gustDisplay = val.toFixed(1);
        }
        let windDirDisplay;
        if (props.windDirection.value === null || (props.windDirection.value === 0) && (props.windSpeed.value === 0)) { //so it doesnt freak out if its null. also if windspd is 0, dont have a direction.
            windDirDisplay = '';
        } else {
            windDirDisplay = props.windDirection.value;
        }
        let slPressureVal = props.barometricPressure.value; 
        let presentWeather = props.textDescription;
        let visVal;
        if (props.visibility.value === null) {
            visVal = '';
        } else {
            let val = props.visibility.value;
            if (!isMetric) {
                val = val / 1609;
            }
            visVal = val.toFixed(2);
        }
        const clouds = props.cloudLayers;
        let cloudBaseDisplay = '';
        if (clouds && clouds.length > 0) {
            const firstCloud = clouds[0];
            const baseMeters = firstCloud.base.value;
            const amount = firstCloud.amount; //textual thing (SCT, OVC, CLR)

            if (baseMeters != null) {
                if (amount === 'CLR') {
                    cloudBaseDisplay = ''; //if its clear, dont list a ceiling as it'll just be the max that the ceilometer can detect
                } else {
                    if (!isMetric) {
                        cloudBaseDisplay = (baseMeters * 3.281).toFixed(0);
                    } else {
                        cloudBaseDisplay = baseMeters.toFixed(0);
                    }
                }


            }
        }
        
        // Convert if Imperial
        if (!isMetric) {
            tempVal = (tempVal * 9/5) + 32;
            dewVal = (dewVal * 9/5) + 32;
        }

        const formattedTemp = tempVal.toFixed(1);
        const formattedDew = dewVal.toFixed(1);  
        const formattedPressure = (slPressureVal / 100).toFixed(1); //convert from pa to mb/hpa

        const rawTime = props.timestamp;
        
        const [datePart, timePartFull] = rawTime.split('T');
        const timePart = timePartFull.substring(0, 5);

        const row = document.createElement('tr');
        row.innerHTML  = //these have gotta be in the same order as the header categories
        `
            <td>${datePart}</td>
            <td>${timePart}</td>
            <td>${formattedTemp}</td>
            <td>${formattedDew}</td>
            <td>${windDisplay}</td>
            <td>${gustDisplay}</td>
            <td>${windDirDisplay}</td>
            <td>${formattedPressure}</td>
            <td>${presentWeather}</td>
            <td>${visVal}</td>
            <td>${cloudBaseDisplay}</td>
        `;
        
        tableBody.appendChild(row);
    });
}