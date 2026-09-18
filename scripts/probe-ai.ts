import { completeChat, configuredProviders } from "../src/modules/ai/client.ts";

console.log("providers", configuredProviders().join(" -> "));
const r = await completeChat({
  system: "Responde en una sola palabra.",
  messages: [{ role: "user", content: "Di hola" }],
});
console.log(r ? `OK ${r.provider}/${r.model} ${r.text.slice(0, 120)}` : "FAIL");
if (!r) process.exit(1);
