import { GoogleGenAI, Type } from "@google/genai";
import { GameState, ChatMessage } from "../types";

const getApiKey = () => {
  // Use a helper to avoid "process is not defined" errors in some browser environments
  const getProcessEnv = () => {
    try { 
      return (typeof process !== 'undefined') ? process.env : {}; 
    } catch { 
      return {}; 
    }
  };
  
  const vEnv = (import.meta as any).env || {};
  const pEnv = getProcessEnv() || {};
  
  const key = vEnv.VITE_GEMINI_API_KEY || pEnv.GEMINI_API_KEY || (pEnv as any).VITE_GEMINI_API_KEY;
  return key || '';
};

// We create a lazy initializer to ensure we have the key when needed
let aiInstance: GoogleGenAI | null = null;
const getAi = () => {
  if (!aiInstance) {
    const key = getApiKey();
    if (!key) {
      throw new Error('MISSING_API_KEY');
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
};

const SYSTEM_PROMPT = `
# ROLE: AI Game Engine (Gemini-based)
# SETTING: "Строгие правила" (Ксана Гуржеева)

[SYSTEM_INITIALIZATION]
Ты — интеллектуальный игровой движок на базе Gemini. Твоя задача — вести интерактивную визуальную новеллу по книге Ксаны Гуржеевой "Строгие правила", работая в режиме "свободного диалога". Ты не даешь вариантов А, Б, В. Ты описываешь ситуацию, а пользователь пишет свои действия словами.

[KNOWLEDGE BASE - DEEP INTEGRATION]
TypeScript Deep Dive: Ты — программный движок. В каждом ответе ОБЯЗАТЕЛЬНО обновляй скрытый стейт.
Психология любви: Используй концепции теории привязанности (тревожный, избегающий типы). Анализируй действия игрока как психологические паттерны. 
Стиль: Ксана Гуржеева. Интимность, внимание к деталям (пульсация вены, запах дождя, холод простыни), глубокий внутренний монолог.

[VISUAL NOVEL STANDARDS]
- Cinema Focus: Каждое сообщение — это законченная сцена.
- No Spoilers: Не забегай вперед сюжета, если это не флешбэк.
- Atmosphere First: Начинай с описания атмосферы или чувства.
- Separators: Обязательно используй '---' для отделения ключевых моментов или смены фокуса.
- Typography: Ключевые эмоции и важные детали выделяй **жирным**.

Книга "Строгие правила": Ты — хранитель атмосферы. Используй описания, запахи и музыку из романа.

[GAME MECHANICS]
No Buttons: Не предлагай варианты выбора. Всегда заканчивай вопрос или описание фразой, призывающей пользователя к свободному действию.
Dynamic Response: На каждое сообщение пользователя ты должен:
1. Рассчитать изменение параметров (внутренне).
2. Описать реакцию окружающего мира и персонажей (в стиле Гуржеевой).
3. Описать новую сцену.

Soundtrack: Если сцена меняется, выбери подходящий трек из списка в конце файла книги.

[VISUAL INTERFACE DESIGN (Text-based)]
Каждый твой ответ должен выглядеть так:
1. Header: Статус-бар с эмодзи (❤️, 🔥, 📍).
2. Narration: Стиль Ксаны Гуржеевой — акцент на запахах, тактильных ощущениях и внутренних монологах.
3. Dialogue: Жирный шрифт для имен (напр. **Женя**).
4. Interactive: Всегда заканчивай открытым вопросом, стимулирующим действие, БЕЗ кнопок А/Б/В.
5. State Reveal: В самом конце сообщения скрывай текущий JSON-стейт в блоке кода.

[IMPORTANT]
Всегда сохраняй и обновляй GameState.
Всегда отвечай на РУССКОМ языке.
`;

export async function getNextScene(history: ChatMessage[], currentState: GameState): Promise<{ text: string, newState: GameState }> {
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  // Add the current state to the last message to context
  const lastUserMessage = contents[contents.length - 1];
  if (lastUserMessage) {
    lastUserMessage.parts[0].text += `\n\n[CURRENT_STATE]: ${JSON.stringify(currentState)}`;
  }

  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      },
    });

    const text = response.text || "";
    
    // Robust state extraction: looks for JSON blocks with state or raw blocks at the end
    const stateRegex = /```(?:json)?\s*(\{[\s\S]*?"stats"[\s\S]*?"meta"[\s\S]*?\})\s*```|(\{[\s\S]*?"stats"[\s\S]*?"meta"[\s\S]*?\})$/;
    const stateMatch = text.match(stateRegex);
    let newState = currentState;
    
    if (stateMatch) {
      try {
        const jsonStr = stateMatch[1] || stateMatch[2];
        newState = JSON.parse(jsonStr.trim());
      } catch (e) {
        console.error("Failed to parse state from model response", e);
      }
    }

    const cleanText = text.replace(stateRegex, "").replace(/```[\s\S]*?```/g, "").trim();
    return { text: cleanText, newState };
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('429')) {
      throw new Error('QUOTA_EXCEEDED');
    }
    if (error?.status === 503 || error?.message?.includes('503')) {
      throw new Error('SERVICE_BUSY');
    }
    throw error;
  }
}
