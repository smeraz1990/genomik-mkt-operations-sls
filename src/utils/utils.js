'use strict';
//librerias externas
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const lambda = new AWS.Lambda();
const XMLreader = require('xml-js');
const jwt_decode = require('jwt-decode');



//librerias internas
const STAGE = process.env.stage;

const Utils = () => {};

Utils.errorResponse = (code, errorMessage, callback) => {
    console.error("❌ errorResponse: ", errorMessage);
    return {
        status: "fail",
        data: {
            message: errorMessage,
            Reference: "gk.tk.operations.reports.srv",
        }
    }
}

Utils.getBucket = (type, name) => {
    let Bucket = "";
    let path = "";

    switch (type) {
        case "profile":
            Bucket = "admin-genomik-ng-assets";
            path = `profile_images/${name}`;
            break;
        case "contratos":
            Bucket = "gk-confidential-files";
            path = `Admin/Contratos/${name}`;
            break;
        case "cfdi-xml":
            Bucket = "gk-confidential-files";
            path = `Admin/CFDI/${name}`;
            break;
        case "cfdi-pdf":
            Bucket = "gk-confidential-files";
            path = `Admin/CFDI/${name}`;
            break;
        case "tk-results":
            Bucket = "gk-confidential-files";
            path = `operations/tami-k/reports/${name}`;
            break;
        case "convenios-hp":
            Bucket = "gk-confidential-files";
            path = `operations/audi-k/convenios-hp/${name}`;
            break;
        case "dhl":
            Bucket = "gk-confidential-files";
            path = `operations/DHL/${name}`;
            break;
        case "audik-results":
            Bucket = "gk-confidential-files";
            path = `operations/audi-k/results/${name}`;
            break;
        case "meetings-file":
            Bucket = "gk-confidential-files";
            path = `System/Reuniones/${name}`;
            break;
        case "meetings-pdf":
            Bucket = "gk-confidential-files";
            path = `System/Reuniones/PDF/${name}`;
            break;
        case "tickets-file":
            Bucket = "gk-confidential-files";
            path = `System/Tickets/${name}`;
            break;
        case "imagen-pf":
            Bucket = "gk-confidential-files";
            path = `operations/tami-k/ImagenPF/${name}`;
            break;
        default:
            Bucket = "gk-confidential-files";
            path = `operations/${name}`;
            break;
    }

    return {
        Bucket: Bucket,
        path: path
    }

}

Utils.createPDF = (options) => {
    console.info("OPTIONS: ", options)
    try {

        return new Promise((resolve, reject) => {
            const params = {
                FunctionName: 'gk-pdfservice-sls-' + STAGE + '-generate_pdf', // the lambda function we are going to invoke
                InvocationType: 'RequestResponse',
                LogType: 'Tail',
                Payload: '{ "body": {"name": "' + options.name + '", "type": "' + options.type + '", "data": "' + options.html + '" }}'
            };
            lambda.invoke(params, (err, data) => {
                if (err) {
                    console.error("❌ ERROR gRPC: ", err);
                    reject(err)
                } else {
                    console.info("✅ RESPONSE: ", data.Payload);
                    const { body } = JSON.parse(data.Payload)
                    resolve(body)
                }
            });
        });

    } catch (e) {
        console.error("❌ Error: ", e);
    }
}

Utils.getFromS3 = (options) => {
    console.info("OPTIONS: ", options)
    try {

        const { Bucket, path } = Utils.getBucket(options.type, options.name);

        return new Promise((resolve, reject) => {
            const params = {
                Bucket: Bucket,
                Key: path
            };

            s3.getObject(params, (err, resp) => {
                if (err) {
                    console.error("❌ ERROR: S3: ", err);
                    reject(err)
                } else {
                    const objectData = resp.Body.toString('base64'); // Use the encoding necessary
                    console.log("✅ File response...!!! ", resp);
                    resolve(objectData)
                }
            });
        });

    } catch (e) {
        console.error("❌ Error: ", e);
    }
}

Utils.uploadToS3 = (options) => {
    console.info("OPTIONS: ", options)
    try {
        const { Bucket, path } = Utils.getBucket(options.type, options.name);

        return new Promise((resolve, reject) => {
            const params = {
                Bucket: Bucket,
                Key: path,
                Body: options.raw,
                ACL: 'bucket-owner-full-control'
            };
            console.log("✅ FIERRO");

            s3.putObject(params, (err, resp) => {
                if (err) {
                    console.error("❌ ERROR: S3: ", err);
                    const response = {
                        status: "fail",
                        data: {
                            message: "an error occurred while uploading the image",
                            s3: err
                        }
                    }
                    reject(err)
                } else {
                    console.log("✅ File uploaded!: ", resp);
                    const response = {
                        status: "success",
                        data: {
                            message: "the image was uploaded successfully",
                            s3: resp
                        }
                    }
                    resolve(response)
                }
            });
        });

    } catch (e) {
        console.error("❌ Error: ", e);
    }
}

Utils.decodeToken = (Token) => {
    try {

        Token = Token.replace('Bearer ', '')
            //console.info("TOKEN: ", Token)
        const decodedToken = jwt_decode(Token);
        console.info("✅ DECODE: ", decodedToken);
        return {
            status: "success",
            data: decodedToken
        }
    } catch (e) {
        console.error("❌ Error: ", e);
        return {
            status: "fail",
            data: e
        }
    }

}

Utils.readXML = (options) => {
    try {
        //console.info("✅ Options: ", options.xml)
        const xmlData = XMLreader.xml2json(options.xml, { compact: true, spaces: 4 });

        //console.info("✅ XML Data: ", xmlData);
        return {
            status: "success",
            data: xmlData
        }
    } catch (e) {
        console.error("❌ Error: ", e);
        return {
            status: "fail",
            data: e
        }
    }

}

Utils.getUsuarioSessionId = (authorizationToken) => {
    try{
        const authToken = authorizationToken.replace("Bearer ","");
        const decoded = jwtDecode(authToken);
        return parseInt(decoded['custom:SQL_Id']);
    } catch(err) {
        return 6;//usuario sistema gk
    }
}

Utils.getNivelSessionId = (authorizationToken) => {
    try {
        const authToken = authorizationToken.replace("Bearer ", "");
        const decoded = jwtDecode(authToken);
        return decoded['custom:SQL_Id'];
    } catch (err) {
        return -1;
    }
}


module.exports = Utils;