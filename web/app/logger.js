const winston = require('winston');

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

exports.log = function (message){
  //console.log( "[Bullman] " + message );
  //
  // Logging
  //
  logger.log({
    level: 'info',
    message: "[Bullman Api] " + message
  });
}
