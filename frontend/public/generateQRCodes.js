import QRCode from "qrcode";
import fs from "fs";
import path from "path";
const outputDir = path.resolve("./public/qrcodes");

// Ensure folder exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const codes = Array.from({ length: 24 }, (_, i) => `QR-${i + 1}`);

codes.forEach(async (code, i) => {
  const data = `reward:${code}`; // embed unique string
  const filePath = path.join(outputDir, `qr-${i + 1}.png`);

  QRCode.toFile(filePath, data, { width: 300 }, (err) => {
    if (err) throw err;
    //console.log(`${filePath}`);
  });
});
