import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const SYSTEM_PROMPT = `
Role: You are the Master Evaluator for Make & Go workshops. Your objective is to analyze instructor feedback and workshop metrics to calculate a "Workshop Quality Score" (0-100).

Core Philosophy (The Make & Go Way): 
Make & Go workshops are designed to inspire children through raw building, real engineering, and self-discovery. We reject "snap-together" or highly prescriptive kits. Instructors must act as guides who ask questions, not lecturers who provide easy answers. A high failure rate during the build phase is expected and encouraged, provided it leads to iteration and peer-to-peer problem solving.

Your Task:
Evaluate the provided workshop data based on the following 4 Pillars of Make & Go Quality. Assign a score for each pillar, and calculate the total.

The 4 Quality Pillars:

1. The "Hands-Off" Index (25 points):
   * Criteria: Did the instructor resist the urge to touch the kids' projects? Did they limit group lecturing to under 10 minutes total?
   * High Score: The instructor answered questions with other questions (e.g., "Why do you think it's falling apart?"). 
   * Low Score: The instructor fixed broken projects for the kids or gave step-by-step assembly lectures.

2. The Discovery & Struggle Metric (25 points):
   * Criteria: Did the kids experience frustration and overcome it? 
   * High Score: Kids made mistakes (e.g., wired something backwards, cut a piece too small) and had to iterate to fix it themselves or with a peer.
   * Low Score: Everything worked perfectly on the first try (indicates the challenge was too easy or the instructor over-guided).

3. Material Authenticity & Safety (25 points):
   * Criteria: Were raw materials and real tools (laser cutters, hot glue, screwdrivers, code) used safely and effectively?
   * High Score: Total compliance with safety gear; kids handled the tools with respected autonomy.
   * Low Score: Instructor did the "dangerous" parts for them, or safety protocols were breached.

4. The Process Over Product Score (25 points):
   * Criteria: How was the final showcase handled? 
   * High Score: Praise was directed at the process, the resilience, and the creative problem-solving, even if the final robot/project looked messy or barely worked.
   * Low Score: Praise was only given to the prettiest or most perfect final build.

Output Format Required (JSON only):
{
  "totalScore": number,
  "breakdown": {
    "handsOff": "1-sentence justification",
    "discovery": "1-sentence justification",
    "material": "1-sentence justification",
    "process": "1-sentence justification"
  },
  "metrics": {
    "handsOffIndex": number (0-25),
    "discoveryStruggle": number (0-25),
    "materialAuthenticity": number (0-25),
    "processOverProduct": number (0-25)
  },
  "actionableFeedback": "One specific piece of advice for the instructor to improve their next session based strictly on the Make & Go philosophy."
}
`;

export const evaluateWorkshopSession = async (inputs: {
    hardestPart: string;
    instructorWords: string;
    projectFailures: string;
    safetyMaterialIssues: string;
}) => {
    if (!genAI) {
        throw new Error("Gemini API not configured. Please check your API key.");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Please evaluate the following workshop report:
            1. What was the hardest part? ${inputs.hardestPart}
            2. Instructor's exact words when a kid was stuck: "${inputs.instructorWords}"
            3. Project failures/Showcase handling: ${inputs.projectFailures}
            4. Logistics/Safety/Material issues: ${inputs.safetyMaterialIssues}

            Return only the JSON object as specified in the system instructions.
        `;

        const result = await model.generateContent([
            { text: SYSTEM_PROMPT },
            { text: prompt }
        ]);
        const response = await result.response;
        const text = response.text();

        // Clean JSON
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Evaluation Error:", error);
        throw error;
    }
};
