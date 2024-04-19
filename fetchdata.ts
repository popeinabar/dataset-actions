import { chromium } from 'playwright';
import csvParser from 'csv-parser';
import path from 'path';
import fs from 'fs';
import extract from 'extract-zip';


async function fetchDataFromKaggle(): Promise<string> {
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto('https://www.kaggle.com/account/login?phase=emailSignIn&returnUrl=%2F');
        await page.fill('input[name="email"]', 'ayushphenomal1@gmail.com');
        await page.fill('input[name="password"]', "Ayush$11");
        await page.click('button[type="submit"]');
        await page.waitForURL("https://www.kaggle.com/");
        await page.goto('https://www.kaggle.com/datasets/thedevastator/us-baby-names-by-year-of-birth?select=babyNamesUSYOB-full.csv');
        page.click('i:has-text("get_app")');
        const [download] = await Promise.all([
            page.waitForEvent('download'), 
            page.waitForTimeout(5000), 
        ]);
        const downloadPath = await download.path();
        const renamedFilePath = 'downloaded.zip'; 
        fs.renameSync(downloadPath, renamedFilePath);
        const extractionDir = path.resolve('data');
        await extract(renamedFilePath, { dir: extractionDir });
        return extractionDir;
    } catch (error) {

       return "";
    }
}
export { fetchDataFromKaggle };