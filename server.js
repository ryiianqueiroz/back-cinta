const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const mqtt = require("mqtt");
const admin = require("firebase-admin");
require("dotenv").config();
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(serviceAccount)
  ),
});


// Rota POST para registrar token do dispositivo
app.post("/register-device-token", (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token ausente no body." });
  }

  fs.writeFile("device_token.json", JSON.stringify({ token }, null, 2), (err) => {
    if (err) {
      console.error("Erro ao salvar token:", err);
      return res.status(500).json({ error: "Erro ao salvar token" });
    }

    console.log("✅ Token salvo com sucesso!");
    res.status(200).json({ message: "Token salvo com sucesso!" });
  });
});

// Rota GET para teste manual de notificação
app.get("/test-notification", async (req, res) => {
  try {
    const file = fs.readFileSync("device_token.json", "utf8");
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
    const file = fs.readFileSync("device_token.json", "utf8");
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
function startMQTT() {
  const MQTT_USER = process.env.ADAFRUIT_USER;
  const MQTT_KEY = process.env.ADAFRUIT_KEY;
  const MQTT_TOPIC = `${MQTT_USER}/feeds/alerta`;

  let DEVICE_TOKEN = null;
  try {
    const tokenData = fs.readFileSync("device_token.json", "utf-8");
    DEVICE_TOKEN = JSON.parse(tokenData).token;
    console.log("✅ Token FCM carregado do arquivo.");
  } catch (err) {
    console.warn("⚠️ Token FCM não encontrado. Registre com POST /register-device-token");
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

    // Envia a notificação usando Firebase Admin SDK
    const payload = {
      token: DEVICE_TOKEN,
      notification: {
        title: "Alerta da Cinta",
        body: texto,
      },
    };

    try {
      const response = await admin.messaging().send(payload);
      console.log("✅ Notificação enviada com sucesso! Response:", response);
    } catch (err) {
      console.error("❌ Erro ao enviar notificação:", err);
    }
  });
}
