import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const SYSTEM_PROMPT = `
Role: You are the Master Lifecycle Auditor for the Edufy ERP system. 
Task: Analyze the multi-phase audit data of a Make & Go workshop to calculate a final "Operational Health Score" (0-100). The core philosophy is "Zero Lego": high student autonomy, real engineering, raw materials, and process over product.

Input Variables you will receive:
* Predictive_Flags: Did the system warn them about low stock earlier this week?
* Pre_Flight_Data: Tech, materials, and safety setup.
* Execution_Data: Instruction time, autonomy level, struggle metric, wrap-up.
* Voice_Transcript: Qualitative context from the auditor.

Scoring Weights & Penalties:
* Pedagogy (Base 100): Reward <10 min lectures, asking questions instead of fixing, healthy struggle, and praising effort. 
* Logistics Penalty: Deduct 15 points if Pre-Flight shows missing materials, especially if Predictive Flags warned them days ago. 
* Safety Override: If safety gear/zones were bypassed, the maximum final score is 40/100.

Output Requirements (JSON Format Only! Do not include markdown \`\`\` around it):
{
  "Health_Score": 85,
  "Phase_Breakdown": {
    "setup": "1-sentence summary",
    "instruction": "1-sentence summary",
    "execution": "1-sentence summary"
  },
  "Root_Cause": "1-2 sentences explaining exactly what elevated or dragged down the score.",
  "Actionable_Mandate": "A single, specific bullet point directing the instructor or admin on what to fix for tomorrow."
}
`;

export const evaluateWorkshopSession = async (inputs: {
    predictiveFlags: { inventoryWarned: boolean };
    preFlight: { techReady: boolean; materialStock: number; safetyZoned: boolean };
    execution: { instructionTime: string; autonomyLevel: string; struggleMetric: number; deliveryFocus: string; labRespect: boolean };
    voiceTranscript: string;
}) => {
    if (!genAI) {
        throw new Error("Gemini API not configured. Please check your API key.");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Please evaluate the following workshop report:
            
            Predictive_Flags:
            - Warned about inventory earlier in week: ${inputs.predictiveFlags.inventoryWarned}
            
            Pre_Flight_Data:
            - Tech Equipment Ready: ${inputs.preFlight.techReady}
            - Material Stock (1-5, where 1 is missing, 5 is fully stocked): ${inputs.preFlight.materialStock}
            - Safety Equipment and Zones setup: ${inputs.preFlight.safetyZoned}
            
            Execution_Data:
            - Instruction Time: ${inputs.execution.instructionTime}
            - Autonomy Level (when stuck, instructor...): ${inputs.execution.autonomyLevel}
            - Struggle Metric (1-5, 1=too easy, 3=healthy, 5=breakdown): ${inputs.execution.struggleMetric}
            - Praise/Delivery focus on: ${inputs.execution.deliveryFocus}
            - Lab Respect (clean up after): ${inputs.execution.labRespect}
            
            Voice_Transcript:
            "${inputs.voiceTranscript}"
        `;

        const result = await model.generateContent([
            { text: SYSTEM_PROMPT },
            { text: prompt }
        ]);
        const response = await result.response;
        const text = response.text();

        // Clean JSON
        const jsonString = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Evaluation Error:", error);
        throw error;
    }
};
