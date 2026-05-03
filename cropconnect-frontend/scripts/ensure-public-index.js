const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");
const indexPath = path.join(publicDir, "index.html");

if (!fs.existsSync(indexPath)) {
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(
    indexPath,
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#1B4332" />
    <meta name="description" content="CropConnect - field-to-phone IoT platform for modern farming" />
    <title>CropConnect | Farming, connected</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
`,
  );
}
