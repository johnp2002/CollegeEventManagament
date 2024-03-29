const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server, Socket } = require('socket.io');
const port = process.env.PORT || 4000;
require('dotenv').config()
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

// firebase configs
const { collection, getDocs } = require("firebase/firestore");
const { doc, setDoc } = require("firebase/firestore");

const db = require('./config/firebase');

var data = []
async function getJson(){
    const citiesRef = collection(db, 'teams2');
    const snapshot = await getDocs(citiesRef);
    snapshot.forEach(doc => {
    // console.log(doc.id, '=>', doc.data());
    if(doc.data().status != 'completed'){

      data.push(doc.data())
    }
    });

}
// getJson()
data = require('./jsons/new.json')
// constants values
let queue = {
  status:{
    curr:[],
    next:[]
  },
  queue : []
}
const auth = "96d9632f363564cc3032521409cf22a852f2032eec099ed5967c0d000cec607a";
const { sha256 } = require('js-sha256');

var cList = []
const app = express();
const server = createServer(app);
const io = new Server(server);

// for serving static files to client
app.use(express.static('public'))
// cokkie parser to read cookies of client
app.use(cookieParser())
// body parser for post requests
app.use(bodyParser.urlencoded({ extended: false }))

// student dashboard
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'pages/main.html'));
});

app.post('/querypost',(req,res)=>{
  queue.queue=[]
  if(sha256(req.cookies.auth) != auth){
    res.send('<h1>Un-Authorised Access</h1>')
  } 
  console.log(`post requested userr ${req.cookies}`)
  // console.log(req.body)
  for(let i in req.body){
    // console.log(i)
    let tmp = {'queue': req.body[i] }
    if(req.body[i] != ''){

      queue.queue.push(tmp)
    }
  }
  // queue = req.body
  console.log(queue.queue)

  res.redirect('back')
  io.emit('queue',queue)
});

app.post('/statuspost',(req,res)=>{
  if(sha256(req.cookies.auth) != auth){
    res.send('<h1>Un-Authorised Access</h1>')
  } 
  console.log('status post blackkkk')
  console.log(req.body)
  // queue.status.curr=[]
  // queue.status.next=[]
  // queue.status.curr.push( req.body.curr);
  // queue.status.curr.push( req.body.currID);
  // queue.status.next.push(req.body.next)
  // queue.status.next.push(req.body.nextID)
  // for(let i in req.body){
  //   // console.log(i)
  //   let tmp = {'queue': req.body[i] }
  //   if(req.body[i] != ''){

  //     queue.queue.push(tmp)
  //   }
  // }
  // queue = req.body

  // res.redirect('back')
  // io.emit('queue',queue)
});

// volunteer login page request
app.get('/volunteer',(req,res)=>{
  
  // console.log(req.cookies.auth)
  // try{
  //   console.log(sha256( req.cookies.auth))
  // }catch(err){
  //   console.log(`cathed err ${err}`)
  // }
  // res.sendFile(join(__dirname, 'pages/volunteer.html'));  
  try{
    if(sha256(req.cookies.auth) === auth){
      res.sendFile(join(__dirname, 'pages/volunteer.html'));
    }
    else{
      res.sendFile(join(__dirname, 'pages/auth.html'))
    }
  }catch(err){
    res.sendFile(join(__dirname, 'pages/auth.html'))
  } 
  
  
})

app.get('/evaluator',(req,res)=>{

  try{
    if(sha256(req.cookies.auth) === 'b0b4df86a1580b5f33f2b436c83219b0d7efd32209747fbb2883b70855d7c21b'){
      res.sendFile(join(__dirname, 'pages/evaluator.html'));
    }
    else if(sha256(req.cookies.auth) === 'eb2d2190d3b55d3e46f3a86a6c885228c36956f64a297bf130b4163c6c6196f3'){
      res.sendFile(join(__dirname, 'pages/evaluator2.html'));
    }
    else if(sha256(req.cookies.auth) === '5c7ab9d20ef044dd6e61d66450d78b7e9c5d0eeb7634eb302adec394178ebd2a'){
      res.sendFile(join(__dirname, 'pages/evaluator3.html'));
    }
    else if(sha256(req.cookies.auth) === '855440376d64e718401066c23a92917c82ca3f3ee1e38f965e19003f6174c861'){
      res.sendFile(join(__dirname, 'pages/evaluator4.html'));
    }
    else{
      res.sendFile(join(__dirname, 'pages/auth.html'))
    }
  }catch(err){
    res.sendFile(join(__dirname, 'pages/auth.html'))
  }

})

