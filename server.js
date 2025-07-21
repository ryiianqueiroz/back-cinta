const mqtt = require("mqtt");
const axios = require("axios");
require('dotenv').config();

const MQTT_USER = process.env.ADAFRUIT_USER;
const MQTT_KEY = process.env.ADAFRUIT_KEY;
const MQTT_TOPIC = `${MQTT_USER}/feeds/alerta`;

const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY;
const DEVICE_TOKEN = process.env.FCM_DEVICE_TOKEN; // <- pegue do .env

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

  try {
    await axios.post(
      "https://fcm.googleapis.com/fcm/send",
      {
        notification: {
          title: "Alerta da Cinta",
          body: texto,
        },
        to: DEVICE_TOKEN, // ou: to: "/topics/alertas"
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
