const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { getGoogleScholarAuthorId } = require('./test');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Endpoint to fetch author ID from name and institution
app.post('/api/author-id', async (req, res) => {
  const { firstName, lastName, institution } = req.body;
  
  if (!firstName || !lastName || !institution) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    console.log(`🔍 Searching for author: ${firstName} ${lastName} at ${institution}`);
    
    // Use the getGoogleScholarAuthorId function from test.js
    const result = await getGoogleScholarAuthorId(firstName, lastName, institution);
    
    if (result.error) {
      console.log(`❌ Error finding author: ${result.error}`);
      res.status(404).json({ error: result.error });
    } else {
      console.log(`✅ Found author ID: ${result.authorId}`);
      res.json({ author_id: result.authorId });
    }
  } catch (error) {
    console.error('❌ Error searching for author:', error.message);
    res.status(500).json({ error: 'Failed to search for author' });
  }
});

app.get('/api/scholar', async (req, res) => {
    const { firstName, lastName, institution } = req.query;
    console.log(req.query);
    
    if (!firstName || !lastName || !institution) {
        return res.status(400).json({ error: 'Missing required fields: firstName, lastName, and institution are required' });
    }
    
    const apiKey = "467b61cf4b48104adc10075faa6036e08c2a82f12e60192136ee5e447a2d5293";

    try {
        console.log(`🔍 Searching for author: ${firstName} ${lastName} at ${institution}`);
        
        // Use the getGoogleScholarAuthorId function to get the author ID
        const result = await getGoogleScholarAuthorId(firstName, lastName, institution);
        
        if (result.error) {
            console.log(`❌ Error finding author: ${result.error}`);
            return res.status(404).json({ error: result.error });
        }
        
        const authorId = result.authorId;
        console.log(`✅2 Found author ID: ${authorId}`);
        
        let allArticles = [];
        let start = 0;
        let hasMore = true;
        
        console.log(`🔍 Fetching data for author ID: ${authorId}`);
        
        while (hasMore) {
            console.log(`  Fetching batch starting at position ${start}...`);
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    engine: 'google_scholar_author',
                    author_id: authorId,
                    api_key: apiKey,
                    start,
                },
            });
            const data = response.data;
            const articles = data.articles || [];
            allArticles.push(...articles);
            console.log(`  Retrieved ${articles.length} articles in this batch`);
            
            if (articles.length < 20) {
                hasMore = false;
            } else {
                start += 20;
            }
        }

        console.log(`✅ Fetched ${allArticles.length} total papers for author ID: ${authorId}`);
        console.log('-----------------------------------------------------');

        // Organize articles by journal and count citations
        const journalCitations = {};
        
        allArticles.forEach(article => {
            // Extract journal name
            const publication = article.publication || 'Unknown Journal';
            
            // Some publications might include other details after comma
            // e.g., "Nature, 2020, 123-145"
            const journalName = publication.split(',')[0].trim();
            
            // Initialize journal in our tracking object if it doesn't exist
            if (!journalCitations[journalName]) {
                journalCitations[journalName] = {
                    totalCitations: 0,
                    articleCount: 0,
                    articles: []
                };
            }
            
            // Add citation count
            const citations = article.cited_by?.value || 0;
            journalCitations[journalName].totalCitations += citations;
            journalCitations[journalName].articleCount += 1;
            
            // Optionally store article details
            journalCitations[journalName].articles.push({
                title: article.title,
                year: article.year,
                citations: citations,
                url: article.article_url
            });
        });
        
        // Convert to an array and sort by total citations
        const journalStats = Object.entries(journalCitations).map(([journal, data]) => ({
            journal,
            totalCitations: data.totalCitations,
            articleCount: data.articleCount,
            avgCitationsPerArticle: (data.totalCitations / data.articleCount).toFixed(2),
            articles: data.articles
        })).sort((a, b) => b.totalCitations - a.totalCitations);

        // Print detailed journal statistics to console
        console.log('📊 JOURNAL CITATION STATISTICS:');
        console.log('=====================================================');
        console.log(`Total number of articles: ${allArticles.length}`);
        console.log(`Number of unique journals: ${journalStats.length}`);
        console.log('=====================================================');
        
        // Calculate total citations across all journals
        const totalCitations = journalStats.reduce((sum, journal) => sum + journal.totalCitations, 0);
        console.log(`Total citations across all journals: ${totalCitations}`);
        console.log('=====================================================');
        
        // Print table header
        console.log('RANK | JOURNAL                      | ARTICLES | CITATIONS | AVG CITATIONS');
        console.log('-----|------------------------------|----------|-----------|-------------');
        
        // Print each journal's statistics in a table format
        journalStats.forEach((journal, index) => {
            const rank = (index + 1).toString().padEnd(4);
            const journalName = journal.journal.substring(0, 30).padEnd(30);
            const articleCount = journal.articleCount.toString().padEnd(9);
            const citations = journal.totalCitations.toString().padEnd(10);
            const avgCitations = journal.avgCitationsPerArticle.padEnd(10);
            
            console.log(`${rank} | ${journalName} | ${articleCount} | ${citations} | ${avgCitations}`);
        });
        
        console.log('=====================================================');
        console.log('TOP 5 MOST CITED ARTICLES:');
        
        // Get the top 5 most cited articles across all journals
        const topArticles = allArticles
            .sort((a, b) => (b.cited_by?.value || 0) - (a.cited_by?.value || 0))
            .slice(0, 5);
            
        topArticles.forEach((article, index) => {
            console.log(`${index + 1}. "${article.title}" (${article.year})`);
            console.log(`   Journal: ${article.publication || 'Unknown'}`);
            console.log(`   Citations: ${article.cited_by?.value || 0}`);
            console.log('   ---');
        });
        
        res.json({ 
            totalArticles: allArticles.length,
            totalCitations: totalCitations,
            journalCitations: journalStats 
        });
    } catch (error) {
        console.error('❌ Error fetching data from SerpAPI:', error.message);
        res.status(500).json({ error: 'Failed to fetch author data' });
    }
});

