'use strict'

const mqtt = require('mqtt');

let dayjs = require('dayjs');
let utc = require('dayjs/plugin/utc')
let timezone = require('dayjs/plugin/timezone') // dependent on utc plugin
dayjs.extend(utc)
dayjs.extend(timezone)

//device_id, msg_id
let ids = new Map();

const { calculateCRC } = require('./checksum');

//user admin
//adMqWs/ws$OmQt^121224

let initMQTT = () => {
    this.mqttClient = mqtt.connect('mqtt://mq.zigbeelight.net:1883',
        {
            username: 'adMqWs',
            password: Buffer.from('ws$OmQt^121224')
        })

    this.mqttClient.on('connect', () => {
        console.log("MQTT connected!");

        this.mqttClient.subscribe('rinlink/sb/+/feedback', { qos: 2 }, (err) => {
            console.log(`*****MQTT Subscribe 'rinlink/sb/+/feedback': ${err ? err : 'OK'}`);
        });

        this.mqttClient.subscribe('omqt/+/data', { qos: 2 }, (err) => {
            console.log(`*****MQTT Subscribe 'omqt/+/data': ${err ? err : 'OK'}`);
        });

        this.mqttClient.subscribe('omqt/+/command', { qos: 2 }, (err) => {
            console.log(`*****MQTT Subscribe 'omqt/+/command': ${err ? err : 'OK'}`);
        });
    });

    this.mqttClient.on('reconnect', () => {
        console.log("*****MQTT reconnect!")
    });
    this.mqttClient.on('disconnect', () => {
        console.log("*****MQTT disconnect!")
    });
    this.mqttClient.on('close', () => {
        console.log("*****MQTT close!")
    });
    this.mqttClient.on('offline', () => {
        console.log("*****MQTT offline!")
    });
    this.mqttClient.on('error', (err) => {
        console.log("*****MQTT error!", err)
    });

    this.mqttClient.on('message', (topic, message) => {

        let msg = message.toString();

        if (topic.toString().match(/omqt\/.*\/data/)) {

            //topic data
            let start = topic.indexOf('omqt/') + 5;
            let end = topic.indexOf('/data');
            let deviceId = topic.substring(start, end);
            let mesBody;

            try {
                mesBody = JSON.parse(msg);
                if (mesBody.type && mesBody.type == 1) {

                    let pub_data = {
                        request_id: mesBody.msg_id,
                        money: mesBody.data
                    }

                    this.mqttClient.publish(`PTCSP/${deviceId}`, JSON.stringify(pub_data), { qos: 1, retain: false }, (err) => {
                        if (err) { console.log(`*****MQTT publish 'PTCSP/${deviceId}' ERR: ${err}`); }
                    });
                }
            } catch (error) {
                console.log('error mes: ', mesBody);
            }
        }

        if (topic.toString().match(/omqt\/.*\/command/)) {
            //console.log(topic, message);
        }

        if (topic.toString().match(/rinlink\/sb\/.*\/feedback/)) {

            let start = topic.indexOf('rinlink/sb/') + 11;
            let end = topic.indexOf('/feedback');
            let deviceId = topic.substring(start, end);
            let mesBody;

            try {
                mesBody = JSON.parse(msg);

                // Kiểm tra xem là feedback hay là ton
                if (mesBody.request_id && mesBody.voiceType && mesBody.iccid && mesBody.version && mesBody.state) {
                    let pub_data = {
                        device_id: deviceId,
                        data: 'ton',
                        time: dayjs().utc().format()
                    }

                    this.mqttClient.publish(`omqt/${deviceId}/event`, JSON.stringify(pub_data), { qos: 1, retain: false }, (err) => {
                        if (err) { console.log(`*****MQTT publish 'omqt/${deviceId}/event' ERR: ${err}`); }
                    });
                }
                else {
                    let pub_data = {
                        device_id: deviceId,
                        msg_id: mesBody.request_id,
                        time: dayjs().utc().format()
                    }

                    this.mqttClient.publish(`omqt/${deviceId}/feedback`, JSON.stringify(pub_data), { qos: 1, retain: false }, (err) => {
                        if (err) { console.log(`*****MQTT publish 'omqt/${deviceId}/feedback' ERR: ${err}`); }
                    });
                }

            } catch (error) {

            }

        }
    });
}


initMQTT();