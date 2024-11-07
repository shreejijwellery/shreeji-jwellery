import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append('pdf', event.target.pdf.files[0]);
    formData.append('csv', event.target.csv.files[0]);

    try {
      const response = await fetch('/api/processFiles', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('File processing failed');

      // Create a downloadable link for the processed file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sorted_output.pdf');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h1>PDF and CSV Processor</h1>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="pdf">Upload PDF:</label>
          <input type="file" id="pdf" name="pdf" accept=".pdf" required />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="csv">Upload CSV:</label>
          <input type="file" id="csv" name="csv" accept=".csv" required />
        </div>
        <button type="submit" disabled={loading} style={{ padding: '10px 20px' }}>
          {loading ? 'Processing...' : 'Process Files'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>File processed successfully. Check your downloads.</p>}
    </div>
  );
}
