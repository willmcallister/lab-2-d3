// wrap everything in a self-executing anonymous function
(function(){

// dummy global variables
var attrArray = ["state","year","co2_emissions","transit_exp_local","highway_exp_local",
            "transit_exp_state","highway_exp_state","commute_bike_pct","commute_carpool_pct",
            "commute_drove_pct","commute_transit_pct","commute_taxi_pct","commute_walked_pct",
            "commute_at_home_pct","transit_ridership","highway_gas_use","highway_vmt","vehicles,licensed_drivers"];
expressed = attrArray[9];

//chart frame dimensions
var chartWidth = window.innerWidth * 0.425,
    chartHeight = 473,
    leftPadding = 2,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";


// y scale from setChart function, moved to "global" scope
var yScale = d3.scaleLinear()
    .range([0, chartHeight])
    .domain([0, 105]);

/* --- yScale from activity 11 code base
//create a scale to size bars proportionally to frame and for axis
var yScale = d3.scaleLinear()
    .range([463, 0])
    .domain([0, 110]);
*/

//execute script when window is loaded
window.onload = setMap();

// set up choropleth map
function setMap(){

    // map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 460;

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

    //create graticule and place on map
    createGraticule(map, path);
        
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

        // temporarily load spatial data as topojson for conversion
        var countryTemp = data[0],
        statesTemp = data[1];

        // convert spatial data from topojson to geojson
        var worldCountries = topojson.feature(countryTemp, countryTemp.objects.countries_ne_50m),
            usStates = topojson.feature(statesTemp, statesTemp.objects.us_states_natural_earth_generalized).features;

        
        //loop through csv to assign each set of csv attribute values to geojson state
        for (var i = 0; i < csvData.length; i++) {
            var csvState = csvData[i]; //the current state
            var csvKey = csvState.state; //the CSV primary key -- might need to be lowercase
    
            //loop through geojson regions to find correct state
            for (var a = 0; a < usStates.length; a++) {
                var geojsonProps = usStates[a].properties; //the current state geojson properties
                var geojsonKey = geojsonProps.name; //the geojson primary key

                if(a === 0) {
                    //console.log(csvState);
                }
                

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {                  
                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvState[attr]); //get csv attribute value
                        //console.log(csvState);
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                }
            }
        }
    
        
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
                return "states " + d.properties.postal;
            })
            .attr("d", path)
            .on("mouseover", function(event, d){
                highlight(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight(d.properties);
            });

        var desc = states.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');
            


        //create the color scale
        var colorScale = makeColorScale(csvData);

        // color choropleth based on color scale
        colorChoropleth(usStates, map, path, colorScale);

        //add coordinated visualization to the map
        setChart(csvData, colorScale);

        // create dropdown menu to reexpress map
        createDropdown(csvData);
    };
};


function createGraticule(map, path){
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
}


//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);

    return colorScale;
};


function colorChoropleth(usStates, map, path, colorScale){
    // change fill color of us states
    var states = map.selectAll(".states")
        .style("fill", function(d){
            return colorScale(d.properties[expressed]);
        });
};


//function to create coordinated bar chart
function setChart(csvData, colorScale){
    // chart frame dimensions
    chartWidth = window.innerWidth * 0.425;
    chartHeight = 460;

    
    // create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");


    // create bars for each state
    var bars = chart.selectAll(".bars")
        .data(csvData)
        .enter()
        .append("rect")
        .attr("class", function(d){
            return "bars " + d.postal;
        })
        .on("mouseover", function(event, d){
            highlight(d);
        })
        .on("mouseout", function(event, d){
            dehighlight(d);
        });

    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');
    
    
    //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .attr("class", function(d){
            return "numbers " + d.state;
        })
        .attr("text-anchor", "middle");



    setBarchart(csvData, colorScale, bars, numbers);



    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text(function(d){
            if(attrArray.indexOf(expressed) >= 7 && attrArray.indexOf(expressed) <= 13){
                return "Percent " + expressed + " in each State";
            }
            else{
                return expressed + " per capita in each state";
            }
        });

};


// function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};


//dropdown change event handler
function changeAttribute(attribute, csvData) {
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var states = d3.selectAll(".states")
        .transition()
        .delay(100)
        .duration(500)        
        .style("fill", function (d) {
            var value = d.properties[expressed];
            if (value) {
                return colorScale(d.properties[expressed]);
            } else {
                return "#ccc";
            }
        });
    
    //Sort, resize, and recolor bars
    var bars = d3.selectAll(".bars");
    var numbers = d3.selectAll(".chart").selectAll(".numbers");

    setBarchart(csvData, colorScale, bars, numbers);
        
}


function setBarchart(csvData, colorScale, bars, numbers){ 
    //Sort, resize, and recolor bars
    bars.sort(function(a, b){ // sort bars
            return a[expressed] - b[expressed];
        })
        .transition()
        .delay(100)
        .duration(500)
        .attr("width", chartWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        //resize bars
        .attr("height", function(d, i){
            //return chartHeight - yScale(parseFloat(d[expressed]));
            
            return chartHeight - (chartHeight - yScale(parseFloat(d[expressed])));
            //return d[expressed];
        })
        .attr("y", function(d, i){
            //console.log("height: " + parseFloat(d[expressed]));
            //console.log("yscale: " + yScale(parseFloat(d[expressed])));
            
            //return yScale(parseFloat(d[expressed])) + topBottomPadding;
            
            return chartHeight - yScale(parseFloat(d[expressed]));
        })
        //recolor bars
        .style("fill", function(d){                     
            if(d[expressed]) {                
                return colorScale(d[expressed]);            
            } else {                
                return "#ccc";            
            }    
        });


    //annotate bars with attribute value text
    numbers.sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("x", function(d, i){
            //var fraction = chartWidth / csvData.length;
            //return i * fraction + (fraction - 1) / 2;

            return i * (chartInnerWidth / csvData.length) + leftPadding + 5;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        })
        .text(function(d){
            if(attrArray.indexOf(expressed) >= 7 && attrArray.indexOf(expressed) <= 13){
                return d3.format(".2f")(d[expressed]) + '%';
            }
            else{
                return d3.format(".2f")(d[expressed])
            }
        })
        .attr("transform", function(d, i) { // rotate labels to be vertical
            var locationData = this.getBBox();
            var centerX = locationData.x + (locationData.width / 2);
            var centerY = locationData.y + (locationData.height / 2);

            var result = 'translate(' + centerX + ',' + centerY + ')';
            result += 'rotate(-90)';
            result += 'translate(' + (-centerX) + ',' + (-centerY) + ')';
            result += 'translate(35,0)'; //offset vertically
            return result;
        });

}


//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("." + props.postal)
        .style("stroke", "blue")
        .style("stroke-width", "2");

};


function dehighlight(props){
    
    var selected = d3.selectAll("." + props.postal)
        .style("stroke", function(){

            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){

            return getStyle(this, "stroke-width")
        });
    

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };

}




// -- temp until highlight/dehighlight fixed
//function highlight(props){};
//function dehighlight(props){};


})();