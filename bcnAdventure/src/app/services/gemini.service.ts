import { Injectable } from '@angular/core';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private genAI: any;
  private model: any;

  // Placeholder para la API Key - En un proyecto real esto se manejaría de forma segura
  // El usuario debería añadir su propia clave en environment.ts como geminiApiKey: '...'
  private readonly apiKey = (environment as any).geminiApiKey || 'TU_GEMINI_API_KEY';

  constructor() {
    if (this.apiKey !== 'TU_GEMINI_API_KEY') {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        systemInstruction: "Eres un guía turístico virtual especializado en la historia de Barcelona. " +
                           "Debes responder siempre en el papel de un personaje histórico que encaje con la temática del mapa actual. " +
                           "Si el mapa es romano, eres Marcus, un centurión. Si es industrial, eres Eulàlia, una obrera textil del siglo XIX. " +
                           "Tus respuestas deben ser rigurosas pero amenas, cortas y enfocadas a lo que el usuario está viendo en su ruta actual.",
      });
    }
  }

  async getHistoricalResponse(question: string, context: { title: string, description: string }): Promise<string> {
    if (!this.model) {
      return "El guía histórico no está disponible en este momento. Por favor, asegúrate de configurar la clave de API de Gemini.";
    }

    try {
      const prompt = `Contexto del mapa: ${context.title}. ${context.description}\nPregunta del usuario: ${question}`;
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini error:', error);
      return "Lo siento, mi memoria histórica me está fallando. ¿Puedes preguntarme de nuevo?";
    }
  }
}
