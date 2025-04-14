import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ScholarAuthor = () => {
  const [authorId, setAuthorId] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [journalStats, setJournalStats] = useState(null);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [journalLoading, setJournalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filteredJournals, setFilteredJournals] = useState([]);
  const [positionCounts, setPositionCounts] = useState({});
  const [animateTable, setAnimateTable] = useState(false);

  // Process journal data to identify author's position
  useEffect(() => {
    if (journalStats && authorName) {
      // Get author position in each article
      const journalsWithPosition = journalStats.journalCitations.map(journal => {
        const journalWithPositionArticles = {
          ...journal,
          articles: journal.articles.map(article => {
            // Simulating author position detection
            // In a real app, you would parse this from the author list in the article data
            // Here we're generating it based on author name (which would come from the API)
            let position = 'unknown';
            if (article.authors) {
              const authorIndex = article.authors.indexOf(authorName);
              if (authorIndex === 0) position = 'first';
              else if (authorIndex === article.authors.length - 1) position = 'last';
              else if (authorIndex > 0) position = 'middle';
            } else {
              // Random position assignment for demo purposes
              // In a real app, you would parse this from actual article data
              const positions = ['first', 'middle', 'last', 'corresponding'];
              position = positions[Math.floor(Math.random() * positions.length)];
            }
            return { ...article, authorPosition: position };
          })
        };

        // Calculate position stats for this journal
        const positionStats = journalWithPositionArticles.articles.reduce((acc, article) => {
          acc[article.authorPosition] = (acc[article.authorPosition] || 0) + 1;
          return acc;
        }, {});

        return {
          ...journalWithPositionArticles,
          positionStats
        };
      });

      // Calculate total counts for each position
      const totalPositionCounts = journalsWithPosition.reduce((acc, journal) => {
        Object.entries(journal.positionStats).forEach(([position, count]) => {
          acc[position] = (acc[position] || 0) + count;
        });
        return acc;
      }, {});

      setPositionCounts(totalPositionCounts);
      setJournalStats({...journalStats, journalCitations: journalsWithPosition});
      
      // Filter journals based on active tab
      filterJournalsByPosition(journalsWithPosition, activeTab);
    }
  }, [journalStats?.totalArticles, authorName, activeTab]);

  const filterJournalsByPosition = (journals, position) => {
    setAnimateTable(false);
    
    setTimeout(() => {
      if (position === 'all') {
        setFilteredJournals(journals || []);
      } else {
        // Filter journals that have at least one article with the author in the specified position
        const filtered = (journals || []).filter(journal => 
          journal.articles.some(article => article.authorPosition === position)
        );
        setFilteredJournals(filtered);
      }
      setAnimateTable(true);
    }, 300);
  };

  const fetchScholarData = async () => {
    if (!authorId) return alert("Please enter an Author ID!");
  
    setLoading(true);
    setJournalStats(null);
    setSelectedJournal(null);
    setActiveTab('all');
  
    try {
      const response = await axios.get(`http://localhost:5000/api/scholar?author_id=${authorId}`);
      setJournalStats(response.data);
      
      // In a real implementation, the API would return the author's name
      // For demo purposes, we're setting a placeholder name
      setAuthorName("John Doe"); // This would come from the API
    } catch (error) {
      console.error('Error fetching Google Scholar data:', error);
      alert("Failed to fetch data. Check your Author ID or backend.");
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalDetails = async (journalName) => {
    setJournalLoading(true);
    
    try {
      const response = await axios.get(`http://localhost:5000/api/journal-stats?author_id=${authorId}&journal_name=${encodeURIComponent(journalName)}`);
      
      // Add author position to articles (this would come from the API in a real implementation)
      const articlesWithPosition = response.data.articles.map(article => {
        // Simulating author position for demo
        const positions = ['first', 'middle', 'last', 'corresponding'];
        const position = positions[Math.floor(Math.random() * positions.length)];
        return { ...article, authorPosition: position };
      });
      
      setSelectedJournal({
        ...response.data,
        articles: articlesWithPosition
      });
    } catch (error) {
      console.error('Error fetching journal details:', error);
      alert("Failed to fetch journal details.");
    } finally {
      setJournalLoading(false);
    }
  };

  // Position labels for the UI
  const positionLabels = {
    'all': 'All Publications',
    'first': 'First Author',
    'middle': 'Middle Author',
    'last': 'Last Author',
    'corresponding': 'Corresponding Author',
    'unknown': 'Position Unknown'
  };

  // Position colors for the UI
  const positionColors = {
    'first': '#3498db',
    'middle': '#9b59b6',
    'last': '#e74c3c',
    'corresponding': '#2ecc71',
    'unknown': '#95a5a6'
  };
  
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ 
        borderBottom: '2px solid #2c3e50', 
        paddingBottom: '10px', 
        color: '#2c3e50',
        textAlign: 'center'
      }}>
        Author Position Analysis
      </h1>
      
      <div style={{ display: 'flex', marginBottom: '2rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Enter Author ID (e.g., Xm4n6EMAAAAJ)"
          value={authorId}
          onChange={(e) => setAuthorId(e.target.value)}
          style={{ 
            padding: '0.75rem', 
            marginRight: '1rem', 
            flexGrow: 1,
            borderRadius: '4px',
            border: '1px solid #ddd',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
        />
        
        <button 
          onClick={fetchScholarData} 
          disabled={loading}
          style={{ 
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease'
          }}
        >
          {loading ? "Loading..." : "Analyze Citations"}
        </button>
      </div>

      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <div className="loading-spinner" style={{
            border: '4px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '50%',
            borderTop: '4px solid #3498db',
            width: '40px',
            height: '40px',
            margin: '0 auto 20px auto',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p>Fetching and analyzing publication data...</p>
        </div>
      )}

      {journalStats && (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center', padding: '10px', flex: '1 0 120px' }}>
              <h3 style={{ color: '#3498db', fontSize: '28px', margin: '0 0 5px 0' }}>
                {journalStats.totalArticles}
              </h3>
              <p style={{ margin: 0, color: '#7f8c8d' }}>Total Articles</p>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', flex: '1 0 120px' }}>
              <h3 style={{ color: '#3498db', fontSize: '28px', margin: '0 0 5px 0' }}>
                {journalStats.totalCitations}
              </h3>
              <p style={{ margin: 0, color: '#7f8c8d' }}>Total Citations</p>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', flex: '1 0 120px' }}>
              <h3 style={{ color: '#3498db', fontSize: '28px', margin: '0 0 5px 0' }}>
                {journalStats.journalCitations.length}
              </h3>
              <p style={{ margin: 0, color: '#7f8c8d' }}>Unique Journals</p>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', flex: '1 0 120px' }}>
              <h3 style={{ color: '#3498db', fontSize: '28px', margin: '0 0 5px 0' }}>
                {(journalStats.totalCitations / journalStats.totalArticles).toFixed(2)}
              </h3>
              <p style={{ margin: 0, color: '#7f8c8d' }}>Avg. Citations</p>
            </div>
          </div>

          {/* Author Position Tabs */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ 
              display: 'flex', 
              borderBottom: '1px solid #e9ecef',
              overflowX: 'auto',
              paddingBottom: '2px',
              marginBottom: '20px'
            }}>
              {Object.entries(positionLabels).map(([position, label]) => {
                // Only show tabs for positions that exist in our data
                if (position === 'all' || positionCounts[position]) {
                  return (
                    <button
                      key={position}
                      onClick={() => {
                        setActiveTab(position);
                        filterJournalsByPosition(journalStats.journalCitations, position);
                      }}
                      style={{
                        padding: '10px 20px',
                        margin: '0 5px 0 0',
                        backgroundColor: activeTab === position ? 
                          (position === 'all' ? '#3498db' : positionColors[position]) : 'transparent',
                        color: activeTab === position ? 'white' : '#34495e',
                        border: 'none',
                        borderRadius: '4px 4px 0 0',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        fontWeight: activeTab === position ? 'bold' : 'normal',
                        minWidth: '100px',
                        textAlign: 'center'
                      }}
                    >
                      {label}
                      {position !== 'all' && (
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: activeTab === position ? 'rgba(255,255,255,0.3)' : positionColors[position],
                          color: activeTab === position ? 'white' : 'white',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '0.8rem',
                          marginLeft: '5px',
                          fontWeight: 'normal'
                        }}>
                          {positionCounts[position] || 0}
                        </span>
                      )}
                    </button>
                  );
                }
                return null;
              })}
            </div>

            <h2 style={{ 
              marginTop: '2rem', 
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center'
            }}>
              {positionLabels[activeTab]} 
              <span style={{
                fontSize: '1rem',
                fontWeight: 'normal',
                marginLeft: '10px',
                color: '#7f8c8d'
              }}>
                ({filteredJournals.length} journals)
              </span>
            </h2>
          </div>
          
          <div style={{ 
            overflowX: 'auto',
            transition: 'opacity 0.3s ease',
            opacity: animateTable ? 1 : 0
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Rank</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Journal</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Articles</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Citations</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Avg. Citations</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Author Positions</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJournals.map((journal, index) => (
                  <tr 
                    key={index} 
                    style={{ 
                      backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                      borderBottom: '1px solid #ecf0f1',
                      animation: `fadeIn 0.5s ease forwards ${index * 0.1}s`,
                      opacity: 0
                    }}
                  >
                    <td style={{ padding: '12px' }}>{index + 1}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{journal.journal}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{journal.articleCount}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{journal.totalCitations}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{journal.avgCitationsPerArticle}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                        {Object.entries(journal.positionStats || {}).map(([position, count]) => (
                          <div 
                            key={position}
                            title={`${positionLabels[position]}: ${count}`}
                            style={{
                              backgroundColor: positionColors[position],
                              color: 'white',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                          >
                            <span>{position.charAt(0).toUpperCase()}</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => fetchJournalDetails(journal.journal)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#2ecc71',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>

          {filteredJournals.length === 0 && !loading && (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem', 
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginTop: '20px'
            }}>
              <p>No journals found with author in {positionLabels[activeTab].toLowerCase()} position.</p>
            </div>
          )}
        </div>
      )}

      {journalLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', marginTop: '2rem' }}>
          <div className="loading-spinner" style={{
            border: '4px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '50%',
            borderTop: '4px solid #2ecc71',
            width: '30px',
            height: '30px',
            margin: '0 auto 20px auto',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Loading journal details...</p>
        </div>
      )}

      {selectedJournal && !journalLoading && (
        <div style={{ 
          marginTop: '2rem', 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
          animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ color: '#2c3e50', margin: '0 0 20px 0' }}>
              {selectedJournal.journal} - Detailed Analysis
            </h2>
            <button 
              onClick={() => setSelectedJournal(null)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              Close
            </button>
          </div>

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-around', 
            backgroundColor: 'white', 
            padding: '15px', 
            borderRadius: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center', padding: '10px', flex: '1 0 120px' }}>
              <h3 style={{ color: '#e74c3c', fontSize: '24px', margin: '0 0 5px 0' }}>
                {selectedJournal.articleCount}
              </h3>
              <p style={{ margin: 0, color: '#7f8c8d' }}>Articles</p>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', flex: '1 0 120px' }}>
              <h3 style={{ color: '#e74c3c', fontSize: '24px', margin: '0 0 5px 0' }}>
                {selectedJournal.totalCitations}
              </h3>
              <p style={{ margin: 0, color: '#7f8c8d' }}>Citations</p>
            </div>
            <div style={{ textAlign: 'center', padding: '10px', flex: '1 0 120px' }}>
              <h3 style={{ color: '#e74c3c', fontSize: '24px', margin: '0 0 5px 0' }}>
                {(selectedJournal.totalCitations / selectedJournal.articleCount).toFixed(2)}
              </h3>
              <p style={{ margin: 0, color: '#7f8c8d' }}>Avg. Citations per Article</p>
            </div>
          </div>

          <h3 style={{ color: '#2c3e50' }}>Articles in this Journal</h3>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {selectedJournal.articles.map((article, index) => (
              <div 
                key={index} 
                style={{ 
                  marginBottom: '15px', 
                  paddingBottom: '15px', 
                  borderBottom: index < selectedJournal.articles.length - 1 ? '1px solid #ecf0f1' : 'none',
                  animation: `fadeIn 0.5s ease forwards ${index * 0.1}s`,
                  opacity: 0
                }}
              >
                <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{article.title}</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ color: '#7f8c8d', marginRight: '15px' }}>Year: {article.year}</span>
                    <span style={{ 
                      backgroundColor: positionColors[article.authorPosition], 
                      color: 'white', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.9rem'
                    }}>
                      {positionLabels[article.authorPosition]}
                    </span>
                  </div>
                  <span style={{ 
                    backgroundColor: '#3498db', 
                    color: 'white', 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.9rem'
                  }}>
                    {article.citations} citations
                  </span>
                </div>
                {article.url && (
                  <a 
                    href={article.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'inline-block', 
                      marginTop: '8px', 
                      color: '#3498db', 
                      textDecoration: 'none',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    View Article →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !journalStats && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          color: '#7f8c8d',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <p>Enter an author ID and click "Analyze Citations" to view journal citation statistics.</p>
          <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
            Tip: You can find an author ID in the URL of a Google Scholar profile page.<br />
            Example: For https://scholar.google.com/citations?user=Xm4n6EMAAAAJ, the ID is "Xm4n6EMAAAAJ"
          </p>
        </div>
      )}
    </div>
  );
};

export default ScholarAuthor;