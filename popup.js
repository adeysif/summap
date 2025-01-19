document.addEventListener('DOMContentLoaded', async () => {
  const summaryDiv = document.getElementById('summary');
  const loadingDiv = document.getElementById('loading');
  const networkContainer = document.getElementById('network-container');

  // Load the stored summary when the popup opens
  chrome.storage.local.get(['summary'], (result) => {
    if (result.summary) {
      summaryDiv.innerText = "Summary:\n" + result.summary;
    }
  });

  document.getElementById('extractButton').addEventListener('click', async () => {
    loadingDiv.style.display = "block";
    summaryDiv.innerText = "";
    networkContainer.innerHTML = ""; // Clear previous network

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });

    chrome.tabs.sendMessage(tab.id, { action: "extractContent" }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        loadingDiv.style.display = "none";
        summaryDiv.innerText = "Error: " + chrome.runtime.lastError.message;
        return;
      }

      const extractedContent = response.content;

      const MAX_INPUT_LENGTH = 3500;
      let contentToSend = extractedContent;
      let truncationMessage = "";

      if (extractedContent.length > MAX_INPUT_LENGTH) {
        contentToSend = extractedContent.substring(0, MAX_INPUT_LENGTH);
        truncationMessage = " (Truncated)";
      }

      const summary = await summarizeText(contentToSend);
      const summaryText = "Summary:\n" + summary + truncationMessage;
      summaryDiv.innerText = summaryText;

      // Generate mind map data, this is where you will need to integrate any parser for your generated summary to be made into a mind map.
      const mindmapData = generateMindMapData(summary);
      renderMindMap(mindmapData);

      loadingDiv.style.display = "none";

      // Store the Summary, we can no longer store the mindmap data
      chrome.storage.local.set({ summary: summaryText });
    });
  });
});

function generateMindMapData(summary) {
  // Basic example, you will need to improve the logic to generate the mindmap data
  // based on the structure of your generated summary, this could include using LLM to parse the generated summary.
  return {
    nodes: [
      { id: 1, label: "Summary", level: 0 , shape: "box"},
      { id: 2, label: summary, level: 1, shape: "box" }
    ],
    edges: [
        { from: 1, to: 2 }
     ]
  };
}

function renderMindMap(mindmapData) {
  const container = document.getElementById('network-container');
  const options = {
    layout: {
        hierarchical: {
          direction: 'UD',
          sortMethod: 'directed',
        },
    },
    edges: {
      arrows: {
           to: { enabled: false}
           }
    },
    nodes: {
        shape: "box",
        margin: 10
      },
  };

  const network = new vis.Network(container, mindmapData, options);
}


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

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            const errorText = await response.text(); 
            console.error("Error response body:", errorText);
          return `Error: ${response.status} - ${response.statusText}`;
        }

        const result = await response.json();
        console.log("API response:", result);

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
