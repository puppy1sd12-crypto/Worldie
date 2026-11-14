
const container = document.getElementById("globe-container");

const globe = Globe()(container)
    .width(container.clientWidth)
    .height(container.clientHeight)
    .backgroundColor("#080e1b")
    .globeImageUrl(
        "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
    )
    .showAtmosphere(true)
    .atmosphereColor("#5b9bd5")
    .atmosphereAltitude(0.15)
    .enablePointerInteraction(true)
    .polygonAltitude(0.012)
    .polygonCapColor(colorCountry)
    .polygonSideColor(() => "#345678")
    .polygonStrokeColor(() => "#ffffff")
    .polygonLabel(feature => getName(feature))
    .onPolygonClick(feature => {
        if (settings.clickGuess) {
            guessCountry(getName(feature));
        }
    });


globe.controls().autoRotate = true;
globe.controls().autoRotateSpeed = 0.2;

let countries = [];
let mysteryCountry = null;
let guesses = [];
let won = false;
let distanceUnit = "km";

const settings = {
    clickGuess: true,
    typingGuess: true,
    distanceHints: true,
    rotation: true,
    borders: true,
    atmosphere: true,
    zoomToGuess: true
};
const message = document.getElementById("message");
const input = document.getElementById("country-input");
const history = document.getElementById("guess-history");
const countryList = document.getElementById("country-list");
const distanceSelect = document.getElementById("distance-unit");
const modal = document.getElementById("settings-modal");

document.getElementById("settings-button")
    .addEventListener("click", () => {
        console.log("SETTINGS BUTTON CLICKED");
        modal.classList.remove("hidden");
    });

document.getElementById("close-settings")
    .addEventListener("click", () => {
        modal.classList.add("hidden");
    });

modal.addEventListener("click", event => {
    if (event.target === modal) {
        modal.classList.add("hidden");
    }
});

function connectToggle(id, setting, callback) {
    const checkbox = document.getElementById(id);

    checkbox.addEventListener("change", () => {
        settings[setting] = checkbox.checked;
        callback();
    });
}

connectToggle("click-toggle", "clickGuess", () => {});

connectToggle("typing-toggle", "typingGuess", () => {});

connectToggle("distance-toggle", "distanceHints", () => {
    refreshGuessDistances();
});

connectToggle("rotation-toggle", "rotation", () => {
    globe.controls().autoRotate = settings.rotation;
});

connectToggle("borders-toggle", "borders", () => {
    globe.polygonStrokeColor(() =>
        settings.borders ? "#ffffff" : "#000000"
    );
});

connectToggle("atmosphere-toggle", "atmosphere", () => {
    globe.showAtmosphere(settings.atmosphere);
});

distanceSelect.addEventListener("change", () => {
    distanceUnit = distanceSelect.value;
    refreshGuessDistances();
});

function getName(feature) {
    const p = feature.properties;
    return p.ADMIN || p.name || p.NAME;
}

function normalize(name) {
    return name.toLowerCase().trim();
}

function getCenter(feature) {
    const points = [];

    function collect(coords) {
        if (typeof coords[0] === "number") {
            points.push(coords);
        } else {
            coords.forEach(collect);
        }
    }

    collect(feature.geometry.coordinates);

    const longitude =
        points.reduce((sum, p) => sum + p[0], 0) / points.length;

    const latitude =
        points.reduce((sum, p) => sum + p[1], 0) / points.length;

    return [latitude, longitude];
}

function distanceBetween(a, b) {
    const rad = Math.PI / 180;

    const lat1 = a[0] * rad;
    const lat2 = b[0] * rad;
    const dLat = (b[0] - a[0]) * rad;
    const dLon = (b[1] - a[1]) * rad;

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLon / 2) ** 2;

    return 6371 * 2 * Math.atan2(
        Math.sqrt(h),
        Math.sqrt(1 - h)
    );
}

