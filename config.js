const path = require('path');
const fs = require('fs');
const electron = require('electron');
// const dataPath = (electron.app || electron.remote.app).getPath('userData');
const filePath = path.join(__dirname, 'config.json');

module.exports.writeData = (key, value) => {
    let contents = parseData()
    contents[key] = value;
    fs.writeFileSync(filePath, JSON.stringify(contents));
}

module.exports.readData = (key) => {
    let contents = parseData()
    return contents[key]
}

function parseData() {
    const defaultData = {}
    try {
        return JSON.parse(fs.readFileSync(filePath));
    } catch (error) {
        return defaultData;
    }
}