import type { StoreProduct, StorePaymentMethod } from "./types.js";

export const STORE_PRODUCTS: StoreProduct[] = [
  {
    id: "nitro",
    name: "Discord Nitro",
    category: "Discord",
    emoji: "<a:pepe_nitro:1546336734311354368>",
    shortDesc: "Suscripción oficial Nitro Boost al mejor precio",
    plans: [
      { id: "nitro_1m", name: "Nitro 1 mes", price: "8€" },
      { id: "nitro_1y", name: "Nitro 1 año", price: "55€" },
    ],
  },
  {
    id: "spotify",
    name: "Spotify Premium",
    category: "Música & Audio",
    emoji: "<a:spotify:1547019197882826862>",
    shortDesc: "Planes Individual, Duo y Familiar sin anuncios",
    plans: [
      { id: "spotify_ind_1m", name: "Individual 1 mes", price: "7€" },
      { id: "spotify_ind_3m", name: "Individual 3 meses", price: "15€" },
      { id: "spotify_ind_6m", name: "Individual 6 meses", price: "24€" },
      { id: "spotify_ind_12m", name: "Individual 12 meses", price: "40€" },
      { id: "spotify_duo_1m", name: "Duo 1 mes", price: "10€" },
      { id: "spotify_duo_3m", name: "Duo 3 meses", price: "18€" },
      { id: "spotify_duo_6m", name: "Duo 6 meses", price: "32€" },
      { id: "spotify_duo_12m", name: "Duo 12 meses", price: "60€" },
      { id: "spotify_fam_1m", name: "Familiar 1 mes", price: "13€" },
      { id: "spotify_fam_3m", name: "Familiar 3 meses", price: "30€" },
      { id: "spotify_fam_6m", name: "Familiar 6 meses", price: "55€" },
      { id: "spotify_fam_12m", name: "Familiar 12 meses", price: "80€" },
    ],
  },
  {
    id: "netflix",
    name: "Netflix",
    category: "Streaming",
    emoji: "<a:Netflix:1547021588057301022>",
    shortDesc: "Perfiles individuales o cuentas completas para 5 personas",
    plans: [
      { id: "netflix_1u", name: "1 usuario", price: "4€/mes" },
      { id: "netflix_full", name: "1 cuenta completa (5 personas)", price: "15€/mes" },
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    category: "Inteligencia Artificial",
    emoji: "<:Gemini:1547022741192835072>",
    shortDesc: "Acceso premium a Gemini Pro con larga duración",
    plans: [
      { id: "gemini_6m", name: "Gemini Pro 6 meses", price: "10€" },
      { id: "gemini_18m", name: "Gemini Pro 18 meses", price: "20€" },
    ],
  },
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    category: "Anime",
    emoji: "<:crunchyroll:1547033042894459041>",
    shortDesc: "Planes MegaFan sin publicidad y simulcasts",
    plans: [
      { id: "crunchy_1m", name: "Cuenta MegaFan 1 mes", price: "6€" },
      { id: "crunchy_12m", name: "Cuenta MegaFan 12 meses", price: "36€" },
    ],
  },
  {
    id: "protonvpn",
    name: "Proton VPN",
    category: "VPN & Seguridad",
    emoji: "🔐",
    shortDesc: "Navegación segura y privada de máxima velocidad",
    plans: [
      { id: "proton_share_1m", name: "Cuenta compartida 1 mes", price: "2.50€" },
      { id: "proton_full_1m", name: "Acceso completo 1 mes", price: "3€" },
      { id: "proton_share_12m", name: "Cuenta compartida 12 meses", price: "20€" },
      { id: "proton_full_12m", name: "Acceso completo 12 meses", price: "30€" },
    ],
  },
  {
    id: "expressvpn",
    name: "ExpressVPN",
    category: "VPN & Seguridad",
    emoji: "🛡️",
    shortDesc: "Acceso completo Advanced para protección premium",
    plans: [
      { id: "express_1m", name: "Acceso completo 1 mes Advanced", price: "5€" },
      { id: "express_3m", name: "Acceso completo 3 meses Advanced", price: "11€" },
      { id: "express_12m", name: "Acceso completo 12 meses Advanced", price: "35€" },
    ],
  },
  {
    id: "bitwarden",
    name: "Bitwarden",
    category: "Seguridad & Contraseñas",
    emoji: "<:bitwarden:1547050794082377839>",
    shortDesc: "Gestor de contraseñas con suscripción de por vida",
    plans: [
      { id: "bitwarden_life", name: "Bitwarden premium lifetime", price: "5€" },
    ],
  },
  {
    id: "custom",
    name: "Otro / Consulta Especial",
    category: "Personalizado",
    emoji: "📦",
    shortDesc: "Pedidos combinados, dudas o solicitudes especiales",
    plans: [
      { id: "custom_order", name: "Pedido personalizado o consulta", price: "A convenir" },
    ],
  },
];

export const STORE_PAYMENT_METHODS: StorePaymentMethod[] = [
  {
    id: "crypto",
    name: "Criptos",
    emoji: "<:crypto:1547047760484892773>",
    instructions: "Aceptamos USDT (TRC20/BEP20), BTC, LTC, SOL y más criptomonedas populares. Solicita la dirección de wallet en el ticket de tu pedido.",
  },
  {
    id: "revolut",
    name: "Revolut",
    emoji: "<:revolut:1546336620645580801>",
    instructions: "Pago instantáneo mediante Revtag o enlace de Revolut. Solicita el usuario o QR dentro de tu pedido.",
  },
  {
    id: "paypal",
    name: "Paypal (amigos y familiares)",
    emoji: "<:paypal:1546336762459328562>",
    instructions: "Envío exclusivo como **Amigos y Familiares** (sin comisión comercial). Solicita el correo en el ticket de tu pedido.",
  },
  {
    id: "wu",
    name: "Western Union",
    emoji: "<:wu:1547381385218629703>",
    instructions: "Transferencia internacional o depósito directo. Pide los datos de receptor al abrir tu pedido.",
  },
];

export function getProductById(id: string): StoreProduct | undefined {
  return STORE_PRODUCTS.find((p) => p.id === id);
}
