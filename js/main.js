
//execute script when window is loaded
window.onload = setMap();

// set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([0, 46.2])
        .rotate([-2, 0, 0])
        .parallels([43, 62])
        .scale(2500)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);






    // use Promise.all to load all data asyncronously
    var promises = [
        d3.json("data/countries_ne_50m.topojson"),
        d3.json("data/us_states_natural_earth_generalized.topojson"),
        d3.csv("data/csv/commute_mode_share_by_state.csv"),
    ];
    Promise.all(promises).then(callback);

    function callback(data){
        // load attribute data
        var commuteMode = data[2];

        // temporarily load spatial data as topojson for conversion
        var countryTemp = data[0],
        statesTemp = data[1];

        // convert spatial data from topojson to geojson
        var worldCountries = topojson.feature(countryTemp, countryTemp.objects.countries_ne_50m),
            usStates = topojson.feature(statesTemp, statesTemp.objects.us_states_natural_earth_generalized);

        //examine the results
        console.log(worldCountries);
        console.log(usStates);



        //add world countries to map
        var countries = map.append("path")
            .datum(worldCountries)
            .attr("class", "countries")
            .attr("d", path);

        //add us states to map
        var states = map.selectAll(".regions")
            .data(usStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.name;
            })
            .attr("d", path);


    };
};
