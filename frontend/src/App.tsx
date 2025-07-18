import { useState } from 'react';
import axios from 'axios';
import './App.css';

interface Match {
  catalog_item: any;
  score: number;
}

interface MatchResult {
  po_item: string;
  matches: Match[];
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMatches, setSelectedMatches] = useState<any>({});

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSelectionChange = (po_item: string, catalog_item: any) => {
    setSelectedMatches({
      ...selectedMatches,
      [po_item]: catalog_item,
    });
  };

  const handleConfirmMatches = async () => {
    const matchesToConfirm = Object.keys(selectedMatches).map(po_item => {
      const catalog_item = selectedMatches[po_item];
      return {
        po_item,
        catalog_item_id: catalog_item.id,
        catalog_item_description: catalog_item.description,
      };
    });

    try {
      await axios.post('http://127.0.0.1:5000/confirm_matches', { matches: matchesToConfirm });
      alert('Matches confirmed successfully!');
      setResults([]);
    } catch (error) {
      console.error('Confirmation error:', error);
      alert('Failed to confirm matches.');
    }
  };

  const handleUpload = async () => {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      setIsLoading(true);
      setResults([]);

      try {
        const response = await axios.post('http://127.0.0.1:5000/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        const apiResults = response.data.results;
        const formattedResults = Object.keys(apiResults).map(po_item => {
          const apiMatches = apiResults[po_item];
          const formattedMatches = apiMatches.map((apiMatch: { match: string, score: number }) => ({
            catalog_item: {
              id: apiMatch.match,
              description: apiMatch.match,
            },
            score: apiMatch.score,
          }));
          return {
            po_item: po_item,
            matches: formattedMatches,
          };
        });

        setResults(formattedResults);

        const initialSelectedMatches: any = {};
        formattedResults.forEach((result: MatchResult) => {
          if (result.matches.length > 0) {
            initialSelectedMatches[result.po_item] = result.matches[0].catalog_item;
          }
        });
        setSelectedMatches(initialSelectedMatches);
      } catch (error) {
        console.error('Upload error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>Process Purchase Order</h1>
        <div className="upload-section">
          <input type="file" onChange={handleFileChange} />
          <button onClick={handleUpload} disabled={!file || isLoading}>
            {isLoading ? 'Processing...' : 'Upload'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="card">
          <h2>Matching Results</h2>
          <div className="results-section">
            {results.map((result, index) => (
              <div key={index} className="result-item">
                <h3>PO Item: <span>{result.po_item}</span></h3>
                <select onChange={(e) => handleSelectionChange(result.po_item, JSON.parse(e.target.value))}>
                  {result.matches.map((match, i) => (
                    <option key={i} value={JSON.stringify(match.catalog_item)}>
                      {match.catalog_item.description} (Score: {match.score.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="confirm-button">
            <button onClick={handleConfirmMatches}>Confirm Matches</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
