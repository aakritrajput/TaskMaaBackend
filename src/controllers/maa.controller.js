import { InferenceClient } from "@huggingface/inference";
import { ApiResponse } from "../utils/ApiResponse.js";

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
let client = null;

if (HF_TOKEN) {
  client = new InferenceClient(HF_TOKEN);
}

const maaResponses = {
  streak: [
    "Very good beta! Maa is proud of your consistency 🩷",
    "Keep going, beta! Maa’s heart is full of pride 💪",
    "You’re making Maa smile today 😌",
  ],
  task_completed: [
    "That’s how you do it — simple and focused ❤️",
    "Nice beta! Maa loves seeing your dedication 🌸",
  ],
  missed_tasks: [
    "Still some tasks left? Maa is waiting 👀",
    "Don’t stop here, beta. Maa believes in you 💫",
  ],
  group_task: [
    "That’s teamwork! Maa is proud of your spirit 💥",
    "You shined bright in your group, beta 🌟",
  ],
};

export const getMaaResponse = async (req, res) => {
  const { type } = req.params;

  // It defines which message types use Hugging Face
  const aiTypes = ["low_motivation", "daily_start", "performance_feedback"];

  // will try Hugging Face if available and relevant
  if (HF_TOKEN && aiTypes.includes(type)) {
    try {
      const promptMap = {
        low_motivation: "Your child is losing motivation. As a loving Indian mother, encourage them warmly.",
        daily_start: "It's morning. As an Indian mother, give a short motivational message to your child for the day.",
//        performance_feedback: "Give gentle feedback to your child about their overall productivity today.", // --- right now we are not including this but in future we will...
      };

      const prompt = promptMap[type] || "Say something nice and short.";

      const out = await client.chatCompletion({
        model: "meta-llama/Llama-3.1-8B-Instruct",
        messages: [
          { role: "system", content: "You are TaskMaa — a loving Indian mother who gives emotional, motivational, or slightly scolding advice in one or two lines." },
          { role: "user", content: prompt },
        ],
        max_tokens: 150, // safe limit
      });

      const msg = out?.choices?.[0]?.message?.content;

      if (msg && msg.length > 0) {
        return res.status(200).json(new ApiResponse(200, msg, "Maa's message !!" ));
      }
    } catch (error) {
      console.log("Hugging Face error:", error.message);
      // continue to manual fallback
    }
  }

  // Manual fallback
  const responses = maaResponses[type] || [
    "Maa is watching, beta. Keep going 🩷",
  ];
  const message = responses[Math.floor(Math.random() * responses.length)];

  return res.status(200).json(new ApiResponse(200, message, "Maa's message !!" ));
};