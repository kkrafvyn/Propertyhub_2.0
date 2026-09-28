import tls from "node:tls";
import dns from "node:dns/promises";
const hosts=["aws-0-eu-west-1.pooler.supabase.com","db.ixmbfnfwpjwbfahqaftc.supabase.co"];
for (const host of hosts) {
  try {
    const addresses=await dns.lookup(host,{all:true});
    const result=await new Promise((resolve)=>{
      const socket=tls.connect({host,port:5432,servername:host,rejectUnauthorized:false},()=>{
        const cert=socket.getPeerCertificate(true);
        resolve({host,addresses:addresses.map(x=>x.address),authorized:socket.authorized,authorizationError:socket.authorizationError,subject:cert.subject,issuer:cert.issuer,valid_from:cert.valid_from,valid_to:cert.valid_to});
        socket.destroy();
      });
      socket.setTimeout(10000,()=>{resolve({host,addresses,error:"timeout"});socket.destroy();});
      socket.on("error",error=>resolve({host,addresses,error:error.message}));
    });
    console.log(JSON.stringify(result,null,2));
  } catch (error) { console.log(JSON.stringify({host,error:error.message},null,2)); }
}
