import data from './asia-augmented.geo.json'

const COVID_DATA_ATTRIBUTE = 'covid_prevalence_normalized'
const COVID_INDEX_ATTRIBUTE = 'covid_date_index'
const COVID_SCALE_ATTRIBUTE = 'covid_scale'

// Time
const dataTime = data[COVID_INDEX_ATTRIBUTE].map(d => new Date(d));

var sliderTime = d3
  .sliderBottom()
  .min(d3.min(dataTime))
  .max(d3.max(dataTime))
  .step(1000 * 60 * 60 * 24)
  .width(300)
  .tickFormat(d3.timeFormat('%m-%d'))
  .tickValues(dataTime)
  // .default(new Date(1998, 10, 3))
  .on('onchange', val => {
    d3.select('p#value-simple').text(d3.timeFormat('%Y-%m-%d')(val));
    updateMap(val);
  });

var gTime = d3
  .select('div#slider-simple')
  .append('svg')
  .attr('width', 500)
  .attr('height', 100)
  .append('g')
  .attr('transform', 'translate(30,30)');

gTime.call(sliderTime);

d3.select('p#value-simple').text(d3.timeFormat('%Y-%m-%d')(sliderTime.value()));

// link slider to data

const width = 960;
const height = 500;

const svg = d3.select('svg')
  .attr('width', width)
  .attr('height', height)
  .attr('viewBox', [0, 0, width, height])
  .style('border', '1px solid black')

const defaultPath = d3.geoPath(d3.geoProjection((x,y) => {
  return [x, y]
}).fitExtent([[0,0],[width, height]], data))

function clip(a,b) {
  return function (x) {
    return Math.max(Math.min(x,b),a)
  }
}

function convert(val) {
  const clipped = clip(0,255)(val);
  const s = Number(clipped).toString(16);
  return s.length==1 ? '0'+s : s;
}

function rgba(r,g,b,a) {
  return '#' + convert(r)+convert(g)+convert(b)+convert(a)
}

// return an RGB string of red with opacity
function alphaRed(float) {
  // float goes from 0 to 1
  const integer = Math.floor(float*255)
  return rgba(255,0,0,integer)
}

// -------- data wrangling --------------

function plotVal(index) {
  return (feature) => {
    if (!feature.properties[COVID_DATA_ATTRIBUTE]) {
      return 0
    }
    return feature.properties[COVID_DATA_ATTRIBUTE][index];
  }
}

const minDate = new Date(data[COVID_INDEX_ATTRIBUTE][0]);

const fillFn = date => {
  const index = Math.floor((date - minDate)/(24 * 60 * 60 * 1000))
  const plotAtIndex = plotVal(index);
  return feature => {
    return alphaRed(plotAtIndex(feature))
  }
}

const updateMap = date => {
  const fillForDate = fillFn(date);
  svg.selectAll('path')
    .data(data.features)
    .join('path')
      .attr('d', defaultPath)
      .attr('fill', fillForDate)
      .attr('stroke', 'gray')
      .attr('stroke-width', 0.6)
}

updateMap(new Date(data[COVID_INDEX_ATTRIBUTE][0]))