function colorCountry(feature) {
    const name = getName(feature);

    // Mystery country when you win
    if (won && name === mysteryCountry?.name) {
        return "#20c96b";
    }

    // Countries that have not been guessed
    if (!guesses.includes(name)) {
        return "#55a64b";
    }

    // Guessed countries get their distance-based color
    const country = countries.find(c => c.name === name);

    if (!country || !mysteryCountry) {
        return "#b83232";
    }

    const distance = distanceBetween(
        country.center,
        mysteryCountry.center
    );

    if (distance < 500) return "#ff7777";
    if (distance < 1500) return "#f04444";
    if (distance < 3500) return "#d93636";

    return "#b83232";
}

function updateGlobe() {
    globe
        .polygonCapColor(colorCountry)
        .polygonAltitude(feature =>
            guesses.includes(getName(feature)) ? 0.025 : 0.012
        );
}

function spinAndZoomToCountry(country) {
    if (!settings.zoomToGuess) return;

    const [latitude, longitude] = country.center;

    globe.pointOfView(
        {
            lat: latitude,
            lng: longitude,
            altitude: 1.5
        },
        1500
    );
}

function guessCountry(countryName) {
    if (!mysteryCountry || won) return;

    const country = countries.find(c =>
        normalize(c.name) === normalize(countryName)
    );

    if (!country) {
        message.textContent = "Country not found. Try another name!";
        return;
    }

    if (guesses.includes(country.name)) {
        message.textContent = "You already guessed that country!";
        return;
    }

   guesses.push(country.name);

spinAndZoomToCountry(country);

const li = document.createElement("li");

   if (country.name === mysteryCountry.name) {
    won = true;

    li.textContent = country.name + " - CORRECT!";

    message.textContent =
        "🎉 You found " + mysteryCountry.name + "!";

    history.appendChild(li);
    updateGlobe();

    document.getElementById("win-country").textContent =
        mysteryCountry.name;

    document.getElementById("win-modal").classList.remove("hidden");

    createConfetti();

    return;
}

    const distance = distanceBetween(
        country.center,
        mysteryCountry.center
    );

    li.textContent =
        country.name + " - " +
        Math.round(distance) + " km away";

    history.appendChild(li);

    message.textContent =
        "Your guess is " +
        Math.round(distance) +
        " km away. Keep trying!";

    updateGlobe();
}

document.getElementById("guess-form")
    .addEventListener("submit", function(event) {
        event.preventDefault();

        if (input.value.trim()) {
            guessCountry(input.value);
            input.value = "";
        }
    });

document.getElementById("new-game")
    .addEventListener("click", startNewGame);
    document.getElementById("play-again")
    .addEventListener("click", () => {
        document.getElementById("win-modal").classList.add("hidden");

        document.getElementById("confetti-container").innerHTML = "";

        startNewGame();
    });
function createConfetti() {
    const container = document.getElementById("confetti-container");
    container.innerHTML = "";

    const colors = [
        "#ff4d6d",
        "#ffd166",
        "#06d6a0",
        "#4cc9f0",
        "#c77dff"
    ];

    for (let i = 0; i < 60; i++) {
        const piece = document.createElement("div");

        piece.className = "confetti";
        piece.style.left = Math.random() * 100 + "%";
        piece.style.backgroundColor =
            colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 1.5 + "s";

        container.appendChild(piece);
    }
}
function startNewGame() {
    if (countries.length === 0) return;

    guesses = [];
    won = false;

    history.innerHTML = "";
    input.value = "";

    mysteryCountry =
        countries[Math.floor(Math.random() * countries.length)];

    message.textContent = "Make your first guess!";

    updateGlobe();
}

async function loadCountries() {
    message.textContent = "Loading countries...";

    try {
        const response = await fetch(
            "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
        );

        if (!response.ok) {
            throw new Error("Could not download country data.");
        }

        const data = await response.json();

        countries = data.features
            .filter(feature =>
                feature.geometry &&
                feature.properties &&
                getName(feature)
            )
            .map(feature => ({
                name: getName(feature),
                center: getCenter(feature),
                feature: feature
            }))
            .filter(country =>
                country.center.every(Number.isFinite)
            );

        data.features = countries.map(country => country.feature);

        countries.forEach(country => {
            const option = document.createElement("option");
            option.value = country.name;
            countryList.appendChild(option);
        });

        globe
            .polygonsData(data.features)
            .polygonsTransitionDuration(300);

        startNewGame();

    } catch (error) {
        message.textContent =
            "Could not load countries. Check your internet connection.";

        console.error(error);
    }
}

