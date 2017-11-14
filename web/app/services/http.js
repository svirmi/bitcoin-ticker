const request = require('request');
const logger = require('../logger');

exports.getInstanceIp = async function (){
  try{
    const options = getInstanceIpOptions();
    const response = await doRequest(options);
    const ip = response.toString('utf-8');
    return "http://" + ip + ":8080";
  }catch(err){
    logger.log("Error trying to retrieve the ip of the host: " + err);
    return "http://localhost:8080";
  }
}

function getInstanceIpOptions(){
  const options = {
    url: 'http://metadata/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip',
    headers: {
      'Metadata-Flavor': 'Google'
    }
  };
  return options;
}

function doRequest(options) {
  return new Promise(function (resolve, reject) {
    request(options, function (error, res, body) {
      if (!error && res.statusCode == 200) {
        resolve(body);
      } else {
        reject(error);
      }
    });
  });
}
