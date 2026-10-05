import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize GoogleGenAI SDK with required telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const SYSTEM_INSTRUCTION = `
You are "Hashtag Pizza AI Bot", the official AI assistant of Hashtag Pizza Birgunj, Nepal.
Slogan: "Think Food, Think Hashtag Pizza".

ABOUT HASHTAG PIZZA BIRGUNJ:
- Location: Shop No. 01, Ground Floor, RB Complex, Loharpatti, Adarshnagar, Birgunj, Nepal.
- Phone / WhatsApp: 9861370721 / Landline: 051-591718.
- Opening Hours: 12:00 PM – 09:30 PM Daily.
- Speciality: Hand-stretched artisan dough pizzas baked in a commercial 24-inch conveyor oven, Kurkure Momos, Crispy Fried Chicken (CFC), Gourmet Burgers, Milkshakes, Lava Cakes.

OFFICIAL BIRGUNJ DELIVERY RATES:
- Up to 1.0 km: Rs. 40 (e.g. Adarshnagar, Ghantaghar, Maisthan)
- 1.0 km to 2.0 km: Rs. 50 (e.g. Ranighat, Panitanki, Murli)
- 2.0 km to 3.0 km: Rs. 60 (e.g. Shreepur, Vishwa)
- 3.0 km to 4.0 km: Rs. 70 (e.g. Pipra, Powerhouse / Bypass)
- 4.0 km to 5.0 km: Rs. 80 (e.g. Birgunj Customs / Inarwa, Gandak / National Medical College)
- Beyond 5.0 km: Rs. 80 base + Rs. 15 per extra km.
- Important: Deliveries strictly obey Birgunj One-Way traffic rules (e.g. Ghantaghar clockwise loop) to ensure realistic ETA and hot doorstep delivery. Customers can pin their location and save up to 5 addresses. Phone numbers must be 10 digits.

TOP MENU PICKS:
- Pizzas: Margherita (from Rs. 180), Paneer Overloaded, Hashtag Special Chicken Pizza, Peppy Paneer, Deluxe Veggie, Chicken BBQ. Available in Personal (7"), Medium (9"), and Large (12").
- Kurkure Momos: Veg, Paneer, Chicken Kurkure Momos (crispy coated, served with spicy timur chutney).
- CFC (Crispy Fried Chicken): Crunchy chicken drumsticks, wings, boneless tenders with special dip.
- Burgers: Crispy Chicken Burger, Veg Supreme Burger, Paneer Tikka Burger.
- Loyalty Perks: 100 free welcome points on sign-up. 1 point earned per Rs. 10 spent. Free drinks, momos, pizzas, or cash discounts.

GOOGLE MAPS GROUNDING:
When answering queries regarding location, distance, nearby landmarks, or geography in Birgunj, use the Google Maps tool to retrieve accurate, grounded place details.
`;

// Server-side Multi-turn Chat endpoint with Gemini & Maps Grounding
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, history = [], complexity = 'general', location } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required.' });
  }

  // Model Selection according to guidelines:
  // - gemini-3.1-pro-preview for particularly complex tasks
  // - gemini-3.5-flash for general tasks (with googleMaps tool for maps grounding)
  // - gemini-3.1-flash-lite for tasks that should happen fast
  let selectedModel = 'gemini-3.5-flash';
  let enableMapsTool = true;

  if (complexity === 'complex') {
    selectedModel = 'gemini-3.1-pro-preview';
    enableMapsTool = false; // pro model for complex reasoning
  } else if (complexity === 'fast') {
    selectedModel = 'gemini-3.1-flash-lite';
    enableMapsTool = false; // flash-lite for fastest speed
  }

  // Build multi-turn contents array preserving full conversation history
  const contents: any[] = [];
  if (Array.isArray(history)) {
    for (const turn of history) {
      if (turn.role && turn.text) {
        contents.push({
          role: turn.role === 'user' ? 'user' : 'model',
          parts: [{ text: turn.text }],
        });
      }
    }
  }
  // Append current user message
  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  // Coordinates for Birgunj (or customer pinned location)
  const userLat = location?.lat || 27.0135;
  const userLng = location?.lng || 84.8770;

  try {
    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTION,
    };

    if (enableMapsTool) {
      config.tools = [{ googleMaps: {} }];
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: userLat,
            longitude: userLng,
          },
        },
      };
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config,
    });

    const replyText = response.text || '';

    // Extract Google Maps grounding chunks if present
    const mapLinks: { title: string; uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && Array.isArray(chunks)) {
      for (const chunk of chunks) {
        if ((chunk as any).maps?.uri) {
          mapLinks.push({
            title: (chunk as any).maps.title || 'View Location on Google Maps',
            uri: (chunk as any).maps.uri,
          });
        }
      }
    }

    return res.json({
      text: replyText,
      modelUsed: selectedModel,
      mapLinks,
    });
  } catch (err: any) {
    console.error('Server Gemini API Error:', err);

    // Fallback response with local knowledge if API key is unconfigured or rate limited
    const lower = message.toLowerCase();
    let fallbackText = `Namaste! I am Hashtag Pizza AI Bot. We serve fresh artisan pizzas, crispy Kurkure Momos, and CFC fried chicken at RB Complex, Adarshnagar, Birgunj.`;

    if (lower.includes('rate') || lower.includes('delivery') || lower.includes('cost') || lower.includes('charge')) {
      fallbackText = `🛵 **Hashtag Pizza Birgunj Official Delivery Rates:**\n\n- **Up to 1.0 km:** Rs. 40 (Adarshnagar, Ghantaghar, Maisthan)\n- **1.0 km – 2.0 km:** Rs. 50 (Ranighat, Panitanki, Murli)\n- **2.0 km – 3.0 km:** Rs. 60 (Shreepur, Vishwa)\n- **3.0 km – 4.0 km:** Rs. 70 (Pipra, Powerhouse / Bypass)\n- **4.0 km – 5.0 km:** Rs. 80 (Birgunj Customs / Inarwa, Gandak / NMC)\n- **Beyond 5.0 km:** Rs. 80 + Rs. 15 per extra km.\n\n🚦 Our routes follow Birgunj One-Way traffic rules (Ghantaghar loop) to ensure hot delivery! You can save up to 5 delivery locations in checkout.`;
    } else if (lower.includes('pizza') || lower.includes('recommend') || lower.includes('menu')) {
      fallbackText = `🍕 **Top Recommendations at Hashtag Pizza:**\n\n1. **Hashtag Special Chicken Pizza** (succulent chicken, bell peppers, mozzarella)\n2. **Paneer Overloaded Pizza** (fresh paneer cubes, capsicum, rich cheese)\n3. **Classic Margherita** (San Marzano tomato base, pure mozzarella)\n\nAvailable in Personal 7", Medium 9", and Large 12"!`;
    } else if (lower.includes('where') || lower.includes('location') || lower.includes('address') || lower.includes('phone')) {
      fallbackText = `📍 **Hashtag Pizza Birgunj:**\n- **Address:** Shop No. 01, Ground Floor, RB Complex, Loharpatti, Adarshnagar, Birgunj\n- **Hours:** 12:00 PM – 09:30 PM Daily\n- **Phone / WhatsApp:** 9861370721 / 051-591718`;
    }

    return res.json({
      text: fallbackText,
      modelUsed: 'local-fallback',
      mapLinks: [
        {
          title: 'Hashtag Pizza (RB Complex, Adarshnagar) on Google Maps',
          uri: 'https://maps.google.com/?q=27.0135,84.8770',
        },
      ],
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer();
