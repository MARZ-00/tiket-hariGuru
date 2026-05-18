function generateBarcode() {
  const text = document.getElementById("text").value;
  const number = document.getElementById("number").value;
  const combinedValue = `${text}-${number}`;

  if (!text) {
    alert("Please enter a value");
    return;
  }

  const url = `tiket.html?name=${encodeURIComponent(text)}&seat=${encodeURIComponent(number)}`;
    window.open(url, "_blank");
  
};

function downloadTiket() {
  const ticketElement = document.querySelector(".tiket");
  const svgBarcode = document.getElementById("barcode");

  if (!ticketElement) {
    alert("Ticket layout element not found.");
    return;
  }

  // Helper Promise to convert the SVG barcode to an Image so html2canvas can read it perfectly
  const prepareBarcode = new Promise((resolve) => {
    if (!svgBarcode) return resolve();

    // 1. Convert SVG element structure into a string
    const svgString = new XMLSerializer().serializeToString(svgBarcode);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const blobUrl = URL.createObjectURL(svgBlob);

    // 2. Create a temporary image element
    const tempImg = new Image();
    tempImg.src = blobUrl;
    
    tempImg.onload = function() {
      // Create a standard <img> tag to replace the <svg> tag layout-wise
      const barcodeImg = document.createElement("img");
      barcodeImg.id = "barcode";
      barcodeImg.src = blobUrl;
      // Copy all styles and classes from the original SVG
      barcodeImg.style.cssText = svgBarcode.style.cssText;
      barcodeImg.className = svgBarcode.className.baseVal || "";

      // Swap them in the DOM temporarily
      svgBarcode.parentNode.replaceChild(barcodeImg, svgBarcode);
      resolve({ originalSvg: svgBarcode, temporaryImg: barcodeImg });
    };
  });

  // Execute snapshot creation after barcode conversion finishes
  prepareBarcode.then((barcodeElements) => {
    html2canvas(ticketElement, {
      useCORS: true,        // Safely handles images hosted on the live server
      allowTaint: false,    // MUST be false for secure data stream compilation
      scale: 2              // Boosts image quality for a crisp download asset
    }).then(function(canvas) {
      // Convert captured canvas to a PNG stream URL
      const pngUrl = canvas.toDataURL("image/png");
      const passengerName = document.getElementById("nama")?.textContent.trim() || "Ticket";
      const safeFilename = `${passengerName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_boarding_pass.png`;

      // Trigger standard programmatic click download
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = safeFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Restore original SVG back to the live page state after snapshotting is completed
      if (barcodeElements) {
        barcodeElements.temporaryImg.parentNode.replaceChild(barcodeElements.originalSvg, barcodeElements.temporaryImg);
      }
    }).catch(function(error) {
      console.error("Oops, snapshot generation failed:", error);
      // Clean fallback restoration if things break midway
      if (barcodeElements) {
        barcodeElements.temporaryImg.parentNode.replaceChild(barcodeElements.originalSvg, barcodeElements.temporaryImg);
      }
    });
  });
};

window.onload = function() {
  const urlParams = new URLSearchParams(window.location.search);
  const name = urlParams.get('name');
  const seat = urlParams.get('seat');

  // 1. Update the text displays if they exist on this page
  if (name && document.getElementById("nama")) {
    document.getElementById("nama").textContent = name;
  }
  if (seat && document.getElementById("kerusi")) {
    document.getElementById("kerusi").textContent = seat;
  }

  // 2. Generate the barcode
  if (name && document.getElementById("barcode")) {
    const combinedValue = `${name}-${seat}`;
    JsBarcode("#barcode", combinedValue, {
      format: "CODE128",
      width: 1,
      height: 50,
      displayValue: false
    });
  }
};