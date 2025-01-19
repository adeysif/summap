document.getElementById('extractButton').addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  });

  chrome.tabs.sendMessage(tab.id, { action: "extractContent" }, async (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    const extractedContent = response.content;
    document.getElementById('content').innerText = "Extracted Content:\n" + extractedContent;

    const summary = await summarizeText(extractedContent);

    document.getElementById('summary').innerText = "Summary:\n" + summary;
  });
});

async function summarizeText(text) {
  const API_KEY = "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";
  const MODEL = "facebook/bart-large-cnn";

  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        body: JSON.stringify({ inputs: text }),
      }
    );

    // Check for HTTP errors (e.g., 404, 500)
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text(); // Get error details from the body
      console.error("Error response body:", errorText);
      return `Error: ${response.status} - ${response.statusText}`;
    }

    const result = await response.json();
    console.log("API response:", result); // Log the entire API response for debugging

    if (result.error) {
      console.error("API Error:", result.error);
      return `Error: ${result.error}`;
    }

    if (result.summary_text) {
      return result.summary_text;
    } else if (Array.isArray(result) && result[0]?.summary_text) {
      return result[0].summary_text;
    } else {
      console.error("Unexpected response format:", result);
      return "Error: Unexpected response format.";
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    return `Error: ${error.message}`;
  }
}
