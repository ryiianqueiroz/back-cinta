const mqtt = require("mqtt");
const axios = require("axios");

const MQTT_USER = "seu_usuario_adafruit";
const MQTT_KEY = "sua_chave_adafruit";
const MQTT_TOPIC = `${MQTT_USER}/feeds/esp32.alerta`;

const FCM_SERVER_KEY = "AAA..."; // Firebase Server Key

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

  // Enviar push via Firebase
  await axios.post(
    "https://fcm.googleapis.com/fcm/send",
    {
      notification: {
        title: "Alerta da Cinta",
        body: texto,
      },
      to: "TOKEN_DO_DISPOSITIVO", // Ou use topic: '/topics/alertas'
    },
    {
      headers: {
        Authorization: `key=${FCM_SERVER_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
});
