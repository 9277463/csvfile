const main = document.getElementById("main");
main.innerHTML = "<p>Loading...";

fetch('/file', { method: 'GET' })
    .then((response) => response.json())
    .then((file) => main.innerHTML = getListFiles(file))
    .then(() => {
        $('#myTable').dataTable();
        $('.loader').hide();
    });

const getListFiles = (file) => {
    const TR = file
        .map((file) => `
      <tr>
        <td>${file.code_postal}</td>
        <td>${file.ville}</td>
        <td>${file.adresse}</td>
        <td>${file.genre}</td>
        <td>${file.nom}</td>
        <td>${file.prenom}</td>
        <td>${file.tel1}</td>
        <td>${file.habitat}</td>
        <td>${file.age_moyen}</td>
      </tr>`)
        .join("\n");

    return TR;
};

console.log('Client-side code running');

async function getFile() {
    const response = await fetch('/file', { method: 'GET' });
    const data = await response.json();
    return data;
}


async function Export(input_export) {
    const response = await fetch('/export', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(input_export)
    });
    const data = await response.json();
    return data;
}

async function Import(csvfile) {
    const formData = new FormData();
    formData.append("CsvFile", csvfile);
    const response = await fetch('/upload', {
        method: 'POST',
        headers: {
            'encType': 'multipart/form-data'
        },
        body: formData
    });
    const data = await response.json();
    return data;
}

const btn_export = document.getElementById('ExportBtn');
btn_export.addEventListener('click', async function(e) {
    var input_export = document.getElementById('InputExport').value;
    const ExportData = await Export({ cp: input_export });
    // console.log('ExportData : ', ExportData);
    if (ExportData) {
        window.location.href = `./download/${ExportData.fileName}`;
        setTimeout(function() {
            const df = deletefile(ExportData.fileName);
        }, 10000);

    }
});

function deletefile(fileName) {
    const deletefile = fetch('/deletefile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName: fileName })
    });
}

const btn_import = document.getElementById('ImportBtn');
btn_import.addEventListener('change', async function(e) {
    main.innerHTML = "<p>Loading...";
    $('.loader').show();
    const ImportData = await Import(btn_import.files[0]).then(async function(response) {
        // $('.loader').hide(); 
        // console.log('responseqqqqq : ', response); 
        if (response.ri > 0) {
            alert(`${response.ri} rows Inserted in database!`);
        }
        if (response.rni > 0) {
            alert(`${response.rni} rows already exists in database!`);
        }
        location.reload();
    });
});