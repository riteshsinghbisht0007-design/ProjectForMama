const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // Create a dummy base64 string that isn't a valid image to see if we get the exact same error
  const fakeBase64 = Buffer.from("this is not an image".repeat(100)).toString('base64');
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: 'user',
          parts: [
            { text: "describe this" },
            {
              inlineData: {
                data: fakeBase64,
                mimeType: "image/jpeg",
              },
            },
          ],
        },
      ],
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.error("Error from GenAI SDK:", err.message);
  }
}
test();
