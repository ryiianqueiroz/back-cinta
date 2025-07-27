import mqtt from 'mqtt';
import bodyParser from 'body-parser';
import express from 'express';
import { config } from 'dotenv';
import fs from "fs"
import cors from "cors"
import { initializeFirebaseAdmin, admin } from "./firebase-init.js";

initializeFirebaseAdmin(); 


const db = admin.firestore();


config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

let DEVICE_TOKEN = null; // Defina no topo do seu server.js

app.post("/register-device-token", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token ausente no body." });
  }

  try {
    await db.collection("deviceTokens").doc("latest").set({ token });
    DEVICE_TOKEN = token;

    console.log("✅ Token salvo no Firestore!");
    res.status(200).json({ message: "Token salvo no Firestore!" });
  } catch (err) {
    console.error("❌ Erro ao salvar token:", err);
    res.status(500).json({ error: "Erro ao salvar token no Firestore" });
  }
});


// Rota GET para teste manual de notificação
app.get("/test-notification", async (req, res) => {
  try {
    const file = db.collection("deviceTokens").doc("latest").get()
    const token = JSON.parse(file).token;

    const payload = {
      token: token,
      notification: {
        title: "Teste manual",
        body: "Notificação disparada via navegador!",
      },
    };

    const response = await admin.messaging().send(payload);
    console.log("✅ Notificação teste enviada:", response);
    res.status(200).json({ message: "✅ Notificação enviada!" });
  } catch (err) {
    console.error("❌ Erro ao enviar notificação:", err);
    res.status(500).json({ error: "Erro ao enviar notificação" });
  }
});

// Nova rota GET /send-test para enviar notificação de teste
app.get("/send-test", async (req, res) => {
  try {
    const file = db.collection("deviceTokens").doc("latest").get()
    const token = JSON.parse(file).token;

    const payload = {
      token: token,
      notification: {
        title: "Teste via /send-test",
        body: "Esta notificação foi enviada pela rota /send-test!",
      },
    };

    const response = await admin.messaging().send(payload);
    console.log("✅ Notificação /send-test enviada:", response);
    res.status(200).json({ message: "✅ Notificação /send-test enviada!" });
  } catch (err) {
    console.error("❌ Erro ao enviar notificação /send-test:", err);
    res.status(500).json({ error: "Erro ao enviar notificação /send-test" });
  }
});

// Inicializa servidor web
app.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP iniciado na porta ${PORT}`);
  startMQTT(); // inicia o MQTT após o servidor estar pronto
});

// ===============================
// Função para iniciar o cliente MQTT
// ===============================
async function startMQTT() {
  const MQTT_USER = process.env.ADAFRUIT_USER;
  const MQTT_KEY = process.env.ADAFRUIT_KEY;
  const MQTT_TOPIC = `${MQTT_USER}/feeds/alerta`;

  // → Se existir token salvo no disco, carregue no início
  try {
    const doc = await db.collection("deviceTokens").doc("latest").get();
    if (doc.exists) {
      DEVICE_TOKEN = doc.data().token;
      console.log("✅ Token FCM carregado do Firestore.");
    } else {
      console.warn("⚠️ Nenhum token salvo no Firestore.");
    }
  } catch (err) {
    console.error("❌ Erro ao carregar token:", err);
  }


  const client = mqtt.connect("mqtts://io.adafruit.com", {
    username: MQTT_USER,
    password: MQTT_KEY,
  });

  client.on("connect", () => {
    client.subscribe(MQTT_TOPIC);
    console.log("✅ Subscrito ao tópico:", MQTT_TOPIC);
  });

  client.on("message", async (topic, message) => {
    const texto = message.toString();
    console.log("📩 Alerta recebido:", texto);

    if (!DEVICE_TOKEN) {
      console.error("❌ Token FCM não definido. Ignorando envio.");
      return;
    }

    try {
      const response = await admin.messaging().send({
        token: DEVICE_TOKEN,
        notification: {
          title: "Alerta da Cinta",
          body: texto,
        },
      });
      console.log("✅ Notificação enviada:", response);
    } catch (err) {
      console.error("❌ Erro ao enviar notificação:", err);
    }
  });
}

