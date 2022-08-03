exports.handler = async function(context, event, callback) {
try{
console.log(JSON.stringify(event));
console.log((event.Request))
const { Duplex } = require("stream");
const ftp = require("basic-ftp");
const twilioClient = context.getTwilioClient();
const callArray = process.env.SALESPEOPLE.split(", ");
let to;
from = event.From;
const base = process.env.BASEURL;
let url;
const greeting = `${base}/greeting.m4a`;
let leadNum = event.lead;
const twimlAction = `https://mk-upwork-8502.twil.io/processInput?lead=${leadNum}`;
 



const leadTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting your call to the customer</Say>
<Dial>
	<Number>${leadNum}</Number>
</Dial>
</Response>`



const leadStream = new Duplex();
leadStream.push(Buffer.from(leadTwiml));
leadStream.push(null);

    const salesTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
       <Gather action="${twimlAction}" method="POST" input="dtmf" timeout="3" numDigits="1">
        <Play>
        ${greeting}
        </Play>
       </Gather>
       <Redirect method="POST">${twimlAction}</Redirect>
      </Response>`;

  //Save Twiml to XML
  
  const salesStream = new Duplex();
  salesStream.push(Buffer.from(salesTwiml));
  salesStream.push(null);
 


async function upload(stream, fileName) {
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
            await client.ensureDir("twilionotifications.com/public_html/twiml/")
            await client.uploadFrom(stream, `${fileName}.xml`);
        }
      catch(err) {
          console.log(err)
      }
      client.close()
  }

if(event.Digits === '1'){
    //Call Sales person first then call lead
    console.log('Connect to lead');
    to = event.To;
    await upload(leadStream, leadNum);
    url = `${base}/twiml/${leadNum}.xml`;
    await twilioClient.calls.create({ to, from, url })
    return callback(); 
    
}else {
    //Attempt another salesperson
    console.log('Keep calling')
    to = callArray[callArray.indexOf(event.To)+1];
    if(to != undefined){
    await upload(salesStream, to);     
    url = `${base}/twiml/${to}.xml`;
    await twilioClient.calls.create({ to, from, url });
    return callback(); 
    }
    else{
        //Send SMS stating no salesperson answered the call
        to = process.env.NOANSWERCONTACT;
        const body = 'No one accepted the Rockstar Connect text lead. Please check your email for details.';
        await twilioClient.messages.create({ body, to, from });
        return callback(); 
    }

}
}catch(err){
    console.error(err);
    return callback(err);
}

}