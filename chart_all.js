const fsPromises = require('fs/promises')
const { Op } = require('sequelize')
const path = require('path')
const moment = require('moment')
require('dotenv').config()
const { ChartJSNodeCanvas } = require('chartjs-node-canvas')

let Submission, SubmissionData, Series

const width = 1000; //px
const height = 800; //px
const backgroundColour = '#eeeee4'; 
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour, plugins: {
  modern: ['chartjs-adapter-moment', 'chartjs-plugin-autocolors']
  }
});

const scales = {
  xAxes: {
    type: 'time',
    time: {
      round: 'hour',
      stepSize: 2,
    }
  },
  yViews: {
    type: 'linear',
    display: 'auto',
    position: 'left',
    title: {
      text: 'Views',
      display: true
    },
    grace: '2%',
  },
  yRating: {
    type: 'linear',
    position: 'right',
    display: 'auto',
    suggestedMin: 4.5,
    max: 5,
    grace: '5%',
    title: {
      text: 'Rating',
      display: true
    },
    // grid line settings
    grid: {
      drawOnChartArea: false, // only want the grid lines for one axis to show up
    }
  },
}

const promises = []


/*

foreach db
  get series -
  get submissions for series -
    foreach submission -
    get data for submission -
    generate chart for submission
    save as series_submission
  get mixed data for all submissions
  save as series_rating and series_views
*/

async function generateGraphs(from) {
  try {
    let data = {}
    // get Series
    const series = await Series.findAll()
    for (let s of series) {
      const serTitle = s.title
      data[serTitle] = data[serTitle] || {}
      // get Submissions and build chart for each
      for (let sub of await s.getSubmissions()) {
        const subTitle = sub.title
        const where = {}
        // filter if from is not all_time
        if (from !== 'all_time') {
          where.createdAt = {
            [Op.gte]: moment().subtract(1, 'day').format()
          }
        }
        data[serTitle][subTitle] = buildData(await sub.getSubmissionData({
          order: [['createdAt', 'ASC']],
          where
        }), subTitle)
        const filename = path.join(__dirname, 'charts', serTitle, from, `${subTitle}.png`)

        const dataset = [{
          label: 'Rating',
          data: data[serTitle][subTitle].ratings,
          yAxisID: 'yRating'
        },
        {
          label: 'Views',
          data: data[serTitle][subTitle].views,
          yAxisID: 'yViews'
        }]
        promises.push(drawChart(dataset, scales, filename))
      }

      // build chart for each series
      // deep copy without reference to original object
      let customScales = JSON.parse(JSON.stringify(scales))
      customScales.yRating.position = 'left'
      customScales.yRating.grid.drawOnChartArea = true
      let filename = path.join(__dirname, 'charts', serTitle, from, `all_rating.png`)
      let dataset = []
      for (let name in data[serTitle]) {
        const sub = data[serTitle][name]
        dataset.push({
          label: sub.title,
          data: sub.ratings,
          yAxisID: 'yRating'
        })
      }
      promises.push(drawChart(dataset, customScales, filename))
      filename = path.join(__dirname, 'charts', serTitle, from, `all_views.png`)
      dataset = []
      for (let name in data[serTitle]) {
        const sub = data[serTitle][name]
        dataset.push({
          label: sub.title,
          data: sub.views,
          yAxisID: 'yViews'
        })
      }
      promises.push(drawChart(dataset, customScales, filename))
    }
    return Promise.all(promises)
  } catch (error) {
    console.error(error)
  }
}

function buildData(entries, title) {
  let data = {
    views: [],
    ratings: [],
    title
  }
  entries.forEach(el => {
    if(el.view_count >= 100){
      data.views.push({
        x: moment(el.createdAt).format(),
        y: el.view_count
      })
    }
    // filter out rating with low amount of votes
    if (el.rate_all >= 1.0 && el.rate_all <= 4.99) {
      data.ratings.push({
        x: moment(el.createdAt).format(),
        y: el.rate_all
      })
    }
  })
  return data
}

async function drawChart(datasets, scales, filename) {
  console.log(`Drawing chart ${filename}`)
  // Generate the chart using Chart.js
  const configuration = {
    type: 'line',
    data: {
      datasets
    },
    options: {
      responsive: false,
      scales,
      datasets: {
        line: {
          tension: 0.2,
          borderWidth: 3,
          pointRadius: 0
        }
      }
    }
  }

  const image = await chartJSNodeCanvas.renderToBuffer(configuration)

  // create parent dir if not exists
  await fsPromises.mkdir(path.dirname(filename), { recursive: true })

  return fsPromises.writeFile(filename, image).then(() => {
    console.log(`Chart ${filename} saved`)
  })
}


async function connectDb() {
  try {
    ({Submission, SubmissionData, Series} = await require('./db.js'))
  } catch (error) {
    console.error(error);
  }
}


connectDb().then(() => {

  // generate for all time and since last day
  for (let from of ['all_time', 'last_day']) {
    generateGraphs(from)
  }
})
