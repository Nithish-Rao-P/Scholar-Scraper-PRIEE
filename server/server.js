const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());

app.get('/api/scholar', async (req, res) => {
    const { author_id } = req.query;
    const apiKey = "c85dc990e446638580b0da2eeb47af2ff9ceac6ad8a384e64ce3c446429c1ae2";

    let allArticles = [];
    let start = 0;
    let hasMore = true;
    
    console.log(`🔍 Fetching data for author ID: ${author_id}`);
    
    try {
        while (hasMore) {
            console.log(`  Fetching batch starting at position ${start}...`);
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    engine: 'google_scholar_author',
                    author_id,
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

        console.log(`✅ Fetched ${allArticles.length} total papers for author ID: ${author_id}`);
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
    const { author_id, journal_name } = req.query;
    
    if (!author_id || !journal_name) {
        return res.status(400).json({ error: 'Both author_id and journal_name are required' });
    }
    
    const apiKey = "c85dc990e446638580b0da2eeb47af2ff9ceac6ad8a384e64ce3c446429c1ae2";

    try {
        console.log(`🔍 Fetching detailed stats for journal "${journal_name}" by author ID: ${author_id}`);
        
        let allArticles = [];
        let start = 0;
        let hasMore = true;
        
        while (hasMore) {
            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    engine: 'google_scholar_author',
                    author_id,
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