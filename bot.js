const fs = require('fs');
const { Client, InterfaceController, Location, List, Buttons } = require('./index');
const buffer = require('buffer');
const QRCode = require('qrcode');
const XMLHttpRequest = require('xhr2');
const smile=String.fromCodePoint(0x1F603);
const spiral0=String.fromCodePoint(0x1F635);
const spiral1=String.fromCodePoint(0x200D);
const spiral2=String.fromCodePoint(0x1F4AB);
var spiral=spiral0+spiral1+spiral2;
const doc=String.fromCodePoint(0x1F4C3);
const picture=String.fromCodePoint(0x1F5BC);
const okay=String.fromCodePoint(0x1F44D);
const antenna=String.fromCodePoint(0x1F4E1);
const phone=String.fromCodePoint(0x1F4F1);
const call=String.fromCodePoint(0x1F919);
/*const link="https://easytaxserverstaging.azurewebsites.net/wabot/users?phone=";
const linkRequestUrl= "https://easytaxserverstaging.azurewebsites.net/wabot/getuploadurl?userId=";
const linkPost = "https://easytaxserverstaging.azurewebsites.net/wabot/addnewdocument";*/
const link = "https://api.easytaxassistant.it/wabot/users?phone=";
const linkRequestUrl = "https://api.easytaxassistant.it/wabot/getuploadurl?userId=";
const linkPost = "https://api.easytaxassistant.it/wabot/addnewdocument";
const username = "";
const password = "";
const base64Credentials = Buffer.from(username + ":" + password).toString('base64');

function gestisciErrore(error) {
    console.log(error);
}
console.log("Start");

const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}
else fs.writeFile(SESSION_FILE_PATH,"{}", function (err) {
    if (err) {
        return console.log(err);
    }

    console.log("session created");
});


//whatsapp client
const client = new Client({ puppeteer: { headless: true }, session: sessionCfg, restartOnAuthFail: true, authTimeoutMs: 8000 });
// You can use an existing session and avoid scanning a QR code by adding a "session" object to the client options.
// This object must include WABrowserId, WASecretBundle, WAToken1 and WAToken2.

// You also could connect to an existing instance of a browser
// { 
//    puppeteer: {
//        browserWSEndpoint: `ws://localhost:3000`
//    }
// }

client.initialize();
//function for http requests
var HttpClient = function () {
    //method GET
    this.get = function (aUrl) {
        return new Promise(function (resolve, reject) {
            var anHttpRequest = new XMLHttpRequest();
            anHttpRequest.onreadystatechange = function () {
                if (anHttpRequest.readyState == 4) {
                    if (anHttpRequest.status == 200)
                        resolve(anHttpRequest.response);
                    else 
                        reject(new Error(anHttpRequest.statusText));
                }
            }

            anHttpRequest.open("GET", aUrl, true);
            anHttpRequest.setRequestHeader("Authorization", "Basic " + base64Credentials);
            anHttpRequest.send(null);
        });
    }
    //method PUT
    this.put = function (aUrl, data) {
        return new Promise(function (resolve, reject) {
            var HttpPut = new XMLHttpRequest();
            HttpPut.onreadystatechange = function () {
                if (HttpPut.readyState == 4) {
                    if (HttpPut.status == 200)
                        resolve(HttpPut.status);
                    else 
                        reject(new Error(HttpPut.statusText));
                }
            }
            HttpPut.open("PUT", aUrl, true);
            HttpPut.send(Buffer.from(data, 'base64'));
        });
    }
    //method POST
    this.post = function (aUrl, json) {
        return new Promise(function (resolve, reject) {
            var HttpPost = new XMLHttpRequest();
            HttpPost.onreadystatechange = function () {
                if (HttpPost.readyState == 4) {
                    if (HttpPost.status == 200)
                        resolve(HttpPost.response);
                    else 
                        reject(new Error (HttpPost.statusText));
                }
            }
            HttpPost.open("POST", aUrl, true);
            HttpPost.setRequestHeader("Authorization", "Basic " + base64Credentials);
            HttpPost.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            HttpPost.send(json);
        });
    }
}

var clientHttp = new HttpClient();

var clientHttp_file = new HttpClient();

// Function to upload data on profile with userID
function saveFile(data, userID, mimetype) {
    return new Promise(function (resolve, reject) {
        clientHttp_file.get(linkRequestUrl + userID).then(
            (responseUrl) => {
                responseUrl = JSON.parse(responseUrl);
                if (responseUrl["Result"] == 1 && responseUrl["Exception"]==null ){
                    console.log(responseUrl.Data);
                    clientHttp_file.put(responseUrl.Data, data).then(
                        (responsePut) => {
                                console.log("Put Request: " + responsePut);
                                var obj = new Object();
                                obj.OwnerId = userID;
                                obj.S3FilePath = responseUrl.Data.substring(0, responseUrl.Data.indexOf("?"));
                                obj.Extension = mimetype.substring(mimetype.indexOf("/") + 1);
                                var myJSON = JSON.stringify(obj);
                                console.log(myJSON);
                                clientHttp_file.post(linkPost, myJSON).then(
                                    (responsePost) => {
                                        responsePost = JSON.parse(responsePost);
                                        if (responsePost["Result"] == 1 && responsePost["Exception"] == null) {
                                            console.log(responsePost.Data.Files);
                                            resolve("Doc uploaded");
                                        }
                                        else reject(new Error("Errore post Exception:" + responsePost.Exception));
                                    })
                                    .catch(gestisciErrore);
                        },
                        (_error) => reject(new Error("Errore put")));
                }
                else reject(new Error("Errore richiesta URL Exception:" + responseUrl.Exception));
            })
            .catch(gestisciErrore);
    });
}

