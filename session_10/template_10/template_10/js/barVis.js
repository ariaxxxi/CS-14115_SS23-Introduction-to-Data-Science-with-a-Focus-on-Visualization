/* * * * * * * * * * * * * *
*      class BarVis        *
* * * * * * * * * * * * * */


class BarVis {

    // ####################################################
    // TODO | Task BarVis-2 : Set up the constructor method for class architecture
    // You can check out how we did it in mapVis.js.
    // Don't forget to call function initVis() in the end of the constructor

    constructor(parentElement, covidData, usaData, descending) {
        this.parentElement = parentElement;
        this.covidData = covidData;
        this.usaData = usaData;
        this.displayData = [];
        this.descending = descending;

        this.parseDate = d3.timeParse("%m/%d/%Y");

        this.initVis()
    }


    initVis(){
        let vis = this;

        vis.margin = {top: 20, right: 20, bottom: 20, left: 40};
        vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

        // init drawing area
        vis.svg = d3.select("#" + vis.parentElement).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append('g')
            .attr('transform', `translate (${vis.margin.left}, ${vis.margin.top})`);

        // add title
        vis.svg.append('g')
            .attr('class', 'title bar-title')
            .append('text')
            .text('Title for Barchart')
            .attr('transform', `translate(${vis.width / 2}, 10)`)
            .attr('text-anchor', 'middle');

        // tooltip
        vis.tooltip = d3.select("body").append('div')
            .attr('class', "tooltip")
            .attr('id', 'barTooltip')

        vis.xAxisGroup = vis.svg.append('g')
            .attr('class','axis x-axis')
            .attr('transform',"translate(0," + vis.height + ")")

        vis.yAxisGroup = vis.svg.append('g')
            .attr('class','axis y-axis')

        this.wrangleData();
    }

    wrangleData(){
        let vis = this
        // Pulling this straight from dataTable.js
        let filteredData = [];

        // if there is a region selected
        if (selectedTimeRange.length !== 0) {
            //console.log('region selected', vis.selectedTimeRange, vis.selectedTimeRange[0].getTime() )

            // iterate over all rows the csv (dataFill)
            vis.covidData.forEach(row => {
                // and push rows with proper dates into filteredData
                if (selectedTimeRange[0].getTime() <= vis.parseDate(row.submission_date).getTime() && vis.parseDate(row.submission_date).getTime() <= selectedTimeRange[1].getTime()) {
                    filteredData.push(row);
                }
            });
        } else {
            filteredData = vis.covidData;
        }

        // prepare covid data by grouping all rows by state
        let covidDataByState = Array.from(d3.group(filteredData, d => d.state), ([key, value]) => ({key, value}))

        // init final data structure in which both data sets will be merged into
        vis.stateInfo = []

        // merge
        covidDataByState.forEach(state => {

            // get full state name
            let stateName = nameConverter.getFullName(state.key)

            // init counters
            let newCasesSum = 0;
            let newDeathsSum = 0;
            let population = 0;

            // look up population for the state in the census data set
            vis.usaData.forEach(row => {
                if (row.state === stateName) {
                    population += +row["2020"].replaceAll(',', '');
                }
            })

            // calculate new cases by summing up all the entries for each state
            state.value.forEach(entry => {
                newCasesSum += +entry['new_case'];
                newDeathsSum += +entry['new_death'];
            });

            // populate the final data structure
            vis.stateInfo.push(
                {
                    state: stateName,
                    population: population,
                    absCases: newCasesSum,
                    absDeaths: newDeathsSum,
                    relCases: (newCasesSum / population * 100),
                    relDeaths: (newDeathsSum / population * 100)
                }
            )
        })

        console.log('Final bar data structure', vis.stateInfo)

        // ####################################################
        // TODO | Task BarVis-4 : Sort and then filter by top 10

        if (vis.descending){
            vis.stateInfo.sort((a,b) => { return b.absCases - a.absCases})
        }
        else {
            vis.stateInfo.sort((a,b) => { return a.absCases - b.absCases})
        }

        vis.topTenData = vis.stateInfo.filter((el,i) => {return i<10})

        console.log("top ten data", vis.topTenData)

        vis.updateVis()

    }

    updateVis(){
        let vis = this;

        vis.xScale = d3.scaleBand()
            .domain( vis.topTenData.map (d => d.state))
            .range([0, vis.width])
            .padding(0.1)


        vis.yScale = d3.scaleLinear()
            .domain([0, d3.max(vis.topTenData, d => d[selectedCategory])])
            .range([vis.height, 0])


        vis.xAxisGroup.call(d3.axisBottom(vis.xScale))
        vis.yAxisGroup.call(d3.axisLeft(vis.yScale))



        //apply color
        let color = ''

        let maxN = d3.max(vis.stateInfo, d => d[selectedCategory])

        vis.colorScale = d3.scaleLinear()
            .domain([0,maxN])
            .range(['#FFFFFF','#136D70'])


        vis.bar = vis.svg.selectAll('rect')
            .data(vis.topTenData, d => d.state)

        vis.bar
            .enter()
            .append('rect')
            .merge(vis.bar)
            .attr('y', d => vis.yScale(d.absCases))
            .attr('height', d => vis.height - vis.yScale(d[selectedCategory]))
            .attr('width', vis.xScale.bandwidth())
            .attr('fill',d => {
                return color = vis.colorScale(d[selectedCategory])
            })
            .on('mouseover', function (event, d) {


                selectedState = d.state
                let stateData = {}
                vis.stateInfo.forEach(stateDict => {
                    if (selectedState === stateDict.state){
                        stateData = stateDict
                    }
                })

                d3.select(this)
                    .attr('fill','darkblue')

                myBrushVis.wrangleDataResponsive();

                vis.tooltip
                    .style('opacity',1)
                    .style('left',event.pageX + "px")
                    .style('top', event.pageY + "px")
                    .html(`
                        <div style="border: thin solid grey; border-radius: 5px; background: lightgrey; padding: 20px">
                            <h3>${stateData.state}<h3>
                            <h4> Population: ${stateData.population}</h4>
                            <h4> Cases (absolute): ${stateData.absCases}</h4>
                            <h4> Deaths (absolute): ${stateData.absDeaths}</h4>
                            
                    </div>`);
            })

            .on('mouseout', function (event, d) {
                d3.select(this)
                    .attr('fill',d => {
                        return color = vis.colorScale(d[selectedCategory])
                    })

                myBrushVis.wrangleDataResponsive();

                vis.tooltip
                    .style('opacity',0)
                    .style('left',0+"px")
                    .style('top',0+"px")
            })
            .transition()
            .duration(1000)
            .attr('x', d => vis.xScale(d.state))
            .attr('y', d => vis.yScale(d.absCases))
            .attr('height', d => vis.height - vis.yScale(d[selectedCategory]))
            .attr('width', vis.xScale.bandwidth())
            .attr('fill',d => {
                return color = vis.colorScale(d[selectedCategory])
            })


        vis.bar.exit().remove()
    }



}