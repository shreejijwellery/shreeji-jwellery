import { useState } from 'react';

export default function ExtractSKU() {
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
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-center text-gray-700">PDF and CSV Processor</h1>
        <form onSubmit={handleSubmit} encType="multipart/form-data" className="space-y-4">
          <div>
            <label htmlFor="pdf" className="block text-sm font-medium text-gray-600">
              Upload PDF:
            </label>
            <input
              type="file"
              id="pdf"
              name="pdf"
              accept=".pdf"
              required
              className="w-full px-3 py-2 mt-1 border rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="csv" className="block text-sm font-medium text-gray-600">
              Upload CSV:
            </label>
            <input
              type="file"
              id="csv"
              name="csv"
              accept=".csv"
              required
              className="w-full px-3 py-2 mt-1 border rounded-lg focus:ring focus:ring-blue-200 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full px-4 py-2 font-medium text-white bg-blue-500 rounded-lg 
              hover:bg-blue-600 transition ${loading ? 'bg-blue-300 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Processing...' : 'Process Files'}
          </button>
        </form>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {success && <p className="text-sm text-green-500 text-center">File processed successfully. Check your downloads.</p>}
      </div>
    </div>
  );
}
