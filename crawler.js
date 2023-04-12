require('dotenv').config()
const axios = require('axios');

const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const jar = new CookieJar();
const loginClient = wrapper(axios.create({ jar }));

let Submission, SubmissionData, Series, JWT


async function connectDb() {
    try {
        ({Submission, SubmissionData, Series} = await require('./db.js'))
    } catch (error) {
        console.error(error);
        process.exit()
    }
}

async function getSeriesDetails(seriesId) {
    const data = await axios.get(`https://www.literotica.com/api/3/series/${seriesId}`)
    return data.data.data

}

async function getSubmissionDetails(submissionId) {
    const data = await axios.get(`https://www.literotica.com/api/3/stories/${submissionId}`)
    return data.data.submission
}

async function storeSubmissionData(submission, series) {
    let existingSubmission = await Submission.findOne({
        where: {
            id: submission.id
        }
    })

    // privateAPi does not have series info
    // series will only be created on private api crawl

    if (series === null && !existingSubmission) {
        const details = await getSubmissionDetails(submission.id)

        // use pseudo series if submission is not part of a series
        series = details.series?.meta?.id || 1

        
        
        const existingSeries = await Series.findOne({
            where: {
                id: series
            }
        })

        if(!existingSeries) {
            if(series === 1) {
                // create pseudo series
                await Series.create({
                    id: 1,
                    title: 'No Series',
                    is_public: false
                })
            }else{
                const seriesDetails = await getSeriesDetails(series)
                await Series.create({
                    id: series,
                    title: seriesDetails.title,
                    is_public: false
                })
            }
        }
        
    }

    if (!existingSubmission) {
        existingSubmission = await Submission.create({
            title: submission.title,
            date_approve: submission.date_approve,
            id: submission.id,
            type: submission.type,
            seriesId: series
        })
    }

    return SubmissionData.create({
        is_hot: submission.is_hot,
        rate_all: submission.rate_all,
        view_count: submission.view_count,
        rate_all_count: submission?.rate_all_count,
        rate_member_count: submission?.rate_member_count,
        submissionId: existingSubmission.id
    })
}

async function login() {
    await loginClient.post('https://auth.literotica.com/login',{
        login: process.env.USER,
        password: process.env.PASS
    }, {
        headers: {
            'content-type': 'application/json',
            'cookie': 'stateUsernameLogin='+process.env.USER
        }
    })
    const timestamp = ((new Date()).getTime() / 1000).toFixed(0)
    const token = await loginClient.get(`https://auth.literotica.com/check?timestamp=${timestamp}`, {
        withCredentials: true
    })
    return token.data
}

async function crawlPublicSeries(seriesId) {
    const promises = []
    const response = await axios.get(`https://literotica.com/api/3/series/${seriesId}/works`)

    for (let submission of response.data) {
        promises.push(storeSubmissionData(submission, seriesId))
    }

    return Promise.all(promises)
}

async function crawlPrivateApi(page = 1) {
    const config = {
        headers: { Authorization: JWT }
    }
    const response = await axios.get(`https://literotica.com/api/3/submissions/my/stories/published?params={"page":"${page}"}`, config)
    const { data } = response.data

    for (let submission of data) {
        await storeSubmissionData(submission, null)
    }
    if (response.data.current_page < response.data.last_page) {
        await crawlPrivateApi(page + 1)
    }
}



connectDb().then(async () => {
    try {
        const promises = []
        // crawl public submissions from series
        let series = await Series.findAll({
            where: {
                is_public: true
            }
        })

        for (let ser of series) {
            promises.push(crawlPublicSeries(ser.id))
        }

        // crawl private submissions
        JWT = await login()
        promises.push(crawlPrivateApi())

        return Promise.all(promises)
    } catch (error) {
        console.error(error);
    }
})