app.get('/webcam',(req,res)=>{
  res.sendFile(join(__dirname, 'pages/cam.html'));
})


app.get('/admin',(req,res)=>{
  res.sendFile(join(__dirname, 'pages/admin.html'));
})


io.on('connection', (socket) => {
  io.emit('clists',cList)
  // console.log(socket.id)
  socket.on('camData',(data)=>{
    io.emit('camData',data)
  })
  console.log(queue)
  io.emit('queue',queue)
  socket.on('chat message', (msg) => {
    console.log(socket.id)
    socket.broadcast.emit('chat message', msg);
  });

  socket.on('queue',(msg)=>{
    console.log(msg)
    queue = msg;
    io.emit('queue',queue)
  });


});

// volunteers socket 

io.of("/volunteer").on("connection", (socket) => {
  console.log(socket.connected)
  console.log('volunteers connected')
  io.of("/volunteer").emit('stuData',data)
  io.of("/volunteer").emit('queue',queue)
  socket.on('queue',(meg)=>{
    console.log('emitted from volunteer')
    // console.log(meg)
    queue = meg;
    io.emit('queue',queue)
    io.of("/evaluator").emit('currTeam',queue.status.curr)
  })
  socket.on('updateStudent',(m)=>{
    data = m;
    io.of("/evaluator").emit('currTeam',queue.status.curr)
  })
  socket.on('completeTeam',(m)=>{
    console.log('team Complete emition')
    console.log(m)
    // let searching_index = fruits_array.findIndex(fruit => fruit === "mango");
    cList.push(m)
    
    setDoc(doc(db, "teams2", m.team_id), {
      ...m, status:'completed'
    });
    io.emit('clists',cList)
  })


});


// evaluator socket
io.of("/evaluator").on("connection",(socket)=>{
  console.log(socket.connected)
  console.log('Evaluators connected')
  io.of("/evaluator").emit('currTeam',queue.status.curr)
  
  socket.on('novelity',(val)=>{
    socket.broadcast.emit('novelity',val)
    console.log('novelity value emitted '+ val+` for team ${queue.status.curr[0].team_id}`)
    queue.status.curr[0].novelity=val;
    io.emit('queue',queue)
    io.of("/evaluator").emit('currTeam',queue.status.curr)
    setDoc(doc(db, "teams", queue.status.curr[0].team_id), {
      ...queue.status.curr[0],'novelity':val
    });
  })
  socket.on('Apporiateness',(val)=>{
    socket.broadcast.emit('Apporiateness',val)
    console.log('Apporiateness value emitted '+ val+` for team ${queue.status.curr[0].team_id}`)
    queue.status.curr[0].Apporiateness=val;
    io.emit('queue',queue)
    io.of("/evaluator").emit('currTeam',queue.status.curr)
    setDoc(doc(db, "teams", queue.status.curr[0].team_id), {
      ...queue.status.curr[0],'Apporiateness':val
    });
  })
  socket.on('Technical',(val)=>{
    socket.broadcast.emit('Technical',val)
    console.log('Technical value emitted '+ val+` for team ${queue.status.curr[0].team_id}`)
    queue.status.curr[0].Technical=val;
    io.emit('queue',queue)
    io.of("/evaluator").emit('currTeam',queue.status.curr)
    setDoc(doc(db, "teams", queue.status.curr[0].team_id), {
      ...queue.status.curr[0],'Technical':val
    });
  })
  socket.on('Impact',(val)=>{
    socket.broadcast.emit('Impact',val)
    console.log('Impact value emitted '+ val+` for team ${queue.status.curr[0].team_id}`)
    queue.status.curr[0].Impact=val;
    io.emit('queue',queue)
    io.of("/evaluator").emit('currTeam',queue.status.curr)
    setDoc(doc(db, "teams", queue.status.curr[0].team_id), {
      ...queue.status.curr[0],'Impact':val
    });
  })
  
})

server.listen(port, () => {
  console.log('server running at http://localhost:'+port);
});
