import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

interface Question {
    q: string;
    options: string[];
    correct: number;
}

export const generateQuizFromVideo = async (title: string, description: string): Promise<Question[]> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
        Create a multiple-choice quiz with 3 questions based on this video information.
        
        Video Title: ${title}
        Video Description: ${description}

        Format the output STRICTLY as a JSON array of objects. 
        Each object must have:
        - "q": string (The question)
        - "options": array of 4 strings (Possible answers)
        - "correct": number (Index of the correct answer, 0-3)

        Do not include markdown formatting like \`\`\`json. Just the raw JSON.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown if present despite instructions
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const quiz: Question[] = JSON.parse(cleanText);
        return quiz;

    } catch (error) {
        console.error("Error generating quiz:", error);
        // Fallback or empty array
        return [];
    }
};
