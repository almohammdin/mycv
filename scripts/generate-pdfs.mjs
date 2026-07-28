import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexUrl = pathToFileURL(path.join(projectDir, "index.html")).href;

async function fontCss(packageName) {
  const packageDir = path.join(
    projectDir,
    "node_modules",
    "@fontsource",
    packageName,
  );
  const filesUrl = `${pathToFileURL(path.join(packageDir, "files")).href}/`;
  const styles = await Promise.all(
    [300, 400, 500, 600, 700].map(async (weight) => {
      const css = await readFile(path.join(packageDir, `${weight}.css`), "utf8");
      return css.replaceAll("url(./files/", `url(${filesUrl}`);
    }),
  );
  return styles.join("\n");
}

async function addLocalFonts(page) {
  const css = [
    await fontCss("ibm-plex-sans-arabic"),
    await fontCss("ibm-plex-sans"),
  ].join("\n");
  await page.addStyleTag({ content: css });
  await page.evaluate(async () => document.fonts.ready);
}

async function preparePage(page, lang) {
  await page.goto(indexUrl, { waitUntil: "domcontentloaded" });
  await addLocalFonts(page);
  await page.evaluate((selectedLang) => {
    switchLang(selectedLang);
    const active = document.querySelector(".lang-content.active");
    if (!active) throw new Error(`Missing active language: ${selectedLang}`);

    active.setAttribute("lang", selectedLang);
    active.setAttribute("dir", selectedLang === "ar" ? "rtl" : "ltr");
    document.body.classList.add("pdf-build");
    active.classList.add("pdf-document");
    document.querySelector(".top-bar")?.remove();
    document.querySelector("footer")?.remove();

    const exportFooter = document.createElement("div");
    exportFooter.className = "pdf-export-footer";
    exportFooter.innerHTML = `
      <img src="./assets/naif-footer-logo.png" alt="">
      <div class="pdf-export-links">
        <a href="https://almohammdin.github.io/mycv/">almohammdin.github.io/mycv</a>
        <span>•</span>
        <a href="mailto:almohammdin@gmail.com">almohammdin@gmail.com</a>
      </div>`;
    active.querySelector(".container")?.append(exportFooter);
  }, lang);

  await page.addStyleTag({
    content: `
      @page { size:A4; margin:10mm 13mm 12mm; }
      html, body { background:#fff !important; }
      body.pdf-build { margin:0 !important; padding:0 !important; }
      body.pdf-build > .lang-content { display:none !important; }
      body.pdf-build > .lang-content.active.pdf-document {
        display:block !important;
        position:static !important;
        inset:auto !important;
        width:184mm !important;
        min-height:0 !important;
        margin:0 auto !important;
        padding:0 !important;
      }
      body.pdf-build .container { margin:0 !important; }
      body.pdf-build .header { margin-top:0 !important; }
      body.pdf-build a { color:inherit; }
      body.pdf-build .tool-card:hover,
      body.pdf-build .board-card:hover,
      body.pdf-build .exp-card:hover,
      body.pdf-build .tag:hover { transform:none !important; box-shadow:none !important; }
    `,
  });
  await page.emulateMedia({ media: "print" });
  await page.evaluate(async (selectedLang) => {
    await document.fonts.ready;
    const images = Array.from(document.images);
    images.forEach((image) => {
      image.loading = "eager";
    });
    await Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
              setTimeout(resolve, 10000);
            }),
      ),
    );
    const fontQuery =
      selectedLang === "ar"
        ? '16px "IBM Plex Sans Arabic"'
        : '16px "IBM Plex Sans"';
    const fontSample =
      selectedLang === "ar" ? "نايف المحمدي" : "Naif Almohammdi";
    await document.fonts.load(fontQuery, fontSample);
    await document.fonts.ready;
  }, lang);
}

async function generate(browser, lang, outputName) {
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1800 },
    deviceScaleFactor: 1,
  });
  await preparePage(page, lang);
  const fontLoaded = await page.evaluate((selectedLang) =>
    selectedLang === "ar"
      ? document.fonts.check('16px "IBM Plex Sans Arabic"', "نايف المحمدي")
      : document.fonts.check('16px "IBM Plex Sans"', "Naif Almohammdi"),
  lang);
  if (!fontLoaded) throw new Error(`IBM Plex did not load for ${lang}`);

  const pdf = await page.pdf({
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
    outline: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;font-size:7px;color:#7b8796;text-align:center;font-family:Arial,sans-serif;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: "10mm", right: "13mm", bottom: "12mm", left: "13mm" },
  });
  await writeFile(path.join(projectDir, outputName), pdf);
  await page.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await generate(browser, "ar", "Naif-Almohammdi-CV-AR.pdf");
  await generate(browser, "en", "Naif-Almohammdi-CV-EN.pdf");
} finally {
  await browser.close();
}
