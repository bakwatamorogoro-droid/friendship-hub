import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export async function askLovableAi(
  apiKey: string,
  instructions: string,
  messages: ModelMessage[],
) {
  const lovable = createOpenAI({
    baseURL: GATEWAY_BASE_URL,
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });

  const result = streamText({
    model: lovable.responses(MODEL),
    instructions,
    messages,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });

  const text = (await result.text).trim();
  if (!text) {
    throw new Error("MUMSO AI haikutoa jibu. Tafadhali jaribu tena.");
  }
  return text;
}