// Add a new endpoint to get detailed journal stats
app.get('/api/journal-stats', async (req, res) => {
    const { firstName, lastName, institution, journal_name } = req.query;
    
    if (!firstName || !lastName || !institution || !journal_name) {
        return res.status(400).json({ error: 'Missing required fields: firstName, lastName, institution, and journal_name are required' });
    }
    
    const apiKey = "467b61cf4b48104adc10075faa6036e08c2a82f12e60192136ee5e447a2d5293";

    try {
        console.log(`🔍 Searching for author: ${firstName} ${lastName} at ${institution}`);
        
        // Use the getGoogleScholarAuthorId function to get the author ID
        const result = await getGoogleScholarAuthorId(firstName, lastName, institution);
        
        if (result.error) {
            console.log(`❌ Error finding author: ${result.error}`);
            return res.status(404).json({ error: result.error });
        }
        
        const authorId = result.authorId;
        console.log(`✅ Found author ID: ${authorId}`);
        
        console.log(`🔍 Fetching detailed stats for journal "${journal_name}" by author ID: ${authorId}`);
        
        let allArticles = [];
        let start = 0;
        let hasMore = true;
        
        while (hasMore) {
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    engine: 'google_scholar_author',
                    author_id: authorId,
                    api_key: apiKey,
                    start,
                },
            });
            
            const data = response.data;
            const articles = data.articles || [];
            allArticles.push(...articles);
            
            if (articles.length < 20) {
                hasMore = false;
            } else {
                start += 20;
            }
        }
        
        // Filter articles by the requested journal
        const journalArticles = allArticles.filter(article => {
            const publication = article.publication || '';
            return publication.split(',')[0].trim().toLowerCase() === journal_name.toLowerCase();
        });
        
        // Get citation details for this journal
        const journalDetails = {
            journal: journal_name,
            articleCount: journalArticles.length,
            totalCitations: journalArticles.reduce((sum, article) => sum + (article.cited_by?.value || 0), 0),
            articles: journalArticles.map(article => ({
                title: article.title,
                year: article.year,
                citations: article.cited_by?.value || 0,
                url: article.article_url
            })).sort((a, b) => b.citations - a.citations)
        };
        
        // Print detailed journal information to console
        console.log('=====================================================');
        console.log(`📚 DETAILED STATS FOR JOURNAL: ${journal_name}`);
        console.log('=====================================================');
        console.log(`Articles in this journal: ${journalDetails.articleCount}`);
        console.log(`Total citations: ${journalDetails.totalCitations}`);
        console.log(`Average citations per article: ${journalDetails.articleCount > 0 ? 
            (journalDetails.totalCitations / journalDetails.articleCount).toFixed(2) : 'N/A'}`);
        console.log('=====================================================');
        console.log('ARTICLES IN THIS JOURNAL:');
        
        journalDetails.articles.forEach((article, index) => {
            console.log(`${index + 1}. "${article.title}" (${article.year})`);
            console.log(`   Citations: ${article.citations}`);
            console.log('   ---');
        });
        
        res.json(journalDetails);
    } catch (error) {
        console.error('❌ Error fetching journal stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch journal statistics' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server is running at http://localhost:${PORT}`);
});