const express = require('express');
const fileUpload = require('express-fileupload');
const MongoClient = require('mongodb').MongoClient;
const app = express();

var extra = require('fs.extra');
var fs = require('fs');
const chalk = require('chalk');
const fastcsv = require("fast-csv");
const Parser = require('json2csv');
const csvtojson = require("csvtojson");

app.use(fileUpload());
app.use(express.json());
app.use(express.static('./'));

let db;
const url = "mongodb://localhost:27017";

const downloadResource = (res, fileName, fields, data) => {
    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(fileName);
    return res.send(csv);
}

const client = MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) {
        return console.log(err);
    }
    db = client.db("file");
    app.listen(8080, () => {
        console.log("listening on 8080");
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/file', async (req, res) => {
    const data = await db.collection("file").find({}).toArray();
    res.send(data);
});

app.post('/export', async (req, res) => {
    let filter = {};
    const cp = req.body.cp;
    let code_postal = '';

    if (cp.includes(",")) {
        code_postal = cp.split(',');
        postal_code = `-(${cp.replace(",", "-")})-`;
    } else {
        code_postal = (cp)?.length > 0 ? [cp] : '';
        postal_code = (cp)?.length > 0 ? '-'+cp+'-' : '-';
    }
    let fileName = `code_postal${postal_code}${Math.floor(Date.now() / 1000)}.csv`;

    if (code_postal.length > 0) {
        filter = { ...filter, "code_postal": { $in: code_postal } };
    }

    let data = {};
    if (JSON.stringify(filter).length > 2) {
        data = await db.collection("file").find(filter).toArray();
    } else {
        data = await db.collection("file").find({}).toArray();
    }

    if (data) {
        for (let i = 0; i < data.length; i++) {
            delete data[i]._id;
        }		

        const ws = await fs.createWriteStream(`./download/${fileName}`);
        const fileWrite = await fastcsv.write(data, { headers: true }).on("finish", function() {
            console.log(chalk.green(`Write to ./download/${fileName} successfully!`));
        }).pipe(ws);
        fileWrite
    } else {
        console.log(chalk.red('no data availabla'));
    }
    res.send({ data: data, fileName: fileName });
});

app.post('/import', async (req, res) => {
    res.send({ csvfile: req.body });
});

app.post('/deletefile', async (req, res) => {
	const r = await removeDownloadFile(req.body.fileName);
    res.send({ deletefile_ok: req.body.fileName });
});

app.post('/upload', async function(req, res) {
    let CsvFile;
    let uploadPath;
    let fileName = `code_postal-${Math.floor(Date.now() / 1000)}.csv`;
    let rows_insert = rows_ninsert = ri = rni = 0;

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }
    CsvFile = req.files.CsvFile;
    uploadPath = __dirname + '/uploads/' + fileName;

    CsvFile.mv(uploadPath, async function(err) {
        if (err)
            return res.status(500).send(err);

        csvtojson().fromFile(`./uploads/${fileName}`).then(async function(csvData) {

            for (let i = 0; i < csvData.length; i++) {
                try {
                    const res = await db.collection("file").findOne({ "tel1": csvData[i].tel1 });
                    if (!res) {
                        const res = await db.collection("file").insertOne(csvData[i]);
                        rows_insert++;
                    } else {
                        rows_ninsert++;
                    }
                } catch (err) {
                    console.log('err : ', err);
                }
            }
            if (rows_insert > 0) {
                ri = `Insert line numbers : ${rows_insert}`;
            }
            if (rows_ninsert > 0) {
                rni = `already exists in database : ${rows_ninsert}`;
            }
            const r = await removeUploadsFile(fileName);
            const data = await db.collection("file").find({}).toArray();
            // const data = await db.collection("file").find({}).limit(20).toArray();
            res.send({data: data, ri: rows_insert, rni: rows_ninsert});
        });
    });
});

async function removeUploadsFile (fileName) {
  try {
    await extra.remove(`./uploads/${fileName}`)
    console.log(`./uploads/${fileName} removed success!`);
  } catch (err) {
    console.error(err)
  }
}

async function removeDownloadFile (fileName) {
  try {
    await extra.remove(`./download/${fileName}`)
    console.log(`./download/${fileName} removed success!`);
  } catch (err) {
    console.error(err)
  }
}