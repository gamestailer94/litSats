const Sequelize = require('sequelize')
const { DataTypes } = require('sequelize')
require('dotenv').config()

async function connectDb() {
    // Define the database connection
    const DB_NAME = process.env.DB_NAME_OVERRIDE || process.env.DB_NAME
    sequelize = new Sequelize(DB_NAME, process.env.DB_USER , process.env.DB_PW, {
        host: process.env.DB_HOST,
        dialect: 'mysql'
    })

    // Define the model for the submissions table
    const Submission = sequelize.define('submission', {
        title: DataTypes.STRING,
        date_approve: DataTypes.STRING,
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: false
        },
        type: DataTypes.STRING
    })

    // Define the model for the changing fields table
    const SubmissionData = sequelize.define('submission_data', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        is_hot: DataTypes.BOOLEAN,
        rate_all: DataTypes.FLOAT,
        view_count: DataTypes.INTEGER,
        rate_all_count: DataTypes.INTEGER,
        rate_member_count: DataTypes.INTEGER
    })

    const Series = sequelize.define('series', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: false
        },
        title: DataTypes.STRING,
        is_public: DataTypes.BOOLEAN
    })

    // Define the association between the tables
    Submission.hasMany(SubmissionData, {
        foreignKey: 'submissionId',
        as: 'submissionData'
    })
    SubmissionData.belongsTo(Submission)
    Series.hasMany(Submission,{
        foreignKey: 'seriesId'
    })
    Submission.belongsTo(Series)

    await sequelize.sync()

    return {Submission,SubmissionData,Series,sequelize}
}

module.exports = connectDb()