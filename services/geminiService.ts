import { GoogleGenAI, Type } from "@google/genai";
import { CodeFile, AnalysisReport } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "Короткий загальний підсумок якості коду, що визначає найкритичніші проблеми, знайдені у всіх файлах."
    },
    files: {
      type: Type.ARRAY,
      description: "Масив об'єктів, де кожен об'єкт представляє аналіз одного файлу.",
      items: {
        type: Type.OBJECT,
        properties: {
          fileName: {
            type: Type.STRING,
            description: "Назва аналізованого файлу."
          },
          errors: {
            type: Type.ARRAY,
            description: "Список помилок або потенційних проблем, знайдених у цьому файлі.",
            items: {
              type: Type.OBJECT,
              properties: {
                line: {
                  type: Type.INTEGER,
                  description: "Номер рядка, де виникає проблема."
                },
                errorType: {
                  type: Type.STRING,
                  description: "Тип помилки (наприклад, 'SyntaxError', 'LogicError', 'StyleViolation', 'ImportError')."
                },
                message: {
                  type: Type.STRING,
                  description: "Чіткий і стислий опис помилки."
                },
                suggestion: {
                  type: Type.STRING,
                  description: "Конкретна пропозиція або фрагмент коду для виправлення проблеми."
                },
              },
              required: ['line', 'errorType', 'message', 'suggestion']
            }
          },
          correctedCode: {
              type: Type.STRING,
              description: "Повний вміст файлу з усіма виправленими помилками. Якщо помилок не знайдено, це має бути оригінальний код."
          }
        },
        required: ['fileName', 'errors', 'correctedCode']
      }
    }
  },
  required: ['summary', 'files']
};

export const analyzeCode = async (files: CodeFile[]): Promise<AnalysisReport> => {
  if (files.length === 0 || files.every(f => f.content.trim() === '')) {
    throw new Error("Немає коду для аналізу.");
  }
  
  const formattedFiles = files.map(file => `
// FILE: ${file.name}
// --- START OF CODE ---
${file.content}
// --- END OF CODE ---
`).join('\n\n');

  const prompt = `
    Ти експерт з рецензування коду JavaScript. Проаналізуй наступні файли JavaScript, розглядаючи їх як єдиний проєкт.

    Твоє завдання — виявити:
    1.  Синтаксичні помилки, потенційні помилки під час виконання, логічні помилки, проблеми з продуктивністю та відхилення від найкращих практик у кожному файлі.
    2.  Проблеми з модулями та імпортами між файлами. Зверни особливу увагу на:
        - Імпорт з файлу, якого немає серед наданих.
        - Імпорт іменованої сутності (змінної, функції, класу), яка не експортується з цільового файлу.
        - Невідповідність між іменованими та дефолтними імпортами/експортами.

    Надай детальний звіт у форматі JSON. Звіт повинен містити:
    - Загальний підсумок якості коду.
    - Розбивку проблем по кожному файлу.
    - Для кожної проблеми: назву файлу, номер рядка, тип помилки (наприклад, 'ImportError' для проблем з імпортами), чітке повідомлення та конкретну пропозицію щодо виправлення.
    - Для кожного файлу: повний, виправлений код у полі 'correctedCode'. Якщо у файлі немає помилок, поверни оригінальний код.
    - Якщо у файлі немає помилок, поверни порожній масив для його властивості 'errors'.
    
    ВАЖЛИВО: Вся відповідь у форматі JSON, включаючи всі описи, повідомлення та пропозиції, має бути українською мовою.

    Ось файли для аналізу:
    ${formattedFiles}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const jsonText = response.text.trim();
    const result: AnalysisReport = JSON.parse(jsonText);
    return result;

  } catch (error) {
    console.error("Error analyzing code with Gemini API:", error);
    throw new Error("Не вдалося отримати аналіз від сервера. Перевірте ваш API ключ та з'єднання з мережею.");
  }
};