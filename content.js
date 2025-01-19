function extractContentFromPage() {
  let mainContent = "";
  let contentElement = document.querySelector('#mw-content-text .mw-parser-output'); // Target the main content area

  if (contentElement) {
    // Remove specific elements we don't want (e.g., tables of contents, side boxes)
    const unwantedElements = contentElement.querySelectorAll('.toc, .infobox, .sidebar, .metadata, .hatnote, .reflist');
    unwantedElements.forEach(element => element.remove());

    // Extract text from paragraphs and headings
    const textElements = contentElement.querySelectorAll('p, h2, h3, h4, h5, h6');
    textElements.forEach(element => {
      mainContent += element.innerText + "\n";
    });
  }

  return mainContent;
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "extractContent") {
      const extractedContent = extractContentFromPage();
      sendResponse({ content: extractedContent });
    }
    return true; // Indicate that we will send a response asynchronously
  }
);
