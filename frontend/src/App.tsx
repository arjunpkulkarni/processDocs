import { useState, useRef, useEffect } from 'react';
import api from './api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

type Order = {
  id: number;
  po_item: string;
  catalog_item_id: string;
  catalog_item_description: string;
  created_at: string;
};

type View = 'upload' | 'orders';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [selectedMatches, setSelectedMatches] = useState<SelectedMatches>({});
  const [view, setView] = useState<View>('upload');
  const [orders, setOrders] = useState<Order[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  useEffect(() => {
    if (view === 'orders') {
      fetchOrders();
    }
  }, [view]);

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

  const downloadJson = (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = (data: any[], filename: string) => {
    const doc = new jsPDF();
    const allKeys = data.reduce<string[]>((keys, obj) => {
      Object.keys(obj).forEach(key => {
        if (!keys.includes(key)) {
          keys.push(key);
        }
      });
      return keys;
    }, []);

    autoTable(doc, {
      head: [allKeys],
      body: data.map(row => allKeys.map(key => row[key] !== undefined && row[key] !== null ? String(row[key]) : '')),
    });
    doc.save(filename);
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
      console.log("confirming matches", { matches: matchesToConfirm });
      await api.post('/confirm_matches', { matches: matchesToConfirm });
      alert('Matches confirmed successfully!');
      setResults([]);
      setSelectedMatches({});
    } catch (error) {
      console.error('Confirmation error:', error);
      const pdfData = Object.keys(selectedMatches).map(po_item => {
        const catalog_item = selectedMatches[po_item];
        const result = results.find(r => r.po_item === po_item);
        const details = result ? result.details : {};
        return {
          "PO Item": po_item,
          "Catalog ID": catalog_item.id,
          "Catalog Description": catalog_item.description,
          ...details
        };
      });
      downloadPdf(pdfData, 'matches.pdf');
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
        console.log("uploading file", file);
        const response = await api.post('/upload', formData, {
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

  const renderUploadView = () => (
    <>
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
    </>
  );

  const renderOrdersView = () => (
    <div className="card">
      <h1>Confirmed Orders</h1>
      <div className="orders-table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th>PO Item</th>
              <th>Catalog Item ID</th>
              <th>Catalog Item Description</th>
              <th>Confirmed At</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.po_item}</td>
                <td>{order.catalog_item_id}</td>
                <td>{order.catalog_item_description}</td>
                <td>{new Date(order.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <nav
        className="top-nav"
        style={{ backgroundColor: 'black', padding: '1rem', borderRadius: '1rem', display: 'flex', gap: '1rem' }}
      >
        <button
          onClick={() => setView('upload')}
          disabled={view === 'upload'}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid white',
            padding: '0.5rem 1rem',
            cursor: view === 'upload' ? 'not-allowed' : 'pointer',
            opacity: view === 'upload' ? 0.5 : 1,
          }}
        >
          Process PO
        </button>
        <button
          onClick={() => setView('orders')}
          disabled={view === 'orders'}
          style={{
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid white',
            padding: '0.5rem 1rem',
            cursor: view === 'orders' ? 'not-allowed' : 'pointer',
            opacity: view === 'orders' ? 0.5 : 1,
          }}
        >
          View Orders
        </button>
      </nav>

      {view === 'upload' ? renderUploadView() : renderOrdersView()}
    </div>
  );
}

export default App;