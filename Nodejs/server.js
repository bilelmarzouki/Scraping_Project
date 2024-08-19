import express from 'express';
import puppeteer from 'puppeteer';
import cors from 'cors';
import fs from 'fs';

const app = express();

// Enable CORS for your frontend's origin
const corsOptions = {
    origin: 'http://localhost:5173', // Allow requests from this origin
    methods: ['GET', 'POST'], // Allow these methods
    allowedHeaders: ['Content-Type'], // Allow these headers
};

app.use(cors(corsOptions)); // Apply CORS middleware
app.use(express.json()); // Middleware to parse JSON bodies

app.post('/api/search', async (req, res) => {
    //console.log('Received request with body:', req.body);
    const { searchPhrase } = req.body; // Get searchPhrase from the request body
    //console.log(`Received searchPhrase: ${searchPhrase}`); // Log the searchPhrase
    let browser;

    try {
        // Launch Puppeteer
        browser = await puppeteer.launch({
            headless: false, // Set to true for production
            defaultViewport: null,
        });
        const page = await browser.newPage();
        const scrapeToPage = 3; // I chose the scrap just 3 pages i think its enough to test the script

        await page.goto('https://www.amazon.de/');
        try {
            await page.waitForSelector('#a-autoid-0-announce', { timeout: 5000 });
            await page.click('#a-autoid-0-announce');
            console.log('Accepted cookies');
        } catch (e) {
            console.log('Cookie consent button not found or not needed');
        }
        //await page.waitForSelector('#searchDropdownBox');   ......here I tried to filtre the area of searching 
        //await page.select('#searchDropdownBox', 'search-alias=diy'); ..... here the area i chose is Home equipment from the DropDownBox
        await page.waitForSelector('#twotabsearchtextbox');
        await page.type('#twotabsearchtextbox', searchPhrase);
        await page.waitForSelector('#nav-search-submit-button');
        await page.click('#nav-search-submit-button');
      
        /*await page.waitForSelector('#a-autoid-0-announce', { visible: true }); 
        await page.click('#a-autoid-0-announce');  .... here i clicked sort to : features ,to can see the options
        
        await page.waitForSelector('#s-result-sort-select_1', { visible: true });

        await page.click('#s-result-sort-select_1'); ...... here i clicked the button to give me the product from the low to hight option*/  

        // Wait for the search results page to load
        await page.waitForSelector('.s-widget-container');

        const url = page.url(); // this is to get the current url

        const cardData = [];
        const baseUrl = 'https://www.amazon.de';
        async function scrapePage(url, currentPage = 1, scrapeToPage = null) {
            console.log("Scraping page " + currentPage + "...");
            if (scrapeToPage !== null && currentPage > scrapeToPage) {
                return;
            }
            await page.goto(url);
            await page.waitForSelector('.s-widget-container');
            
            const pageCardData = await page.evaluate(() => {
                const cards = Array.from(document.querySelectorAll('.s-widget-container'));

                const cardInfo = cards.map(card => {
                    const productName = card.querySelector('h2')?.textContent.trim();
                    const link = card.querySelector('a')?.href;
                    const priceElement = card.querySelector('.a-price .a-offscreen');
                    const price = priceElement ? priceElement.textContent : "N/A";

                    if (productName) {
                        return {
                            productName,
                            link,
                            price,
                        };
                    } else {
                        return null;
                    }
                }).filter(card => card !== null);

                return cardInfo;
            });

            cardData.push(...pageCardData);

            if (scrapeToPage === null || currentPage < scrapeToPage) {
                const nextPageButton = await page.$('.s-pagination-next');
                if (nextPageButton) {
                    const isDisabled = await page.evaluate(btn => btn.hasAttribute('aria-disabled'), nextPageButton);
                    if (!isDisabled) {
                        const nextPageUrl = await page.evaluate(nextBtn => nextBtn.href, nextPageButton);
                        // make the full URL
                        const fullNextPageUrl = nextPageUrl.startsWith('/') ? new URL(nextPageUrl, baseUrl).href : nextPageUrl;
                        console.log(`Navigating to next page: ${fullNextPageUrl}`);
                        await scrapePage(fullNextPageUrl, currentPage + 1, scrapeToPage);
                    } else {
                        console.log("All available pages scraped:", currentPage);
                    }
                } else if (!scrapeToPage || currentPage < scrapeToPage) {
                    console.log("All available pages scraped:", currentPage);
                }
            }
        }

        await scrapePage(url, 1, scrapeToPage);
        console.log('Scraping finished.');

        // Save JSON to file see the list of products
        const outputFilename = 'scrapedData.json';
        fs.writeFileSync(outputFilename, JSON.stringify(cardData, null, 2), 'utf8');
        console.log(`Data saved to ${outputFilename}`);

        // Return the scraped data as a JSON response
        res.json(cardData);
    } catch (error) {
        console.error('Error during scraping:', error);
        res.status(500).json({ error: 'Failed to scrape data' });
    } finally {
        await browser?.close();
        console.log(done)
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
