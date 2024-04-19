import { chromium } from 'playwright';
import csvParser from 'csv-parser';
import path from 'path';
import fs from 'fs';
import extract from 'extract-zip';


async function fetchDataFromKaggle(): Promise<string> {
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();

        console.log('going to login ');
        await page.goto('https://www.kaggle.com/account/login?phase=emailSignIn&returnUrl=%2F');

        console.log('id pass');
        await page.fill('input[name="email"]', 'ayushphenomal1@gmail.com');
        await page.fill('input[name="password"]', "Ayush$11");
        await page.click('button[type="submit"]');
        console.log('filling from done');
        await page.waitForURL("https://www.kaggle.com/");

        console.log('going to kaggle');
        await page.goto('https://www.kaggle.com/datasets/thedevastator/us-baby-names-by-year-of-birth?select=babyNamesUSYOB-full.csv');

        console.log('starting download');
        page.click('i:has-text("get_app")');

        console.log('promice of download');
        const [download] = await Promise.all([
            page.waitForEvent('download'), 
            page.waitForTimeout(5000), 
        ]);
        console.log('started.');

        const downloadPath = await download.path();
        console.log('Download path:', downloadPath);
        const renamedFilePath = 'downloaded.zip'; 
        fs.renameSync(downloadPath, renamedFilePath);

        const extractionDir = path.resolve('data');
        await extract(renamedFilePath, { dir: extractionDir });
        return extractionDir;
    } catch (error) {
        console.error(error);
       return "";
    }
}
// fetchDataFromKaggleFromKaggle()

export { fetchDataFromKaggle };