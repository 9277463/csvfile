const args = process.argv[2];
const ProgressBar = require("./ProgressBar");
const Bar = new ProgressBar();
const chalk = require('chalk');

const fastcsv = require("fast-csv");
const fs = require("fs");
const ws = fs.createWriteStream("exported_file.csv");

const MongoClient = require('mongodb').MongoClient;
const connectionString = 'mongodb://localhost:27017';

let filter = {};
const code_postal = (args?.split("code_postal=")[1])?.length > 0 ? args.split("code_postal=")[1] : '';

if (code_postal.length > 0) {
  filter = { ...filter, "code_postal" : code_postal};
}

(async () => {
  let client = await MongoClient.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
  let db = client.db('file');
  let data = {};
  if (JSON.stringify(filter).length > 0) {
    data = await db.collection("file").find(filter).toArray();
  }else{
    data = await db.collection("file").find({}).toArray();
  }
  if (data) {
    let current = 0;
    Bar.init(data.length);
    let exported_rows = 0;
    for (let i = 0; i < data.length; i++)
    {
      delete data[i]._id;
      exported_rows++;
      Bar.update(i);
    }
    console.log('');
    fastcsv.write(data, { headers: true }).on("finish", function() {
      console.log(chalk.green(`Write to exported_file.csv successfully!`));
    }).pipe(ws);
  }else{
    console.log(chalk.red('no data availabla'));
  }
  client.close();
})()
.catch(err => console.error('err : ', err));