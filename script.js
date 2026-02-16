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
    // 1. SELECTORS
    const tableBody = document.getElementById('obsBody');
    const stationInfo = document.getElementById('station-info');
    const tableHeaders = document.getElementById('tableHeaders');

    // Headers
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

    // Toggle
    const isMetric = document.querySelector('input[name="unit"][value="metric"]').checked;

    // --- STEP A: PRE-CALCULATE CUMULATIVE PRECIP ---
    // We need a map to store the "fixed" precip value for each timestamp.
    const precipMap = new Map();
    
    // Create a temporary copy of data reversed (Oldest -> Newest) for calculation
    const chronologicalData = [...storedData].reverse();
    
    let carryOverPrecip = 0;

    chronologicalData.forEach(feature => {
        const props = feature.properties;
        const ts = props.timestamp;
        
        // Extract Minutes
        const minutes = new Date(ts).getMinutes();
        
        // Value from API (or 0)
        let rawVal = props.precipitationLastHour?.value ?? 0;

        // LOGIC:
        // 1. If this is a Standard Hourly Report (usually :50 - :59), 
        //    it represents the final total for the hour. We display it, then RESET carryOver.
        // 2. If it's an Intermediate (Special) report (< :50), 
        //    we update carryOver if rawVal > 0, otherwise we use existing carryOver.
        
        if (minutes >= 51 && minutes <= 54) {  //should normally be the xx:53 obs
            // Standard Hourly (Reset Point)
            precipMap.set(ts, rawVal);
            carryOverPrecip = 0; // Reset for the NEXT hour (starting immediately after this)
        } else {
            // Intermediate / Special
            if (rawVal > 0) {
                carryOverPrecip = rawVal; // Update with new higher value
            }
            // If rawVal is 0/null, we just stick with carryOverPrecip
            precipMap.set(ts, carryOverPrecip);
        }
    });

    // --- STEP B: SCAN FOR ACTIVE COLUMNS ---
    // Now check if we need to show the columns based on our NEW calculated values
    const hasP1 = Array.from(precipMap.values()).some(v => v > 0);
    const hasP6 = storedData.some(f => (f.properties.precipitationLast6Hours?.value ?? 0) > 0);
    const hasP24 = storedData.some(f => (f.properties.precipitationLast24Hours?.value ?? 0) > 0);

    // --- STEP C: UPDATE HEADERS ---
    tableHeaders.style.whiteSpace = 'pre';
    timeHeader.textContent = 'Time\n(UTC)';
    tempHeader.textContent = isMetric ? 'Temp\n(°C)' : 'Temp\n(°F)';
    dewHeader.textContent = isMetric ? 'Dewpoint\n(°C)' : 'Dewpoint\n(°F)';
    windHeader.textContent = isMetric ? 'Wind Speed\n(km/h)' : 'Wind Speed\n(mph)';
    windGustHeader.textContent = isMetric ? 'Wind Gust\n(km/h)' : 'Wind Gust\n(mph)';
    windDirHeader.textContent = 'Wind Dir\n(°)';
    pressureHeader.textContent = 'Pressure\n(mb)';
    presentWxHeader.textContent = 'Present Wx';
    visHeader.textContent = isMetric ? 'Vis\n(km)' : 'Vis\n(mi)';
    ceilingHeader.textContent = isMetric ? 'Ceiling\n(m)' : 'Ceiling\n(ft)';

    const setPrecipHeader = (el, show, labelMetric, labelImp) => {
        el.style.display = show ? 'table-cell' : 'none';
        if (show) el.textContent = isMetric ? labelMetric : labelImp;
    };

    setPrecipHeader(prec1hrHeader, hasP1, 'Prec 1hr\n(mm)', 'Prec 1hr\n(in)');
    setPrecipHeader(prec6hrHeader, hasP6, 'Prec 6hr\n(mm)', 'Prec 6hr\n(in)');
    setPrecipHeader(prec24hrHeader, hasP24, 'Prec 24hr\n(mm)', 'Prec 24hr\n(in)');

    // --- STEP D: UPDATE STATION INFO ---
    if (storedData.length > 0) {
        const props = storedData[0].properties;
        const geom = storedData[0].geometry;
        const name = props.stationName || "Unknown Station";
        const lat = geom?.coordinates[1].toFixed(2) || "0";
        const lon = geom?.coordinates[0].toFixed(2) || "0";
        
        let elevDisplay = '';
        if (props.elevation.value !== null) {
            elevDisplay = isMetric 
                ? `${props.elevation.value.toFixed(0)}m` 
                : `${(props.elevation.value * 3.281).toFixed(0)}ft`;
        }
        stationInfo.textContent = `Displaying 100 most recent obs for ${name}\nElevation: ${elevDisplay}  |  ${Math.abs(lon)}°W, ${lat}°N`;
    }

    // --- STEP E: BUILD ROWS ---
    tableBody.innerHTML = '';

    storedData.forEach(feature => {
        const props = feature.properties;
        
        // Skip incomplete
        if (!props.temperature || props.temperature.value === null) return;

        const formatVal = (val, decimals = 1) => {
            if (val === null || val === undefined || isNaN(val)) return '';
            return val.toFixed(decimals);
        };

        // Temp / Dew / Wind conversions
        let tVal = props.temperature.value;
        let dVal = props.dewpoint.value;
        if (!isMetric) {
            tVal = (tVal * 9/5) + 32;
            if (dVal !== null) dVal = (dVal * 9/5) + 32;
        }

        let wSpeed = props.windSpeed.value;
        let wGust = props.windGust.value;
        if (!isMetric) {
            if (wSpeed !== null) wSpeed /= 1.609;
            if (wGust !== null) wGust /= 1.609;
        }

        let wDir = props.windDirection.value;
        if (wDir === null || (wSpeed === 0 || wSpeed === null)) wDir = '';

        let pressVal = props.barometricPressure.value;
        if (pressVal !== null) pressVal = pressVal / 100;

        let visVal = props.visibility.value;
        if (visVal !== null) {
            if (isMetric) visVal = visVal / 1000;
            else visVal = visVal / 1609.34;
        }

        // Ceiling
        const clouds = props.cloudLayers || [];
        let ceilingDisplay = '';
        if (clouds.length > 0) {
            const first = clouds[0];
            if (first.amount !== 'CLR' && first.base && first.base.value !== null) {
                let base = first.base.value;
                if (!isMetric) base *= 3.28084;
                ceilingDisplay = base.toFixed(0);
            }
        }

        // --- PRECIPITATION CELL GENERATOR ---
        const getPrecipCell = (type, active) => {
            if (!active) return '';
            
            let val = 0;

            if (type === '1hr') {
                // Use our calculated map instead of raw props
                val = precipMap.get(props.timestamp) ?? 0;
            } else {
                // For 6hr/24hr, use raw props
                const key = type === '6hr' ? 'precipitationLast6Hours' : 'precipitationLast24Hours';
                val = props[key]?.value ?? 0;
            }

            // Display Logic: 
            // If 0, show empty or "0.00"? Standard aviation often omits 0 unless relevant.
            // Let's match your request: "show 0.01" means we show non-zeros.
            // If you want actual zeros hidden:
            if (val === 0) return '<td></td>';

            if (!isMetric) val *= 0.03937; // mm -> in
            
            return `<td>${val.toFixed(2)}</td>`;
        };

        // Time
        const [datePart, timePartFull] = props.timestamp.split('T');
        const timePart = timePartFull.substring(0, 5);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${datePart}</td>
            <td>${timePart}</td>
            <td>${formatVal(tVal, 1)}</td>
            <td>${formatVal(dVal, 1)}</td>
            <td>${formatVal(wSpeed, 1)}</td>
            <td>${formatVal(wGust, 1)}</td>
            <td>${wDir}</td>
            <td>${formatVal(pressVal, 1)}</td>
            <td>${props.textDescription || ''}</td>
            <td>${formatVal(visVal, 2)}</td>
            <td>${ceilingDisplay}</td>
            ${getPrecipCell('1hr', hasP1)}
            ${getPrecipCell('6hr', hasP6)}
            ${getPrecipCell('24hr', hasP24)}
        `;

        tableBody.appendChild(row);
    });
}