const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const mqtt = require("mqtt");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

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
  const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;

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

    try {
      await axios.post(
        "https://fcm.googleapis.com/fcm/send",
        {
          notification: {
            title: "Alerta da Cinta",
            body: texto,
          },
          to: DEVICE_TOKEN,
        },
        {
          headers: {
            Authorization: `key=${FCM_SERVER_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("✅ Notificação enviada com sucesso!");
    } catch (err) {
      console.error("❌ Erro ao enviar notificação:", err.response?.data || err.message);
    }
  });
}

async function sendTestNotification() {
  const token = JSON.parse(fs.readFileSync("device_token.json", "utf8")).token;
  const serverKey = process.env.FCM_SERVER_KEY;

  const result = await axios.post(
    "https://fcm.googleapis.com/fcm/send",
    {
      notification: {
        title: "Teste direto",
        body: "Essa notificação foi enviada sem MQTT!",
      },
      to: token,
    },
    {
      headers: {
        Authorization: `key=${serverKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log("✅ Resultado:", result.data);
}

sendTestNotification();