loadCountries();

window.addEventListener("resize", () => {
    globe
        .width(container.clientWidth)
        .height(container.clientHeight);
});
console.log("GAME JAVASCRIPT IS RUNNING");
console.log("Guess form:", document.getElementById("guess-form"));
console.log("Settings button:", document.getElementById("settings-button"));
console.log("Country input:", document.getElementById("country-input"));
// MYSTERY STATE GAME

let stateFeatures = [];
let mysteryState = null;
let stateGuesses = [];
let stateWon = false;
// SWITCH BETWEEN COUNTRY AND STATE GAMES

document.getElementById("country-tab").addEventListener("click", () => {
    document.getElementById("country-game").classList.remove("hidden");
    document.getElementById("state-game").classList.add("hidden");

    document.getElementById("country-tab").classList.add("active");
    document.getElementById("state-tab").classList.remove("active");
});

document.getElementById("state-tab").addEventListener("click", () => {
    document.getElementById("country-game").classList.add("hidden");
    document.getElementById("state-game").classList.remove("hidden");

    document.getElementById("state-tab").classList.add("active");
    document.getElementById("country-tab").classList.remove("active");
});
// LOAD THE UNITED STATES MAP

async function loadStateMap() {
    const message = document.getElementById("state-message");

    try {
        message.textContent = "Loading the 50 states...";

        const response = await fetch(
            "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"
        );

        if (!response.ok) {
            throw new Error("Could not load the state map.");
        }

        const us = await response.json();

        stateFeatures = topojson.feature(
            us,
            us.objects.states
        ).features;

        const stateNames = [
            "Alabama", "Alaska", "Arizona", "Arkansas",
            "California", "Colorado", "Connecticut", "Delaware",
            "Florida", "Georgia", "Hawaii", "Idaho",
            "Illinois", "Indiana", "Iowa", "Kansas",
            "Kentucky", "Louisiana", "Maine", "Maryland",
            "Massachusetts", "Michigan", "Minnesota", "Mississippi",
            "Missouri", "Montana", "Nebraska", "Nevada",
            "New Hampshire", "New Jersey", "New Mexico", "New York",
            "North Carolina", "North Dakota", "Ohio", "Oklahoma",
            "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
            "South Dakota", "Tennessee", "Texas", "Utah",
            "Vermont", "Virginia", "Washington", "West Virginia",
            "Wisconsin", "Wyoming"
        ];

        stateFeatures = stateFeatures.filter(state =>
            stateNames.includes(state.properties.name)
        );

        const width = 950;
        const height = 600;

        const projection = d3.geoAlbersUsa()
            .fitSize(
                [width - 20, height - 20],
                {
                    type: "FeatureCollection",
                    features: stateFeatures
                }
            );

        const path = d3.geoPath().projection(projection);

        const svg = d3.select("#state-map")
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        svg.selectAll(".state")
            .data(stateFeatures)
            .enter()
            .append("path")
            .attr("class", "state")
            .attr("d", path)
            .attr("fill", "#55a64b")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1)
            .on("click", (event, state) => {
    if (document.getElementById("state-click-toggle").checked) {
       guessState(state.properties.name, "click");
    }
});

        message.textContent = "Find the mystery state!";
        startNewStateGame();

    } catch (error) {
        message.textContent = "Could not load the state map.";
        console.error(error);
    }
}
// STATE GUESSING SYSTEM

