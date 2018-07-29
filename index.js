const fs = require('fs');
const dms2dec = require('dms2dec');
const xml2js = require('xml2js');
const Bro = require('brototype');

const parser = new xml2js.Parser();

const basePath = 'J:/01_Foto/02_Reisen/2018/02_NYC/Jan';
// const basePath = './data';

const images = fs.readdirSync(basePath);

async function readExifData() {
    var geojson = {
        "type": "FeatureCollection",
        "features": []
    }

    for (let idx = 0; idx < images.length; idx++) {
        const filename = images[idx];
        if (filename.indexOf('.xmp') == -1) {
            continue;
        }
        try {
            console.log(filename);
            let exif = await readExif(basePath, filename);
            // console.log(exif);
            geojson
                .features
                .push(exif.geojson);
        } catch (e) {
            console.error(e);
        }
    }
    return geojson;
}

async function writeGeojson() {
    const geojson = await readExifData();
    fs.writeFileSync("./output/images.json", JSON.stringify(geojson));
}

function readExif(basePath, filename) {


    return new Promise((resolve, reject) => {
        fs.readFile(basePath + '/' + filename, function (err, fileContent) {
            parser.parseString(fileContent, function (err, parsedFile) {
                const rawMeta = Bro(parsedFile).iCanHaz('x:xmpmeta.rdf:RDF.0.rdf:Description.0.$');
                Bro(rawMeta).iCanHaz('')
                let parsedMeta = {};

                for (const key in rawMeta) {
                    if (rawMeta.hasOwnProperty(key)) {
                        const element = rawMeta[key];
                        const keys = key.split(':');
                        if (!parsedMeta[keys[0]]) parsedMeta[keys[0]] = {};
                        parsedMeta[keys[0]][keys[1]] = element;
                    }
                }


                const lat = parsedMeta.exif.GPSLatitude;
                const lng = parsedMeta.exif.GPSLongitude;

                if (!lat || !lng) {
                    reject("No GPS Data in EXIF");
                    return;
                }

                const latArray = lat.slice(0, -1).split(',').map(e => parseFloat(e));
                latArray.push(0);

                const lngArray = lng.slice(0, -1).split(',').map(e => parseFloat(e));
                lngArray.push(0);

                const decGPS = dms2dec(latArray, lat.split('').pop(), lngArray, lng.split('').pop());

                let geojson = {
                    type: "Feature",
                    properties: {
                        fíle: filename,
                        date: new Date(parsedMeta.exif.DateTimeOriginal),
                        lat: decGPS[0],
                        lng: decGPS[1]
                        // exif: exif.exif, image: exif.image
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: decGPS.reverse()
                    }

                };

                resolve({
                    // meta: parsedMeta,
                    geojson: geojson
                })
            });
        })

    });
}

writeGeojson();


