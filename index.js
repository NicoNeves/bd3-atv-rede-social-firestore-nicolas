const express = require("express");
const ejs = require("ejs");
const http = require("http");
const path = require("path");
const socketIO = require("socket.io");

const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot  // ← Já está importado
} = require("firebase/firestore");

// CONFIG DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyB2KDYJI1uIhXey-bX_MKSaBewiIdHfmrk",
  authDomain: "nicolas-firebase.firebaseapp.com",
  projectId: "nicolas-firebase",
  storageBucket: "nicolas-firebase.firebasestorage.app",
  messagingSenderId: "219571296771",
  appId: "1:219571296771:web:e49f2209926a6a045a0c36",
  measurementId: "G-PD6FCDCZ3N"
};

const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "public"));
app.engine("html", ejs.renderFile);
app.set("view engine", "html");

app.get("/", (req, res) => {
  res.render("index.html");
});

let posts = [];

function atualizarPosts() {
  io.emit("previousMessage", posts);
}

const unsubscribe = onSnapshot(collection(db, "posts"), (snapshot) => {
  console.log("Atualização em tempo real do Firestore detectada!");
  
  posts = snapshot.docs.map((doc) => ({
    id: doc.id,
    titulo: doc.data().titulo,
    texto: doc.data().texto,
    dataHora: doc.data().dataHora,
  }));
  
  atualizarPosts();
}, (error) => {
  console.log("Erro no listener em tempo real:", error);
});

async function carregarPostsIniciais() {
  try {
    console.log("Carregando posts iniciais do Firestore...");
    const snapshot = await getDocs(collection(db, "posts"));
    
    posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      titulo: doc.data().titulo,
      texto: doc.data().texto,
      dataHora: doc.data().dataHora,
    }));

    console.log("Posts iniciais carregados:", posts.length);
  } catch (error) {
    console.log("Erro ao carregar posts iniciais:");
    console.log("Mensagem:", error.message);
  }
}

carregarPostsIniciais();

io.on("connection", (socket) => {
  console.log("Cliente conectado! ID:", socket.id);
  socket.emit("previousMessage", posts);

  socket.on("sendMessage", async (data) => {
    try {
      console.log("Tentando salvar no Firebase:", data);
      
      const docRef = await addDoc(collection(db, "posts"), {
        titulo: data.titulo,
        texto: data.texto,
        dataHora: new Date().toISOString(),
      });

      console.log("Post salvo com sucesso! ID:", docRef.id);      
    } catch (error) {
      console.error("Erro ao salvar no Firestore:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado! ID:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000 !");
});