client.on('qr', (qr) => {
    // NOTE: This event will not be fired if a session is specified.
    console.log('QR RECEIVED', qr);
    const src = './qrcode.png';
    const stream = fs.createWriteStream(src);
    QRCode.toFileStream(stream, qr);
    
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('auth_failure', msg => {
    // Fired if session restore was unsuccessfull
    console.error('AUTHENTICATION FAILURE', msg);
    fs.unlink(SESSION_FILE_PATH, (err) => {
        if (err) throw err;
        console.log('session.json was deleted');
    });
});

client.on('ready', () => {
    console.log('READY');
});
//message recieved management  
client.on('message', async msg => {
    console.log('MESSAGE RECEIVED', msg);

    client.interface.openChatWindow(msg.id.remote);
    //client.pupPage.reload();

    if (msg.type === "e2e_notification") {
        return;
    }
    var telefono = msg.id.remote;
    telefono = telefono.replace("@c.us", "");
    telefono = telefono.substring(2);
    //http request to find phone number in the DB
    clientHttp.get(link + telefono).then(
        (response_http) => {
            response_http = JSON.parse(response_http);
            if (response_http["Result"] == 1 && response_http["Exception"] == null) {
                //number found in the DB
                if (msg.hasMedia) {
                    //download media from message
                    var document = msg.downloadMedia().then(
                        (response) => {
                            return response;
                        },
                        (error) => { console.log("error download => ",error) });
                    //document upload
                    const printDocumentFilename = async () => {
                        const a = await document;
                        const util = require("util")
                        console.log(util.inspect(document).includes("pending"));
                        if (util.inspect(document).includes("pending")) {
                            msg.reply("Scusa ho un problema nel caricare questa immagina, riprova a inviare");
                            
                        }
                        if (a.mimetype === 'application/pdf') {
                            msg.reply("Vedo che mi hai inviato un documento...  " + doc + " Carico! " + antenna);
                            saveFile(a.data, response_http.Data.Id, a.mimetype).then(
                                (response) => {
                                    console.log(response);
                                    msg.reply("Documento caricato! Accedi al tuo profilo per visualizzarlo! " + okay);
                                },
                                (_error) => {
                                    console.log(_error);
                                    msg.reply("Mi dispiace, c'è stato un problema nel caricamento, per favore riprova più tardi, grazie.");
                                });
                        }
                        else if (a.mimetype === 'image/jpeg' || a.mimetype === 'image/png') {
                            msg.reply("Vedo che mi hai inviato un'immagine... " + picture + " Carico! " + antenna);
                            saveFile(a.data, response_http.Data.Id, a.mimetype).then(
                                (response) => {
                                    console.log(response);
                                    msg.reply("Immagine caricata! Accedi al tuo profilo per visualizzarla! " + okay);
                                },
                                (_error) => {
                                    console.log(_error);
                                    msg.reply("Mi dispiace, c'è stato un problema nel caricamento, per favore riprova più tardi, grazie.");
                                });
                        }
                        else
                            msg.reply("Mi dispiace, hai inviato un formato non supportato, riprova con un pdf o un'immagine, grazie! " + spiral);
                    };
                    printDocumentFilename();
                }
                else if (msg.type === "call_log") msg.reply("Ho notato che hai provato a chiamarmi. Sfortunatamente il mio creatore non mi ha ancora insegnato a rispondere. " + call);
                else msg.reply("Benvenuto nel bot ufficiale di EasyTax Assistant! " + smile + "\n" + response_http.Data.Name + " puoi inviare i documenti che intendi caricare sul tuo profilo!");
            }
            else {
                //send msg to different devices if not signed up
                switch (msg.deviceType) {
                    case "android":
                        msg.reply("Salve " + smile + ", sembra che tu non sia registrato, scarica ora la nostra app play.google.com/store/apps/details?id=it.ibc.easytaxassistant&hl=it&gl=US\nIn caso tu sia già registrato, assicurati di aggiungere il tuo numero di cellulare " + phone + " al profilo per usufruire delle funzionalità del bot!");
                        break;
                    case "ios":
                        msg.reply("Salve " + smile + ", sembra che tu non sia registrato, scarica ora la nostra app apps.apple.com/it/app/easytax-assistant/id1227676752\nIn caso tu sia già registrato, assicurati di aggiungere il tuo numero di cellulare " + phone + " al profilo per usufruire delle funzionalità del bot!");
                        break;
                    case "web":
                        msg.reply("Salve " + smile + ", sembra che tu non sia registrato, iscriviti sul nostro sito https://web.easytaxassistant.it/registration\nOppure scarica la nostra app su android o ios.\nIn caso tu sia già registrato, assicurati di aggiungere il tuo numero di cellulare " + phone + " al profilo per usufruire delle funzionalità del bot!");
                        break;
                }
            }
        },
        (_error) => {
            console.log(_error);
            msg.reply("Mi dispiace, ho riscontrato dei problemi con il server, riprovare più tardi per favore! Buona giornata!" + spiral);
        });
    
    });
client.on('message_create', (msg) => {
    // Fired on all message creations, including your own
    if (msg.fromMe) {
        // do stuff here
    }
});
client.on('message_ack', (msg, ack) => {
    /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

    if (ack == 3) {
        // The message was read
    }
});
client.on('change_battery', (batteryInfo) => {
    // Battery percentage for attached device has changed
    const { battery, plugged } = batteryInfo;
    console.log(`Battery: ${battery}% - Charging? ${plugged}`);
   
});
client.on('change_state', state => {
    console.log('CHANGE STATE', state);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    fs.unlink(SESSION_FILE_PATH, (err) => {
        if (err) throw err;
        console.log('session.json was deleted');
    });
    client.destroy();
});