function startNewStateGame() {
    if (stateFeatures.length === 0) return;

    stateGuesses = [];
    stateWon = false;

    mysteryState =
        stateFeatures[Math.floor(Math.random() * stateFeatures.length)];

    document.getElementById("state-guess-history").innerHTML = "";
    document.getElementById("state-input").value = "";

    document.getElementById("state-message").textContent =
        "Find the mystery state!";

    d3.selectAll("#state-map .state")
        .attr("fill", "#55a64b");
}

function guessState(stateName, guessMethod = "typing") {
    if (!mysteryState || stateWon) return;

    if (guessMethod === "click" &&
        !document.getElementById("state-click-toggle").checked) {
        return;
    }

    if (guessMethod === "typing" &&
        !document.getElementById("state-typing-toggle").checked) {
        return;
    }

    const state = stateFeatures.find(feature =>
        feature.properties.name.toLowerCase() === stateName.toLowerCase().trim()
    );

    if (!state) {
        document.getElementById("state-message").textContent =
            "State not found. Try again!";
        return;
    }

    if (stateGuesses.includes(state.properties.name)) {
        document.getElementById("state-message").textContent =
            "You already guessed that state!";
        return;
    }

    stateGuesses.push(state.properties.name);

    const history = document.getElementById("state-guess-history");
    const li = document.createElement("li");

   if (state.properties.name === mysteryState.properties.name) {
    stateWon = true;

    li.textContent = state.properties.name + " - CORRECT!";
    history.appendChild(li);

    document.getElementById("state-message").textContent =
        "🎉 You found " + state.properties.name + "!";

    document.getElementById("win-country").textContent =
        state.properties.name;

    document.getElementById("win-modal").classList.remove("hidden");

    createConfetti();

    d3.selectAll("#state-map .state")
        .filter(feature =>
            feature.properties.name === state.properties.name
        )
        .attr("fill", "#20c96b");

    return;
}


   const distanceKm = d3.geoDistance(
    d3.geoCentroid(state),
    d3.geoCentroid(mysteryState)
) * 6371;

const distance = distanceUnit === "mi"
    ? distanceKm * 0.621371
    : distanceKm;

const unit = distanceUnit;

if (document.getElementById("state-distance-toggle").checked) {
    li.textContent =
        state.properties.name + " - " +
        Math.round(distance) + " " + unit + " away";

    document.getElementById("state-message").textContent =
        "Your guess is " + Math.round(distance) + " " +
        unit + " away. Keep trying!";
} else {
    li.textContent = state.properties.name + " - Guess recorded";

    document.getElementById("state-message").textContent =
        "Guess recorded! Keep trying!";
}

history.appendChild(li);

    d3.selectAll("#state-map .state")
        .filter(feature =>
            feature.properties.name === state.properties.name
        )
        .attr("fill", "#d93636");
}

// STATE GAME BUTTONS

document.getElementById("state-guess-form")
    .addEventListener("submit", event => {
        event.preventDefault();

        const input = document.getElementById("state-input");

        if (input.value.trim()) {
            guessState(input.value);
            input.value = "";
        }
    });

document.getElementById("state-new-game")
    .addEventListener("click", startNewStateGame);

    loadStateMap();

 // SETTINGS TAB SWITCHING

const countrySettingsTab = document.getElementById("country-settings-tab");
const stateSettingsTab = document.getElementById("state-settings-tab");

const countrySettings = document.getElementById("country-settings");
const stateSettings = document.getElementById("state-settings");

countrySettingsTab.addEventListener("click", () => {
    countrySettings.classList.remove("hidden");
    stateSettings.classList.add("hidden");

    countrySettingsTab.classList.add("active");
    stateSettingsTab.classList.remove("active");
});

stateSettingsTab.addEventListener("click", () => {
    stateSettings.classList.remove("hidden");
    countrySettings.classList.add("hidden");

    stateSettingsTab.classList.add("active");
    countrySettingsTab.classList.remove("active");
});

// STATE BORDER SETTINGS

document.getElementById("state-borders-toggle")
    .addEventListener("change", event => {

        d3.selectAll("#state-map .state")
            .attr("stroke", event.target.checked ? "#ffffff" : "none");

    });