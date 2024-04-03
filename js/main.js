
//execute script when window is loaded
window.onload = setMap();

// set up choropleth map
function setMap(){

    // use Promise.all to load all data asyncronously
    var promises = [d3.csv("data/csv/commute_mode_share_by_state.csv"),
                    d3.json("data/us_states_ne_generalized.topojson"),
                    d3.json("data/countries_ne_50m.topojson")
                    ];
    Promise.all(promises).then(callback);

    function callback(data){
        commuteMode = data[0];
        countries = data[1];
        states = data[2];
        console.log(commuteMode);
        console.log(countries);
        console.log(states);
    }
};
