import { useState, useRef } from 'react';
import axios from 'axios';
import './App.css';

interface CatalogItem {
  id: string;
  description: string;
}

interface Match {
  catalog_item: CatalogItem;
  score: number;
}

interface MatchResult {
  po_item: string;
  matches: Match[];
  details: Details;
}

type SelectedMatches = {
  [po_item: string]: CatalogItem;
};

type Details = {
  [key: string]: string;
};

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedMatches, setSelectedMatches] = useState<SelectedMatches>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setResults([]);
      setSelectedMatches({});
    }
  };

  const handleSelectionChange = (po_item: string, catalog_item: CatalogItem) => {
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

    setIsConfirming(true);
    try {
      await axios.post('http://127.0.0.1:5000/confirm_matches', { matches: matchesToConfirm });
      alert('Matches confirmed successfully!');
      setResults([]);
      setSelectedMatches({});
    } catch (error) {
      console.error('Confirmation error:', error);
      alert('Failed to confirm matches.');
    } finally {
      setIsConfirming(false);
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
          const apiMatches = apiResults[po_item].matches;
          const details = apiResults[po_item].details;
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
            details: details,
          };
        });

        setResults(formattedResults);

        const initialSelectedMatches: SelectedMatches = {};
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
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset? All current data will be lost.')) {
      setFile(null);
      setResults([]);
      setSelectedMatches({});
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>Process Purchase Order</h1>
        <div className="upload-section">
          <input type="file" ref={fileInputRef} onChange={handleFileChange} />
          <button onClick={handleUpload} disabled={!file || isLoading}>
            {isLoading ? 'Processing...' : 'Upload'}
          </button>
          <button onClick={handleReset} className="reset-button" disabled={(!file && results.length === 0) || isLoading}>
            Reset
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="card" ref={resultsRef}>
          <h2>Matching Results</h2>
          <div className="results-section">
            <div className="results-table-container">
              {isLoading && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                </div>
              )}
              <table className="results-table">
                <thead>
                  <tr>
                    <th>PO Item</th>
                    <th>Details</th>
                    <th>Catalog Match</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index}>
                      <td>{result.po_item}</td>
                      <td>
                        {result.details && (
                          <div className="item-details">
                            {Object.entries(result.details).map(([key, value]) => (
                              value !== null && value !== undefined && (
                                <p key={key}><strong>{key}:</strong> {String(value)}</p>
                              )
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <select onChange={(e) => handleSelectionChange(result.po_item, JSON.parse(e.target.value))}>
                          {result.matches.map((match, i) => (
                            <option key={i} value={JSON.stringify(match.catalog_item)}>
                              {match.catalog_item.description} (Score: {match.score.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="confirm-button">
            <button onClick={handleConfirmMatches} disabled={isConfirming}>
              {isConfirming ? 'Saving...' : 'Save Purchase Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
