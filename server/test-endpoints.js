const axios = require('axios');

// Test the author-id endpoint
async function testAuthorId() {
  try {
    console.log('Testing /api/author-id endpoint...');
    const response = await axios.post('http://localhost:5000/api/author-id', {
      firstName: 'John',
      lastName: 'Doe',
      institution: 'University of Example'
    });
    console.log('Response:', response.data);
    return response.data.authorId;
  } catch (error) {
    console.error('Error testing /api/author-id:', error.message);
    return null;
  }
}

// Test the scholar endpoint
async function testScholar(authorId) {
  try {
    console.log('Testing /api/scholar endpoint...');
    const response = await axios.get(`http://localhost:5000/api/scholar?author_id=${authorId}`);
    console.log('Response structure:', Object.keys(response.data));
    return response.data;
  } catch (error) {
    console.error('Error testing /api/scholar:', error.message);
    return null;
  }
}

// Test the journal-stats endpoint
async function testJournalStats(authorId, journalName) {
  try {
    console.log('Testing /api/journal-stats endpoint...');
    const response = await axios.get(`http://localhost:5000/api/journal-stats?author_id=${authorId}&journal_name=${encodeURIComponent(journalName)}`);
    console.log('Response structure:', Object.keys(response.data));
    return response.data;
  } catch (error) {
    console.error('Error testing /api/journal-stats:', error.message);
    return null;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting tests...');
  
  // Test author-id endpoint
  const authorId = await testAuthorId();
  
  if (authorId) {
    // Test scholar endpoint
    const scholarData = await testScholar(authorId);
    
    if (scholarData && scholarData.journalCitations && scholarData.journalCitations.length > 0) {
      // Test journal-stats endpoint with the first journal
      const journalName = scholarData.journalCitations[0].journal;
      await testJournalStats(authorId, journalName);
    }
  }
  
  console.log('Tests completed.');
}

// Run the tests
runTests(); 