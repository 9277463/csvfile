const ProgressBar = require("./ProgressBar");
const Bar = new ProgressBar();
const chalk = require('chalk');
const csvtojson = require("csvtojson");
const MongoClient = require('mongodb').MongoClient;
const connectionString = 'mongodb://localhost:27017';

XLSX = require('xlsx');

const workBook = XLSX.readFile(__dirname + '/file.xlsx');
XLSX.writeFile(workBook, __dirname + "/file.csv", { bookType: "csv" });

console.log(chalk.blue("file.csv was saved in the current directory!"));
(async () => {
  let client = await MongoClient.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
  let db = client.db('file');
  csvtojson().fromFile("file.csv").then(async function(csvData) {
    let current = 0;
    Bar.init(csvData.length);
    let rows_insert = rows_ninsert = 0;
    for (let i = 0; i < csvData.length; i++)
    {
      try {
        const res = await db.collection("file").findOne({ "tel": csvData[i].tel });
        if (!res) {
          const res = await db.collection("file").insertOne(csvData[i]);
          rows_insert++;
        }else{
          rows_ninsert++;
        }
      } catch (err) {
        console.log('err : ', err);
      }
      Bar.update(i);
    }
    console.log('');
    if (rows_insert > 0) {
      console.log(chalk.green(`Insert line numbers : ${rows_insert}`));
    }
    if (rows_ninsert > 0) {
      console.log(chalk.red(`already exists in database : ${rows_ninsert}`));
    }
    client.close();  
  });
})()
.catch(err => console.error('err : ', err));