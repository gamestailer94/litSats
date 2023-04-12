require('dotenv').config()
const axios = require('axios')

let Series

async function connectDb() {
    try {
        ({Series} = await require('./db.js'))
    } catch (error) {
        console.error(error)
        process.exit()
    }
}

connectDb().then(async () => {
    const seriesId = process.argv[2]
    const series = await Series.findOne({
        where: {
            id: seriesId
        }
    })
    if(series) {
        console.error(`Series '${series.title}' (${seriesId}) already exists`)
        process.exit()
    }

    const seriesDetails = await axios.get(`https://www.literotica.com/api/3/series/${seriesId}`)
    const seriesData = seriesDetails.data.data

    await Series.create({
        id: seriesData.id,
        title: seriesData.title,
        is_public: true
    })

    console.log(`Series '${seriesData.title}' (${seriesId}) created`)


})