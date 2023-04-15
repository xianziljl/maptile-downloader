const yargs = require('yargs');
const path = require('path');
const fs = require('fs');
const cg = require('console-grid');
const { hideBin } = require('yargs/helpers');
const { prompt } = require('enquirer');
const { SingleBar, Presets } = require('cli-progress');
const { Worker } = require('worker_threads');
const { pointToTile, getSiblings } = require('@mapbox/tilebelt');


// --region='119.071877,25.42451,119.918152,25.789433' --source='https://mts2.google.com/vt/lyrs=s&hl=zh-CN&x=[x]&y=[y]&z=[z]' --max=18

function getParams() {
    const argv = yargs(hideBin(process.argv))
        .describe('source', 'http://somesource.com/[x]/[y]/[z]')
        .alias('source', 's')

        .describe('output', '文件输出路径')
        .default('output', 'tiles')
        .alias('output', 'o')

        .number('max')
        .default('max', 20)
        .describe('max', '最大层级')

        .describe('region', '下载范围: "lon,lat,lon,lat" (左下角,右上角)')
        .alias('region', 'r')

        .number('thread')
        .default('thread', 8)
        .describe('thread', '线程数量')
        .alias('thread', 't')

        .default('fileName', 'map.jpg')
        .describe('fileName', '保存文件名')

        .boolean('force')
        .alias('force', 'f')
        .describe('force', '是否覆盖已有同名文件，默认跳过')

        .help('h')
        .alias('h', 'help')
        .alias('v', 'version')
        .argv;
    let { region, max, source } = argv;
    if (!region) {
        throw new Error('Region is required.');
    }
    if (!source) {
        throw new Error('Source is required.');
    }
    region = region.split(',').map(item => parseFloat(item));
    return { ...argv, max, source, region };
}

function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    }
    if (mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname);
        return true;
    }
}


function getUrl(source, tileNo) {
    const [x, y, z] = tileNo;
    return source
        .replace('[x]', x)
        .replace('[y]', y)
        .replace('[z]', z);
}

function getTilesRange(bbox, z) {
    if (z === 0) {
        const tile = [0, 0, 0];
        return { start: tile, end: tile, z, total: 1 };
    }
    const s = pointToTile(bbox[0], bbox[1], z);
    const e = pointToTile(bbox[2], bbox[3], z);
    const start = getSiblings(s).sort((a, b) => a[0] - b[0]).sort((a, b) => b[1] - a[1])[0];
    const end = getSiblings(e).sort((a, b) => b[0] - a[0]).sort((a, b) => a[1] - b[1])[0];

    const total = (start[1] - end[1] + 1) * (end[0] - start[0] + 1);
    return { start, end, z, total };
}

async function run() {
    const params = getParams();
    const tileRanges = [];
    let _z = 0;
    while (_z <= params.max) {
        tileRanges.push(getTilesRange(params.region, _z));
        _z++;
    }
    const total = tileRanges.reduce((sum, cur) => sum + cur.total, 0);
    cg({
        columns: ['level', 'count'],
        rows: tileRanges.map(r => [r.z, r.total.toLocaleString()]),
    });
    const { confirm } = await prompt({
        type: 'confirm',
        name: 'confirm',
        message: '瓦片总数:' + total.toLocaleString() + ' 继续？',
    });

    if (!confirm) {
        return;
    }


    const { output, fileName, force, source, max } = params;
    const bar = new SingleBar({}, Presets.shades_classic);
    let success = 0;
    let error = 0;
    bar.start(total);

    const workers = [];

    let z = 0, z1 = max;
    let s = tileRanges[z].start, e = tileRanges[z].end;
    let y = e[1], y1 = s[1];
    let x = s[0], x1 = e[0];
    const postMessage = (worker) => {
        if (z > z1) {
            return;
        }
        const tileNo = [x, y, z];
        const fileDir = path.join(output, `${z}`, `${x}`, `${y}`);
        mkdirsSync(fileDir);
        const filePath = path.join(fileDir, fileName);
        const url = getUrl(source, tileNo);
        const data = { url, filePath, force };
        worker.postMessage(data);

        x++;
        if (x > x1) {
            x = s[0];
            y++;
        }
        if (y > y1) {
            z++;
            if (z > z1) {
                return;
            }
            s = tileRanges[z].start, e = tileRanges[z].end;
            y = e[1], y1 = s[1];
            x = s[0], x1 = e[0];
        }
    };

    for (let i = 0; i < params.thread; i++) {
        const worker = new Worker('./worker.js');
        workers.push(worker);
        worker.on('message', e => {
            if (e === 'error') {
                error++;
            } else {
                success++;
            }

            const done = success + error;
            bar.update(done);
            if (done === total) {
                workers.forEach(item => item.terminate());
                bar.stop();
                console.log(`下载完成，成功:${success.toLocaleString()}, 失败:${error.toLocaleString()}`);
                return;
            }

            postMessage(worker);
        });
        postMessage(worker);
    }
}

run();