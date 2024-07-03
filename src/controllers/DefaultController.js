//librerias externas
const AWS = require('aws-sdk');
const sql = require('mssql');
const sanitizer = require('sanitize')();
// const paginate = require('jw-paginate');

//librerias internas
const STAGE = process.env.stage;
const Utils = require('../utils/utils');
const { getSSM } = require('../config/const');

const Default = () => {};


Default.getDefault = async(req, res, callback) => {

    try {
        const requestData = req.body;

        const getConfig = await getSSM();
        const pool = await sql.connect(getConfig);
        console.log("POOL: ", pool);
        const sqlQuery = ` `;
        //const result = await pool.request()
        //.query(sqlQuery);

        return {
            status: "success",
            data: {
                message: "Fierro...!!!"
            }
        };
    } catch(err){
        console.error("ERROR: ", err );
        return Utils.errorResponse(500, err.message, callback)
    }

};


module.exports = Default;