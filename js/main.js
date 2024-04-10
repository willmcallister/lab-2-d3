
//execute script when window is loaded
window.onload = setMap();

// set up choropleth map
function setMap(){

    // map frame dimensions
    var width = 900,
        height = 600;

    // create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // Albers equal area conic projection for the US
    var projection = d3.geoAlbers();

    var path = d3.geoPath()
        .projection(projection);


    // create graticule
    var graticule = d3.geoGraticule()
        .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

    // create graticule background
    var gratBackground = map.append("path")
    .datum(graticule.outline()) //bind graticule background
    .attr("class", "gratBackground") //assign class for styling
    .attr("d", path) //project graticule

    // create graticule lines
    var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
        .data(graticule.lines()) //bind graticule lines to each element to be created
        .enter() //create an element for each datum
        .append("path") //append each element to the svg as a path element
        .attr("class", "gratLines") //assign class for styling
        .attr("d", path); //project graticule lines
        

    // use Promise.all to load all data asyncronously
    var promises = [
        d3.json("data/countries_ne_50m.topojson"),
        d3.json("data/us_states_natural_earth_generalized.topojson"),
        d3.csv("data/2021_transportation_statistics_formatted.csv"),
    ];
    Promise.all(promises).then(callback);

    function callback(data){
        // load attribute data
        var csvData = data[2];
        console.log(csvData);

        // temporarily load spatial data as topojson for conversion
        var countryTemp = data[0],
        statesTemp = data[1];

        // convert spatial data from topojson to geojson
        var worldCountries = topojson.feature(countryTemp, countryTemp.objects.countries_ne_50m),
            usStates = topojson.feature(statesTemp, statesTemp.objects.us_states_natural_earth_generalized).features;

        console.log(usStates);

        var attrArray = ["var1", "var2", "var3", "var4", "var5", "var6", "var7", "var8",
            "var9", "var10", "var11", "var12", "var13", "var14", "var15", "var16", "var17"];

        
        //loop through csv to assign each set of csv attribute values to geojson state
        for (var i = 0; i < csvData.length; i++) {
            var csvState = csvData[i]; //the current state
            var csvKey = csvState.State; //the CSV primary key -- might need to be lowercase
    
            //loop through geojson regions to find correct state
            for (var a = 0; a < usStates.length; a++) {
            var geojsonProps = usStates[a].properties; //the current state geojson properties
            var geojsonKey = geojsonProps.name; //the geojson primary key
    
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey) {
                //assign all attributes and values
                attrArray.forEach(function (attr) {
                var val = parseFloat(csvState[attr]); //get csv attribute value
                geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            }
            }
        }
        console.log(usStates);
        

        
        //add world countries to map
        var countries = map.append("path")
            .datum(worldCountries)
            .attr("class", "countries")
            .attr("d", path);

        //add us states to map
        var states = map.selectAll(".states")
            .data(usStates)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "states " + d.properties.name;
            })
            .attr("d", path);
    };
};
