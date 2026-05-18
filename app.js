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

// --- Quagga2 CODE128 Scanner Implementation ---

window.addEventListener('DOMContentLoaded', () => {
  // Initialize only if the target canvas interactive wrapper exists on the page
  if (document.getElementById("interactive")) {
    initBarcodeScanner();
  }
});

function initBarcodeScanner() {
  const statusMsg = document.getElementById("scanner-status");
  statusMsg.textContent = "Accessing spacecraft optical sensors...";

  Quagga.init({
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: document.querySelector('#interactive'), // Injects into our video container
      constraints: {
        width: 640,
        height: 480,
        facingMode: "environment" // Targets rear-facing smartphone camera
      },
    },
    decoder: {
      // Strictly isolate scan tracking patterns solely to CODE128 layouts
      readers: ["code_128_reader"]
    },
    locate: true // Turns on the real-time locator matrix logic to locate the barcode
  }, function (err) {
    if (err) {
      console.error("Quagga initialization failed:", err);
      statusMsg.textContent = "Error: Camera access missing or blocked.";
      return;
    }
    console.log("Initialization complete. Ready to scan.");
    statusMsg.textContent = "Align CODE128 barcode inside view box...";
    Quagga.start();
  });

  // Attach the detection listener event catch callback
  Quagga.onDetected(handleBarcodeDetected);
}

function handleBarcodeDetected(result) {
  if (!result || !result.codeResult) return;

  const scannedCode = result.codeResult.code;
  
  // Pause calculations to prevent duplicate background event spam execution loops
  Quagga.offDetected();
  Quagga.stop();

  const statusMsg = document.getElementById("scanner-status");
  const resultCard = document.getElementById("scan-result");
  const nameDisplay = document.getElementById("scanned-name");
  const seatDisplay = document.getElementById("scanned-seat");

  statusMsg.textContent = "CODE128 Data successfully processed.";

  // Splitting parsed compound dataset schema: `${name}-${seat}`
  const dataParts = scannedCode.split("-");
  
  if (dataParts.length >= 2) {
    const seatNumber = dataParts.pop(); // Grabs the assigned seat segment
    const passengerName = dataParts.join("-"); // Recombines if the passenger name contained dashes

    nameDisplay.textContent = decodeURIComponent(passengerName);
    seatDisplay.textContent = decodeURIComponent(seatNumber);
  } else {
    nameDisplay.textContent = scannedCode;
    seatDisplay.textContent = "N/A";
  }

  resultCard.style.display = "block";
}

function resetScanner() {
  document.getElementById("scan-result").style.display = "none";
  document.getElementById("scanned-name").textContent = "-";
  document.getElementById("scanned-seat").textContent = "-";
  
  // Re-initialize and boot scanner streams fresh
  initBarcodeScanner();
}
