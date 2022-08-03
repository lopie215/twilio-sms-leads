exports.handler = async function(context, event, callback) {
  console.log('salesCall ' + JSON.stringify(event));
  try{
    //const piPath =  Runtime.getFunctions()['processInput'].path;
    const twilioClient = context.getTwilioClient();
    const { Duplex } = require("stream");
    const ftp = require("basic-ftp");
    let leadNum = event.From;
    leadNum = leadNum.slice(1);
    const from = event.To;
    const callArray = process.env.SALESPEOPLE.split(", ");
    let to = callArray[0].slice(1);
    const base = process.env.BASEURL;
    let url = `${base}/twiml/sales/${to}.xml`;
    const twimlAction = `${process.env.PROCESSINPUTPATH}?lead=${leadNum}`;
    const greeting = `${base}/salesgreeting.mp3`;
    const body = event.Body.toLowerCase();

    // Create Sales Twiml
    const salesTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
       <Gather action="${twimlAction}" method="POST" input="dtmf" timeout="3" numDigits="1">
        <Play>
        ${greeting}
        </Play>
       </Gather>
       <Redirect method="POST">${twimlAction}</Redirect>
      </Response>`;

  
  //Check keyword
  if(body === process.env.KEYWORD.toLowerCase()){
  
  
  //Save Twiml to XML
  
  const salesStream = new Duplex();
  salesStream.push(Buffer.from(salesTwiml));
  salesStream.push(null);



  //Push XML to webhost via ftp
  await upload();

  await twilioClient.calls.create({ to, from, url });
  return callback();


  async function upload() {
      const client = new ftp.Client()
      client.ftp.verbose = false
      try {
          await client.access({
              host: process.env.FTPURL,
              user: process.env.FTPUSER,
              password: process.env.FTPPASSWORD,
              secure: false
          })
            console.log(await client.list())
            await client.ensureDir("twilionotifications.com/public_html/twiml/sales/")
            await client.uploadFrom(salesStream, `${to}.xml`);
        }
      catch(err) {
          console.log(err)
      }
      await client.close()
  }
  }else{
    return callback();
  }
  
  }
  catch(err){
    console.error(err);
    return callback(err);
  }


}