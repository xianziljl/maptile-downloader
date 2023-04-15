const { parentPort } = require('worker_threads');
const fs = require('fs');
const axios = require('axios');


async function downloadFile(url, filePath, force = false) {
    if (!force && fs.existsSync(filePath)) {
        return true;
    }
    const res = await axios({ url, method: 'GET', responseType: 'stream', timeout: 5000 });
    const writer = fs.createWriteStream(filePath);
    res.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

parentPort.on('message', async e => {
    const { url, filePath, force } = e;
    try {
        await downloadFile(url, filePath, force);
        parentPort.postMessage('success');
    } catch (e) {
        parentPort.postMessage('error');
    }
});