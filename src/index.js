import { fromEvent } from 'rxjs'

import data from './asia-midres-augmented.geo.json'

// Time
const dataTime = data.date_index.map(d => new Date(d));
// var dataTime = d3.range(0, 10).map(function(d) {
//   return new Date(1995 + d, 10, 3);
// });

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

let dataLen

const maxVal = data.features.reduce((a,v) => {
  if (v.properties?.daily_covid_cases) {
    if (!dataLen) {
      dataLen = v.properties.daily_covid_cases.length
    }
    return Math.max(a,Math.max(...v.properties.daily_covid_cases)/v.properties.population)
  } else {
    return a
  }
}, 0)/100

function plotVal(index) {
  return (feature) => {
    if (!feature.properties.daily_covid_cases) {
      return 0
    }
    const percentage = feature.properties.daily_covid_cases[index]/feature.properties.population;
    const relative = percentage / maxVal;
    return relative; // goes from 0 to 1
  }
}

const minDate = new Date(data.date_index[0]);

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

updateMap(new Date(data.date_index[0]))