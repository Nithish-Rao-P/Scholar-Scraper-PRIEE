require('dotenv').config();
const puppeteer = require('puppeteer');

/**
 * Google Scholar Author ID Extractor
 * 
 * This module provides a function to extract a Google Scholar author ID
 * from a first name, last name, and institution.
 */

async function getGoogleScholarAuthorId(firstName, lastName, institution) {
  try {
    console.log(`Searching for author ID: ${firstName} ${lastName} at ${institution}...`);
    
    // Launch a headless browser
    const browser = await puppeteer.launch({
      headless: "new", // Use the new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      const query = `${firstName} ${lastName} ${institution}`;
      const encodedQuery = encodeURIComponent(query);
      
      // Navigate to Google Scholar with the search query
      await page.goto(`https://scholar.google.com/scholar?q=${encodedQuery}&hl=en`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Check if we're being asked to solve a CAPTCHA
      const captchaSelector = '#captcha';
      const hasCaptcha = await page.$(captchaSelector) !== null;
      
      if (hasCaptcha) {
        console.log('CAPTCHA detected. Cannot proceed with the search.');
        return { error: 'CAPTCHA detected. Please try again later.' };
      }
      
      // Look for author profile links
      // Author profile links typically have the format: /citations?user=USERID&hl=en
      const authorLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .filter(link => {
            const href = link.getAttribute('href');
            return href && href.includes('/citations?user=') && href.includes('&hl=');
          })
          .map(link => link.getAttribute('href'));
      });
      
      if (authorLinks.length === 0) {
        console.log('No author profile links found.');
        return { error: 'No author profile found.' };
      }
      
      // Extract author IDs from the links
      const authorIds = authorLinks.map(link => {
        const match = link.match(/\/citations\?user=([^&]+)/);
        return match ? match[1] : null;
      }).filter(id => id !== null);
      
      if (authorIds.length === 0) {
        console.log('No author IDs found.');
        return { error: 'No author IDs found.' };
      }
      
      // If multiple authors found, try to find the most relevant one
      let authorId = authorIds[0];
      
      // If there are multiple authors, try to find the one that matches the institution
      if (authorIds.length > 1) {
        console.log(`Found ${authorIds.length} potential author IDs. Trying to find the most relevant one...`);
        
        // Visit each author profile to check if it matches the institution
        for (const id of authorIds) {
          await page.goto(`https://scholar.google.com/citations?user=${id}&hl=en`, {
            waitUntil: 'networkidle2',
            timeout: 30000
          });
          
          // Check if the page contains the institution name
          const pageContent = await page.content();
          if (pageContent.toLowerCase().includes(institution.toLowerCase())) {
            authorId = id;
            console.log(`Found matching author ID: ${authorId}`);
            break;
          }
        }
      }
      
      // Get the full author profile URL
      const authorProfileUrl = `https://scholar.google.com/citations?user=${authorId}&hl=en`;
      
      console.log(`Author ID found: ${authorId}`);
      console.log(`Author profile URL: ${authorProfileUrl}`);
      
      return {
        authorId,
        authorProfileUrl,
        allAuthorIds: authorIds
      };
      
    } finally {
      // Always close the browser
      await browser.close();
    }
  } catch (error) {
    console.error('Error searching for author ID:', error.message);
    return { error: error.message };
  }
}

// Command-line interface
if (require.main === module) {
  // Check if running directly (not imported as a module)
  const args = process.argv.slice(1);
  
  if (args.length < 4) {
    console.log('Usage: node test.js <firstName> <lastName> <institution>');
    console.log('Example: node test.js Karthick V "Rajalakshmi Engineering College"');
    process.exit(1);
  }
  
  const firstName = args[1];
  const lastName = args[2];
  const institution = args[3];
  
  getGoogleScholarAuthorId(firstName, lastName, institution)
    .then(result => {
      console.log('\n=== RESULT ===');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

// Export the function for use in other files
module.exports = { getGoogleScholarAuthorId };
