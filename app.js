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

-

// --- SCANNER SYSTEM ENGINE ---
let html5QrcodeScanner = null;

function onScanSuccess(decodedText, decodedResult) {
  // Your barcode generation format uses: `${name}-${seat}`
  // Let's break it down securely back into its core properties
  if (decodedText.includes("-")) {
    const parts = decodedText.split("-");
    
    // Extract everything before the last dash as the name, and the final index as the seat
    const seat = parts.pop();
    const name = parts.join("-"); 

    // Update readout DOM
    document.getElementById("scanned-name").textContent = name;
    document.getElementById("scanned-seat").textContent = seat;

    // Show output display card
    document.getElementById("scan-result").classList.remove("hidden");
    
    // Optional: Turn off camera tracking elements upon valid acquisition
    if (html5QrcodeScanner) {
      html5QrcodeScanner.clear().catch(err => console.error("Failed to clear scanner:", err));
    }
  } else {
    alert(`Scanned data format unexpected: "${decodedText}". Make sure it's a Muttaqin Starways pass.`);
  }
}

function onScanFailure(error) {
  // Quietly handle ongoing lookups without printing verbose logs to the browser console
}

function resetScanner() {
  // Hide data readout board
  document.getElementById("scan-result").classList.add("hidden");
  
  // Reboot hardware loop binding
  startScannerInstance();
}

function startScannerInstance() {
  if (document.getElementById("reader")) {
    html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 15, 
        qrbox: { width: 250, height: 150 }, // Adjusted proportions for wider linear 1D barcodes
        aspectRatio: 1.777778
      },
      /* verbose= */ false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  }
}

// Modify or wrap your existing window.onload to gracefully hook scanner deployment updates safely
const existingOnload = window.onload;
window.onload = function() {
  if (existingOnload) existingOnload();
  
  // Initialize scanner component structural initialization framework safely if on scanning terminal
  if (document.getElementById("reader")) {
    startScannerInstance();
  }
};
