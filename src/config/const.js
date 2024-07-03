'use strict';

// Load the AWS SDK
var AWS = require('aws-sdk'),
    region = "us-east-1",
    secretName = "GKServices-" + process.env.stage,
    secret,
    decodedBinarySecret;

// Create a Secrets Manager client
var client = new AWS.SecretsManager({
    region: region
});


let config = {
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    server: process.env.RDS_SERVER,
    database: process.env.RDS_DATABASE,
    options: {
        enableArithAbort: true
    }
};

const _getSSM = function getSSM() {
    return new Promise((resolve, reject) => {
        client.getSecretValue({SecretId: secretName}, function(err, data) {

            if (err) {
                if (err.code === 'DecryptionFailureException')
                    // Secrets Manager can't decrypt the protected secret text using the provided KMS key.
                    // Deal with the exception here, and/or rethrow at your discretion.
                    throw err;
                else if (err.code === 'InternalServiceErrorException')
                    // An error occurred on the server side.
                    // Deal with the exception here, and/or rethrow at your discretion.
                    throw err;
                else if (err.code === 'InvalidParameterException')
                    // You provided an invalid value for a parameter.
                    // Deal with the exception here, and/or rethrow at your discretion.
                    throw err;
                else if (err.code === 'InvalidRequestException')
                    // You provided a parameter value that is not valid for the current state of the resource.
                    // Deal with the exception here, and/or rethrow at your discretion.
                    throw err;
                else if (err.code === 'ResourceNotFoundException')
                    // We can't find the resource that you asked for.
                    // Deal with the exception here, and/or rethrow at your discretion.
                    throw err;
                reject(err)
            } else {
                // Decrypts secret using the associated KMS CMK.
                // Depending on whether the secret is a string or binary, one of these fields will be populated.
                if ('SecretString' in data) {
                    secret = JSON.parse(data.SecretString);
                    config = {
                        user: secret.RDS_USERNAME,
                        password: secret.RDS_PASSWORD,
                        server: secret.RDS_SERVER,
                        database: secret.RDS_DATABASE,
                        options: {
                            enableArithAbort: true
                        }
                    };
                    resolve(config);
                } else {
                    let buff = new Buffer(data.SecretBinary, 'base64');
                    decodedBinarySecret = buff.toString('ascii');
                    resolve(decodedBinarySecret);
                }
            }

        });
    });
}


module.exports = {
    getSSM: _getSSM,
    headers:{
        'Access-Control-Allow-Headers': 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, accept, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers',
        'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS,POST,PUT',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
    }
}





