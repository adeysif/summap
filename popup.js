document.addEventListener('DOMContentLoaded', async () => {
  const summaryDiv = document.getElementById('summary');
    const loadingDiv = document.getElementById('loading');
    const darkModeToggle = document.getElementById('darkModeToggle');


    // Load theme preference from storage
    chrome.storage.local.get(['darkMode'], (result) => {
    const darkMode = result.darkMode;
    if (darkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
        }
     });

  // Load the stored summary when popup opens
  chrome.storage.local.get(['summary'], (result) => {
    if (result.summary) {
      summaryDiv.innerText = result.summary;
    }
  });
    

  darkModeToggle.addEventListener('change', () => {
        if(darkModeToggle.checked) {
            document.body.classList.add('dark-mode');
            chrome.storage.local.set({ darkMode: true });
        } else {
             document.body.classList.remove('dark-mode');
              chrome.storage.local.set({ darkMode: false });
        }
   });


  document.getElementById('extractButton').addEventListener('click', async () => {
    loadingDiv.style.display = "block";
    summaryDiv.innerText = ""; // Clear previous summary

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

      const MAX_INPUT_LENGTH = 3000;
      let contentToSend = extractedContent;
      let truncationMessage = "";

      if (extractedContent.length > MAX_INPUT_LENGTH) {
        contentToSend = extractedContent.substring(0, MAX_INPUT_LENGTH);
        truncationMessage = "";
      }

      const summary = await summarizeText(contentToSend);
      const summaryText = "Summary:\n" + summary + truncationMessage;
      summaryDiv.innerText = summaryText;

      loadingDiv.style.display = "none";
      // Store the Summary
      chrome.storage.local.set({ summary: summaryText });
    });
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
