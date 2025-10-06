import { InferenceClient } from "@huggingface/inference";

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY ;

const client = new InferenceClient(HF_TOKEN);

const out = await client.chatCompletion({
    model: "meta-llama/Llama-3.1-8B-Instruct",
    messages: [{ role: "user", content: "Hello, nice to meet you!" }],
    max_tokens: 512
});

console.log("This is the response: ", out.choices[0]);

// for await (const chunk of client.chatCompletionStream({
//   model: "meta-llama/Llama-3.1-8B-Instruct",
//   messages: [{ role: "user", content: "Hello, nice to meet you!" }],
//   max_tokens: 512
// })) {
//   console.log(chunk.choices[0].delta.content);
// }