// wrap everything in a self-executing anonymous function
(function(){

    // dummy global variables
    const attrArray = ["state","year","co2_emissions","transit_exp_local","highway_exp_local",
                "transit_exp_state","highway_exp_state","commute_bike_pct","commute_carpool_pct",
                "commute_drove_pct","commute_transit_pct","commute_taxi_pct","commute_walked_pct",
                "commute_at_home_pct","transit_ridership","highway_gas_use","highway_vmt","vehicles","licensed_drivers"];

    const attrArrayAlias = ["Transportation CO2 Emissions", "Public Transit Expenditure - Local",
        "Highway Expenditure - Local", "Public Transit Expenditure - State", "Highway Expenditure - State", "Bicycle Commute Mode Share", 
        "Carpool Commute Mode Share", "Drove Alone Commute Mode Share", "Public Transit Commute Mode Share", "Taxi Commute Mode Share",
        "Walked Commute Mode Share", "Worked From Home Commute Mode Share", "Transit Ridership", "Highway Gas Use", "Highway Miles Traveled",
        "Vehicles", "Licensed Drivers"];

    const enumerationUnits = ["million metric tons of CO2", "thousands of $", "thousands of $", "thousands of $", "thousands of $",
        "percent", "percent", "percent", "percent", "percent", "percent", "percent", "trips per capita", "gallons per capita",
        "per capita", "per capita", "per capita"];
                    
    let expressed = attrArray[9];
    
    //chart frame dimensions
    let chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 2,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    
    
    // y scale from setChart function, moved to "global" scope
    let yScale = d3.scaleLinear()
        .range([0, chartHeight])
        .domain([0, 105]);
    
    
    let zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        //.translateExtent([[0, 0], [width, height]])
        .on('zoom', handleZoom);
    

    // Create a MediaQueryList object
    const checkSmallWidth = window.matchMedia("(max-width: 480px)");
    
    
    // Attach listener function on state changes
    checkSmallWidth.addEventListener("change", function() {
        resizeHandler();
    }); 
    

    //execute script when window is loaded
    window.onload = setMap();
    
    // set up choropleth map
    function setMap(){
    
        resizeHandler();

        // map frame dimensions
        const width = window.innerWidth * 0.5,
            height = 460;
    
        // create new svg container for the map
        const map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
    
        map.call(zoom);

        // Albers equal area conic projection for the US
        const projection = d3.geoAlbers();
    
        const path = d3.geoPath()
            .projection(projection);
    
        //create graticule and place on map
        createGraticule(map, path);
            
        // use Promise.all to load all data asyncronously
        const promises = [
            d3.json("data/countries.topojson"),
            d3.json("data/us_states_natural_earth_generalized.topojson"),
            d3.csv("data/2021_transportation_statistics_formatted.csv"),
        ];
        Promise.all(promises).then(callback);
    
        function callback(data){
            // load attribute data
            const csvData = data[2];
    
            // temporarily load spatial data as topojson for conversion
            const countryTemp = data[0],
                statesTemp = data[1];
    
            // convert spatial data from topojson to geojson
            const worldCountries = topojson.feature(countryTemp, countryTemp.objects.countries),
                usStates = topojson.feature(statesTemp, statesTemp.objects.us_states_natural_earth_generalized).features;
    
            for(const csvState of csvData) {
                csvKey = csvState.state;

                //loop through geojson regions to find correct state
                for (const state of usStates) {
                    const geojsonProps = state.properties; //the current state geojson properties
                    const geojsonKey = geojsonProps.name; //the geojson primary key
    
                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey == csvKey) {                  
                        //assign all attributes and values
                        attrArray.forEach(function (attr) {
                            const val = parseFloat(csvState[attr]); //get csv attribute value

                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    }
                }
            }
        
            
            //add world countries to map
            const countries = map.append("path")
                .datum(worldCountries)
                .attr("class", "countries")
                .attr("d", path);
    
            //add us states to map
            const states = map.selectAll(".states")
                .data(usStates)
                .enter()
                .append("path")
                .attr("class", (d) => {
                    return "states " + d.properties.postal;
                })
                .attr("d", path)
                .on("mouseover", (event, d) => {
                    highlight(d.properties);
                })
                .on("mouseout", (event, d) => {
                    dehighlight(d.properties);
                })
                .on("mousemove", moveLabel);
    
            const desc = states.append("desc")
                .text('{"stroke": "#000", "stroke-width": "0.5px"}');
                
    
            const initX = -20,
                initY = 20,
                initScale = 0.85;

            d3.selectAll("path")
                .call(zoom.transform, d3.zoomIdentity.translate(initX, initY).scale(initScale))
                .attr('transform', `translate(${initX}, ${initY})scale(${initScale})`);
    
            //create the color scale
            const colorScale = makeColorScale(csvData);

            // color choropleth based on color scale
            colorChoropleth(map, colorScale);
    
            //add coordinated visualization to the page
            setChart(csvData, colorScale);
    
            // create dropdown menu to reexpress map
            createDropdown(csvData);
    
            // create label checkbox
            createCheckbox();

            // create text below map and map elements
            const bodyText = d3.select("body")
                .append("div")
                .attr("class", "bodyText")
                .append("text")
                .html("Visualization Created by Will McAllister for Geog 575 Lab 2");
        };
    };

    function resizeHandler(){
        // if width is 480 or less
        if(checkSmallWidth.matches) {
            // show drawer
            document.querySelector('.drawer--bottom').classList.add('is-visible');
            document.querySelector('.drawer--bottom').classList.add('is-active');
        }
        else {
            // hide drawer
            document.querySelector('.drawer--bottom').classList.remove('is-visible');
            document.querySelector('.drawer--bottom').classList.remove('is-active');
        }
    }
    
    function updateBarLabels(){
        if(d3.select("#bar_labels").property("checked")){
            // show bar labels
            d3.selectAll(".numbers")
                .attr("style", "display:true");
        } 
        else{
            // hide bar labels
            d3.selectAll(".numbers")
                .attr("style", "display:none");
            
        }
    };


    function createGraticule(map, path){
        // create graticule
        const graticule = d3.geoGraticule()
            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude
    
        // create graticule background
        const gratBackground = map.append("path")
        .datum(graticule.outline()) //bind graticule background
        .attr("class", "gratBackground") //assign class for styling
        .attr("d", path) //project graticule
    
        // create graticule lines
        const gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
            .data(graticule.lines()) //bind graticule lines to each element to be created
            .enter() //create an element for each datum
            .append("path") //append each element to the svg as a path element
            .attr("class", "gratLines") //assign class for styling
            .attr("d", path); //project graticule lines
    }
    
    
    //function to create color scale generator
    function makeColorScale(data){
        const colorIntervals = [
            "#fef0d9",
            "#fdcc8a",
            "#fc8d59",
            "#e34a33",
            "#b30000"
        ];
    
        //create color scale generator
        const colorScale = d3.scaleQuantile()
            .range(colorIntervals);
    
        //build array of all values of the expressed attribute
        const domainArray = [];
        for (const d of data){
            domainArray.push(parseFloat(d[expressed]));
        };
    
        // update yScale function to update the scale for creating bar chart
        updateYScale(domainArray);
    
        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);
    
        return colorScale;
    };
    
    
    function colorChoropleth(map, colorScale){
        // change fill color of us states
        const states = map.selectAll(".states")
            .style("fill", (d) => {
                return colorScale(d.properties[expressed]);
            });
    };

    
    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        // chart frame dimensions
        chartWidth = window.innerWidth * 0.425;
        chartHeight = 460;

        const chartLocation = "body";

        // if small screen size, place chart within drawer instead of body
        if (checkSmallWidth.matches)
            chartLocation = ".drawer__content";

        // create chart
        const chart = d3.select(chartLocation)
            .append("svg")
            .attr("height", chartHeight)
            .attr("class", "chart");
    
        // create bars for each state
        const bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .attr("class", (d) => {
                return "bars " + d.postal;
            })
            .on("mouseover", (event, d) => {
                highlight(d);
            })
            .on("mouseout", (event, d) => {
                dehighlight(d);
            })
            .on("mousemove", moveLabel);
    
        const desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');
        
        
        //annotate bars with attribute value text
        const numbers = chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .attr("class", (d) => {
                return "numbers " + d.state;
            })
            .attr("text-anchor", "middle");
    
    
        const chartTitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 40)
            .attr("class", "chartTitle");

        const chartSubtitle = chart.append("text")
            .attr("x", 20)
            .attr("y", 60)
            .attr("class", "chartSubtitle");
    
        setBarchart(csvData, colorScale, bars, numbers, chartTitle);
    };
    
    
    // function to create a dropdown menu for attribute selection
    function createDropdown(csvData){        
        
        var dropdownLocation = "body";

        // if small screen size, place chart within drawer instead of body
        if (checkSmallWidth.matches)
            dropdownLocation = ".drawer__header__content";

        //add select element
        const dropdown = d3.select(dropdownLocation)
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });
    
        //add initial option
        const titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");
    
        //add attribute name options
        const attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArrayAlias)
            .enter()
            .append("option")
            .attr("value", (d) => { 
                // use values of attrArray but display alias to user
                return attrArray.at(attrArrayAlias.indexOf(d) + 2);
            })
            .text((d) => { return d });
    };
    

    function createCheckbox(){
        d3.select("body")
            .append("fieldset")
            .append("div")
                .attr("class", "label_options")
            .append("label")
                .attr("for", "bar_labels")
            .html('<input type="checkbox" id="bar_labels" checked=true class="number_labels">Show Bar Chart Labels')
            .on("change", updateBarLabels);
    };
    
    
    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;
    
        //recreate the color scale
        const colorScale = makeColorScale(csvData);
    
        //recolor enumeration units
        const states = d3.selectAll(".states")
            .transition()
            .delay(100)
            .duration(500)        
            .style("fill", (d) => {
                if (d.properties[expressed])
                    return colorScale(d.properties[expressed]);
                
                return "#ccc";
            });
        
        //Sort, resize, and recolor bars
        const bars = d3.selectAll(".bars");
        const numbers = d3.selectAll(".chart").selectAll(".numbers");
        const chartTitle = d3.selectAll(".chartTitle");
    
        setBarchart(csvData, colorScale, bars, numbers, chartTitle);
    }
    
    
    function setBarchart(csvData, colorScale, bars, numbers, chartTitle){ 
        const chart = document.querySelector(".chart");

        if(chart.clientWidth != 0){
            chartWidth = chart.clientWidth;
            chartInnerWidth = chartWidth - leftPadding - rightPadding;
        }
        const aliasIndex = attrArray.indexOf(expressed)-2;
        
        //change chart title and subtitle
        d3.selectAll(".chartTitle").text(attrArrayAlias[aliasIndex]);
        d3.selectAll(".chartSubtitle").text(enumerationUnits[aliasIndex]);
        
        //Sort, resize, and recolor bars
        bars.sort((a, b) => { // sort bars
                return a[expressed] - b[expressed];
            })
            .transition()
            .delay(100)
            .duration(500)
            .attr("width", chartWidth / csvData.length - 1)
            .attr("x", (d, i) => {
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            //resize bars
            .attr("height", (d, i) => {
                return chartHeight - (chartHeight - yScale(parseFloat(d[expressed]))); 
            })
            .attr("y", (d, i) => {
                return chartHeight - yScale(parseFloat(d[expressed]));
            })
            //recolor bars
            .style("fill", (d) => {                     
                if(d[expressed]) {                
                    return colorScale(d[expressed]);            
                } else {                
                    return "#ccc";            
                }    
            });
    
        //annotate bars with attribute value text
        numbers.sort((a, b) => {
                return a[expressed] - b[expressed]
            })
            .attr("x", (d, i) => {
                return i * (chartInnerWidth / csvData.length) + leftPadding + 5;
            })
            .attr("y", (d) => {
                return chartHeight - yScale(parseFloat(d[expressed])) + 15;
            })
            .text((d) => {
                if(attrArray.indexOf(expressed) >= 7 && attrArray.indexOf(expressed) <= 13){
                    return d3.format(".2f")(d[expressed]) + '%';
                }
                else{
                    return d3.format(".2f")(d[expressed])
                }
            })
            .attr("transform", function(d, i) { // rotate labels to be vertical
                const locationData = this.getBBox();
                const centerX = locationData.x + (locationData.width / 2);
                const centerY = locationData.y + (locationData.height / 2);
    
                let result = 'translate(' + centerX + ',' + centerY + ')';
                result += 'rotate(-90)';
                result += 'translate(' + (-centerX) + ',' + (-centerY) + ')';
                result += 'translate(35,0)'; //offset vertically
                return result;
            });
    
    }
    
    
    //function to highlight enumeration units and bars
    function highlight(props){
        //change stroke
        d3.selectAll("." + props.postal)
            .style("stroke", "#00B3B3")
            .style("stroke-width", "2");
    
        //add label pop-up
        setLabel(props);
    };
    
    
    function dehighlight(props){
        
        d3.selectAll("." + props.postal)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
    
                return getStyle(this, "stroke-width")
            });
        
    
        function getStyle(element, styleName){
            const styleText = d3.select(element)
                .select("desc")
                .text();
    
            const styleObject = JSON.parse(styleText);
    
            return styleObject[styleName];
        };
    
        //remove label pop-up
        d3.select(".infolabel")
            .remove();
    }
    
    
    //function to create dynamic label
    function setLabel(props){
        const aliasIndex = attrArray.indexOf(expressed)-2;
        
        //label content
        const labelAttribute = "<h1>" + d3.format(".2f")(props[expressed]) +
            "</h1><b>" + enumerationUnits[aliasIndex] + "</b>";
        
        //create info label div
        let infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.postal + "_label")
            .html(labelAttribute);
    
        const stateName = infolabel.append("div")
            .attr("class", "labelname")
            .html(() => {
                if(props.name)
                    return props.name;
                else
                    return props.state;
            });
    };
    
    
    // function to move info label with mouse
    function moveLabel(){
        //get width of label
        const labelWidth = d3.select(".infolabel")
            .node()
            .getBoundingClientRect()
            .width;
    
        //use coordinates of mousemove event to set label coordinates
        const x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;
    
        //horizontal label coordinate, testing for overflow
        const x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        const y = event.clientY < 75 ? y2 : y1; 
    
        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    
    
    function handleZoom(e){        
        d3.selectAll("path")
            .attr('transform', e.transform);
    };
    
    
    //update yScale to just above highest value in array
    function updateYScale(domainArray){
        maxVal = d3.max(domainArray);
        yScale.domain([0,round5(maxVal + 0.05*maxVal)]);
    };
    
    //round up x to nearest increment of 5
    function round5(x)
    {
        return Math.ceil(x / 5) * 5;
    }
    
    })();