const express = require('express')
const app = express();
const mongoose = require('mongoose');
const NodeMediaServer = require('node-media-server');
const cors = require('cors');

const camera = require('./models/camera.js');
const port = '3696';

app.use(cors());
app.use(express.json());
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*'); //หรือใส่แค่เฉพาะ domain ที่ต้องการได้
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

main().catch(err => console.log(err));

async function main() {
  //mongodb+srv://admin:1TbDItoRBcl4mXFx@cluster0.m0d39cd.mongodb.net/
  await mongoose.connect('mongodb+srv://admin:1TbDItoRBcl4mXFx@cluster0.m0d39cd.mongodb.net/live_stream').then(
    () => console.log('Connection MongoDB Successfully!')
  ).catch(
    (err) => console.error(err)
  );
    
  const relayTask = [];
  let cameraData = await camera.find({});
  // console.log("cameraData : ",cameraData);
  for (let i = 0; i < cameraData.length; i++) {
    var rstpUrl = 'rtsp://'+cameraData[i].user+':'+cameraData[i].password+'@'+cameraData[i].ip+':554/stream1';
    var pathName = cameraData[i].camID
    // console.log(rstpUrl);
    // console.log(pathName);
    relayTask.push(
      {
        app: 'live',
        mode: 'static',
        edge: rstpUrl,
        name: pathName,
        rtsp_transport : 'tcp',
        rtsp_flags : 'h264_mode0'
      }
    );
  }
  // console.log(relayTask);
  const config = {
    rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
    },
    http: {
      port: 8000,
      mediaroot: './media',
      allow_origin: '*'
    },
    trans: {
      ffmpeg: 'ffmpeg/ffmpeg.exe',
      tasks: [
        {
          app: 'live',
          hls: true,
          hlsFlags: '[hls_time=6:hls_list_size=6:hls_flags=delete_segments]'
        }
      ]
    },
    relay: {
      ffmpeg: 'ffmpeg/ffmpeg.exe',
      tasks: relayTask
    }
  };
  //console.log(config);
  const nms = new NodeMediaServer(config);
  nms.run();

  setInterval(async () => {
    let newcameraData = await camera.find({});
    // console.log("newcameraData : ", newcameraData);
    if (JSON.stringify(cameraData) != JSON.stringify(newcameraData)) {
      console.log("DATABASE HAS CHANGED!!, RESTART SYSTEM...");
      cameraData = newcameraData;
      await nms.stop();
      console.log(".");
      console.log("..");
      console.log("...");
      await nms.run();
      console.log("RESTART SUCCESSFULLY!");
    }
  }, 300000);
}

app.get('/camera/:id', async (req, res) => {
  // console.log('ID = ',req.params.id);
  if (req.params.id){
    //console.log("Have request data!!!");
    if(req.params.id == 'allCam'){
      //console.log("if1");
      const cameraData = await camera.find({});
      res.json(cameraData);
    }else if(req.params.id == 'live'){
      console.log('ID = ',req.params.id);
    } else{
      //console.log("if2");
      const query = {"camID" : req.params.id};
      //console.log(query);
      const cameraData = await camera.find(query);
      //console.log(cameraData);
      res.json(cameraData);
    }
  }else{
    console.log("Error!! Not request data!!!");
  }
});
app.post('/addcamera', cors(), async (req, res) => {
  console.log(req.body);
  camera.create(req.body).then(() => {
    console.log('User registered successfully!');
    res.redirect('/');
}).catch((error) => {
    //console.error(error.errors);
    if(error){
        const validationErrors = Object.keys(error.errors).map(key => error.errors[key].message)
        console.error(validationErrors);
        req.flash('validationErrors', validationErrors);
        req.flash('data', req.body);
        return res.redirect('/register');
    }
})

});
app.listen(port,()=>{
  console.log("App listening on port "+port);
})