import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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
  
  // New state variables for the form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [institution, setInstitution] = useState('');
  const [searchError, setSearchError] = useState('');
  const [scholarData, setScholarData] = useState(null);
  const [citationCharts, setCitationCharts] = useState(null);

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

  // New function to search for author by name and institution
  const searchAuthor = async () => {
    if (!firstName || !lastName || !institution) {
      setSearchError('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    setSearchError('');
    setScholarData(null);
    setSelectedJournal(null);
    setJournalStats(null);
    setActiveTab('all');
    setCitationCharts(null);
    
    try {
      const response = await axios.get(`http://localhost:5000/api/scholar`, {
        params: {
          firstName,
          lastName,
          institution
        }
      });

      console.log('API Response:', response.data); // Debug log

      if (response.data.error) {
        setSearchError(response.data.error);
        return;
      }

      // Set the scholar data
      setScholarData(response.data);
      
      // Set journal stats
      if (response.data.journalCitations) {
        const stats = {
          totalArticles: response.data.totalArticles || 0,
          totalCitations: response.data.totalCitations || 0,
          journalCitations: response.data.journalCitations || []
        };
        console.log('Setting journal stats:', stats); // Debug log
        setJournalStats(stats);
        setFilteredJournals(stats.journalCitations);
      }
      
      // Set author name from the response data, with a fallback to the input values
      setAuthorName(response.data.authorProfile?.name || `${firstName} ${lastName}`);
      
      // Prepare data for citation charts
      if (response.data.yearlyCitations && response.data.citationDistribution) {
        // Format data for Chart.js
        const yearlyData = {
          labels: response.data.yearlyCitations.map(item => `Year ${item.year}`),
          datasets: [{
            data: response.data.yearlyCitations.map(item => item.count),
            backgroundColor: response.data.yearlyCitations.map((_, index) => 
              `hsl(${(index * 360) / response.data.yearlyCitations.length}, 70%, 50%)`
            ),
            borderWidth: 1
          }]
        };

        const distributionData = {
          labels: response.data.citationDistribution.map(item => item.range),
          datasets: [{
            data: response.data.citationDistribution.map(item => item.count),
            backgroundColor: response.data.citationDistribution.map((_, index) => 
              positionColors[`${index}`] || `hsl(${(index * 360) / response.data.citationDistribution.length}, 70%, 50%)`
            ),
            borderWidth: 1
          }]
        };

        console.log('Yearly Citations Data:', yearlyData); // Debug log
        console.log('Citation Distribution Data:', distributionData); // Debug log

        setCitationCharts({
          yearlyCitations: yearlyData,
          citationDistribution: distributionData
        });
      }
    } catch (error) {
      console.error('Error searching for author:', error);
      setSearchError(error.response?.data?.error || 'Failed to search for author. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Replace fetchJournalDetails with a simpler function that just sets the selected journal
  const handleJournalDetails = (journal) => {
    setSelectedJournal(journal);
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
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        marginBottom: '2rem', 
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>First Name</label>
            <input
              type="text"
              placeholder="Enter First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ 
                padding: '0.75rem', 
                width: '100%',
                borderRadius: '4px',
                border: '1px solid #ddd',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            />
          </div>
          
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Last Name</label>
            <input
              type="text"
              placeholder="Enter Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{ 
                padding: '0.75rem', 
                width: '100%',
                borderRadius: '4px',
                border: '1px solid #ddd',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            />
          </div>
          
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Institution</label>
            <input
              type="text"
              placeholder="Enter Institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              style={{ 
                padding: '0.75rem', 
                width: '100%',
                borderRadius: '4px',
                border: '1px solid #ddd',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            />
          </div>
        </div>
        
        {searchError && (
          <div style={{ 
            color: '#e74c3c', 
            marginBottom: '10px',
            padding: '10px',
            backgroundColor: '#fadbd8',
            borderRadius: '4px',
            border: '1px solid #f5c6cb'
          }}>
            {searchError}
          </div>
        )}
        
        <button 
          onClick={searchAuthor} 
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
            transition: 'all 0.3s ease',
            alignSelf: 'flex-end'
          }}
        >
          {loading ? "Searching..." : "Search Author"}
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
          <p>Searching for author and analyzing publication data...</p>
        </div>
      )}

      {scholarData && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Scholar Profile: {authorName}</h2>
          
          {/* Citation Charts */}
          {citationCharts && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '2rem',
              marginBottom: '2rem',
              minHeight: '400px'
            }}>
              {/* Yearly Citations Chart */}
              <div style={{ 
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                minHeight: '400px'
              }}>
                <h3 style={{ 
                  color: '#2c3e50',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  Citations per Year
                </h3>
                <div style={{ width: '100%', height: '300px', position: 'relative' }}>
                  {console.log('Rendering Yearly Citations Chart with data:', citationCharts.yearlyCitations)}
                  <Bar
                    data={{
                      labels: citationCharts.yearlyCitations.labels,
                      datasets: [{
                        label: 'Citations',
                        data: citationCharts.yearlyCitations.datasets[0].data,
                        backgroundColor: 'rgba(52, 152, 219, 0.8)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              return `${context.raw} citations`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Number of Citations'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Year'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Citation Distribution Chart */}
              <div style={{ 
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                minHeight: '400px'
              }}>
                <h3 style={{ 
                  color: '#2c3e50',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  Citation Distribution
                </h3>
                <div style={{ width: '100%', height: '300px', position: 'relative' }}>
                  {console.log('Rendering Citation Distribution Chart with data:', citationCharts.citationDistribution)}
                  <Pie
                    data={citationCharts.citationDistribution}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right',
                          labels: {
                            font: {
                              size: 12
                            }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const value = context.raw;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = ((value / total) * 100).toFixed(1);
                              return `${value} articles (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Journal Statistics */}
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

              {/* Journal List */}
              <div style={{ 
                overflowX: 'auto',
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                      <th style={{ padding: '12px', textAlign: 'left' }}>Journal</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Articles</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Citations</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Avg. Citations</th>
                      <th style={{ padding: '12px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJournals.map((journal, index) => (
                      <tr 
                        key={index} 
                        style={{ 
                          backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                          borderBottom: '1px solid #ecf0f1'
                        }}
                      >
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{journal.journal}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{journal.articleCount}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{journal.totalCitations}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{journal.avgCitationsPerArticle}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleJournalDetails(journal)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#3498db',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              transition: 'background-color 0.3s ease'
                            }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedJournal && (
        <div style={{ 
          marginTop: '2rem',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '20px'
        }}>
          <h3 style={{ 
            color: '#2c3e50',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid #ecf0f1'
          }}>
            {selectedJournal.journal} - Article Details
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Title</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Year</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Citations</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Position</th>
                </tr>
              </thead>
              <tbody>
                {selectedJournal.articles.map((article, index) => (
                  <tr 
                    key={index}
                    style={{ 
                      backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white',
                      borderBottom: '1px solid #ecf0f1'
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <a 
                        href={article.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          color: '#3498db',
                          textDecoration: 'none'
                        }}
                        onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                      >
                        {article.title}
                      </a>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{article.year}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{article.citations}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: positionColors[article.authorPosition] || '#95a5a6',
                        color: 'white',
                        fontSize: '0.875rem'
                      }}>
                        {positionLabels[article.authorPosition] || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !scholarData && (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          color: '#7f8c8d',
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
        }}>
          <p>Enter author details and click "Search Author" to view journal citation statistics.</p>
        </div>
      )}
    </div>
  );
};

export default ScholarAuthor;