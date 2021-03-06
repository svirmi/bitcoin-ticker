const execAsync = require('async-child-process').execAsync;
const logger = require('./logger');


var start = exports.start = async function(){
  try{
    await execAsync('pulseaudio -D');
  } catch (error) {
    logger.log("Pulse audio failed to start: " + error)
  }
}

var createSink = exports.createSink = async function (sinkName) {
  var sinkId = await readSinkId(sinkName)

  if(sinkId){
    logger.log("Existing Sink id: " + sinkId)
    return sinkId;
  }
  await execAsync('pactl load-module module-null-sink sink_name=' +
  sinkName + ' sink_properties=device.description=' + sinkName);

  sinkId = await readSinkId(sinkName);
  logger.log("New Sink id: " + sinkId);
  return sinkId;
}

var setDefaultSink = exports.setDefaultSink = async function (){
  logger.log("Setting default sink to 'Default'");
  const defaultSink = "Default";
  const defaultSource = defaultSink +".monitor";
  await createSink(defaultSink);
  await execAsync('pacmd set-default-sink ' + defaultSink);
  const {stdout} = await execAsync('pacmd set-default-source ' + defaultSource);
  const setDefaultOutput = stdout.trim();
  return setDefaultOutput;
}

var readSinkId = exports.readSinkId = async function (sinkName){
  const {stdout} = await execAsync('pactl list short sinks | grep ' + sinkName + '| cut -f1');
  const sinkId = stdout.trim();
  return sinkId;
}

var getInputId = exports.getInputId = async function(chromePid) {
  const {stdout} = await execAsync('./scripts/get_input_index.sh ' + chromePid);
  const inputIdList = stdout.trim().split(" ");
  logger.log("Input id: " + inputIdList);
  return inputIdList;
}

var moveInput = exports.moveInput = async function(inputId, sinkId) {
  logger.log("Moving Input id: " + inputId + " to Sink id: " + sinkId);
  const {stdout} = await execAsync('pacmd move-sink-input ' + inputId + ' ' + sinkId);
  const output = stdout.trim();
  return output;
}
