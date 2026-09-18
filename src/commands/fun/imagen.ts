import {
  AttachmentBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { COLORS } from "../../constants.js";
import type { Command } from "../../types/index.js";

const STYLES: Record<string, { label: string; suffix: string }> = {
  general: {
    label: "General / Sin filtro",
    suffix: "",
  },
  anime: {
    label: "Anime / Manga",
    suffix: ", high quality anime style, makoto shinkai aesthetic, vibrant colors, detailed illustration",
  },
  realista: {
    label: "Fotorrealismo 8K",
    suffix: ", photorealistic, ultra detailed 8k photography, cinematic lighting, shot on 35mm lens, sharp focus",
  },
  fantasia: {
    label: "Fantasía Épica",
    suffix: ", epic fantasy digital painting, magical atmosphere, intricate concept art, trending on artstation",
  },
  cyberpunk: {
    label: "Cyberpunk Futurista",
    suffix: ", cyberpunk aesthetic, neon glow, futuristic night cityscape, high tech, blade runner style",
  },
  render3d: {
    label: "Render 3D Pixar",
    suffix: ", cute 3d octane render, pixar animation studio style, volumetric soft lighting, highly detailed",
  },
  pixelart: {
    label: "Pixel Art Retro",
    suffix: ", 16-bit retro pixel art, crisp arcade video game aesthetic, master pixel graphics",
  },
};

const FORMATS: Record<string, { label: string; width: number; height: number }> = {
  cuadrado: { label: "1:1 (1024x1024)", width: 1024, height: 1024 },
  horizontal: { label: "16:9 (1024x576)", width: 1024, height: 576 },
  vertical: { label: "9:16 (576x1024)", width: 576, height: 1024 },
};

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("imagen")
    .setDescription("Genera una imagen con Inteligencia Artificial gratuita (FLUX / Turbo)")
    .addStringOption((o) =>
      o
        .setName("prompt")
        .setDescription("Descripción de lo que quieres que aparezca en la imagen")
        .setRequired(true)
        .setMaxLength(500),
    )
    .addStringOption((o) =>
      o
        .setName("estilo")
        .setDescription("Estilo visual artístico de la generación")
        .addChoices(
          { name: "🎨 General (Sin filtro)", value: "general" },
          { name: "🌸 Anime / Manga", value: "anime" },
          { name: "📸 Fotorrealista 8K", value: "realista" },
          { name: "✨ Fantasía Épica", value: "fantasia" },
          { name: "🏙️ Cyberpunk", value: "cyberpunk" },
          { name: "🧸 Render 3D Pixar", value: "render3d" },
          { name: "👾 Pixel Art Retro", value: "pixelart" },
        ),
    )
    .addStringOption((o) =>
      o
        .setName("formato")
        .setDescription("Proporción y dimensiones de la imagen")
        .addChoices(
          { name: "🟧 Cuadrado (1:1 · 1024x1024)", value: "cuadrado" },
          { name: "🖥️ Horizontal (16:9 · 1024x576)", value: "horizontal" },
          { name: "📱 Vertical (9:16 · 576x1024)", value: "vertical" },
        ),
    )
    .addStringOption((o) =>
      o
        .setName("modelo")
        .setDescription("Motor de generación de imagen")
        .addChoices(
          { name: "⚡ Flux.1 Schnell (Recomendado · Alta fidelidad)", value: "flux" },
          { name: "🚀 Turbo (Generación ultrarrápida)", value: "turbo" },
        ),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const rawPrompt = interaction.options.getString("prompt", true).trim();
    const styleKey = interaction.options.getString("estilo") ?? "general";
    const formatKey = interaction.options.getString("formato") ?? "cuadrado";
    const model = interaction.options.getString("modelo") ?? "flux";

    const styleInfo = STYLES[styleKey] ?? STYLES.general!;
    const formatInfo = FORMATS[formatKey] ?? FORMATS.cuadrado!;

    const fullPrompt = `${rawPrompt}${styleInfo.suffix}`;
    const seed = Math.floor(Math.random() * 1_000_000_000);

    await interaction.deferReply();

    try {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${formatInfo.width}&height=${formatInfo.height}&model=${model}&nologo=true&seed=${seed}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45_000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Servidor de IA devolvió código ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.byteLength < 1000) {
        throw new Error("La imagen devuelta no es válida o está corrupta.");
      }

      const attachment = new AttachmentBuilder(buffer, { name: "nexo-ai.jpg" });

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle("🎨 Generación de Imagen IA")
        .setDescription(`> **Prompt:** *${rawPrompt}*`)
        .addFields(
          { name: "🎭 Estilo", value: `\`${styleInfo.label}\``, inline: true },
          { name: "📐 Formato", value: `\`${formatInfo.label}\``, inline: true },
          { name: "⚡ Motor", value: `\`${model.toUpperCase()}\``, inline: true },
        )
        .setImage("attachment://nexo-ai.jpg")
        .setFooter({
          text: `Solicitado por ${interaction.user.username} · Motor IA Gratuito`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      const errorMsg = isTimeout
        ? "El motor de IA tardó demasiado en responder (>45s). Por favor prueba de nuevo en unos momentos o usa el motor Turbo."
        : `No se pudo generar la imagen: ${err?.message ?? "Error desconocido"}. Inténtalo de nuevo más tarde.`;

      const errEmbed = new EmbedBuilder()
        .setColor(COLORS.danger)
        .setTitle("❌ Error al generar imagen")
        .setDescription(errorMsg);

      await interaction.editReply({ embeds: [errEmbed] });
    }
  },
};

export default command;
