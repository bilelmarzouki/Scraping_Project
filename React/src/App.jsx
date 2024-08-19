import React, { useState } from 'react';

export default function App() {
  const [productType, setProductType] = useState('');
  const [height, setHeight] = useState('');
  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [capacity, setCapacity] = useState('');
  const [data, setData] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [showNoProductsMessage, setShowNoProductsMessage] = useState(false);

  const minHeight = parseInt(height) - 100;
  const maxHeight = parseInt(height) + 100;
  const minWidth = parseInt(width) - 100;
  const maxWidth = parseInt(width) + 100;
  const minDepth = parseInt(depth) - 100;
  const maxDepth = parseInt(depth) + 100;
  const minCapacity = parseInt(capacity) - 200;
  const maxCapacity = parseInt(capacity) + 200;

  const regex1 = /\b(\d+)\s*x\s*(\d+)\s*mm\b/i;
  const regex2 = /\b(\d+)\s*x\s*(\d+)\s*x\s*(\d+)\s*mm\b/i;
  const regex3 = /\b(\d+)\s*(W|Watt)\b/i;

  // Reset submitted state whenever any input changes
  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    setSubmitted(false); // Reset submitted state to false
    setData([]); // Clear previous search results
    setShowNoProductsMessage(false);
  };

  const handleButtonClick = async () => {
    setSubmitted(true);
    
    const searchPhrase = `${productType} ${height} x ${width} x ${depth} ${capacity ? ' ' + capacity : ''}`;

    try {
      const response = await fetch('http://localhost:3000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchPhrase }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const fetchedData = await response.json();
      setData(fetchedData);
      setShowNoProductsMessage(true);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setData([]); // Clear data on error
    }
  };
 
  const parseProductName = (productName) => {
    let dimensions = {};
    let capacity = null;

    let match = productName.match(regex1);
    if (match) {
      dimensions.height = Math.max(parseInt(match[1]), parseInt(match[2]));
      dimensions.width = Math.min(parseInt(match[1]), parseInt(match[2]));
    }

    match = productName.match(regex2);
    if (match) {
      const numbers = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])].sort((a, b) => a - b);
      dimensions.depth = numbers[0];
      dimensions.width = numbers[1];
      dimensions.height = numbers[2];
    }

    match = productName.match(regex3);
    if (match) {
      capacity = parseInt(match[1]);
    }

    return { dimensions, capacity };
  };

  const filteredProducts = data.filter(item =>
    new RegExp(productType, 'i').test(item.productName) &&
    (regex1.test(item.productName) || regex2.test(item.productName))
  );

  const parsePrice = (priceString) => {
    return parseFloat(priceString.replace(/[^\d,]/g, '').replace(',', '.'));
  };

  const filteredData = filteredProducts
    .map(item => {
      const { dimensions, capacity } = parseProductName(item.productName);
      const price = parsePrice(item.price);
      return { ...item, ...dimensions, capacity, price };
    })
    .filter(item =>
      (!item.height || (item.height >= minHeight && item.height <= maxHeight)) ||
      (!item.width || (item.width >= minWidth && item.width <= maxWidth)) ||
      (!item.depth || (item.depth >= minDepth && item.depth <= maxDepth)) ||
      (!item.capacity || (item.capacity >= minCapacity && item.capacity <= maxCapacity))
    )
    .sort((a, b) => a.price - b.price)
    .slice(0, 3);

  const averagePrice = filteredData.length > 0
    ? (filteredData.reduce((sum, item) => sum + item.price, 0) / filteredData.length).toFixed(2)
    : 0;

  return (
    <section className="border p-4 mr-10 ml-10 mt-10">
      <div className="mb-4 flex items-center">
        <label htmlFor="productType" className="w-[7vw] block font-medium mr-2">Product Type</label>
        <input
          type="text"
          id="productType"
          value={productType}
          onChange={handleInputChange(setProductType)}
          className="w-1/3 p-2 border rounded-md"
          required
        />
      </div>
      <div className="mb-4 flex items-center">
        <label htmlFor="height" className="w-[7vw] block font-medium mr-2">Height</label>
        <input
          type="text"
          id="height"
          value={height}
          onChange={handleInputChange(setHeight)}
          className="w-1/3 p-2 border rounded-md"
          required
        />
      </div>
      <div className="mb-4 flex items-center">
        <label htmlFor="width" className="w-[7vw] block font-medium mr-2">Width</label>
        <input
          type="text"
          id="width"
          value={width}
          onChange={handleInputChange(setWidth)}
          className="w-1/3 p-2 border rounded-md"
          required
        />
      </div>
      <div className="mb-4 flex items-center">
        <label htmlFor="depth" className="w-[7vw] block font-medium mr-2">Depth</label>
        <input
          type="text"
          id="depth"
          value={depth}
          onChange={handleInputChange(setDepth)}
          className="w-1/3 p-2 border rounded-md"
          required
        />
      </div>
      {/heizkörper/i.test(productType) && (
        <div className="mb-4 flex items-center">
          <label htmlFor="capacity" className="w-[7vw] block font-medium mr-2">Capacity</label>
          <input
            type="text"
            id="capacity"
            value={capacity}
            onChange={handleInputChange(setCapacity)}
            className="w-1/3 p-2 border rounded-md"
          />
        </div>
      )}
      <div className="ml-56">
        <button
          type="button"
          className="bg-blue-500 text-white text-xl px-16 py-3 rounded-full"
          onClick={handleButtonClick}
        >
          Search
        </button>
      </div>
      <div className="mt-8">
        {submitted && (
          filteredData.length > 0 ? (
            <div className="my-3">
              <h2 className='text-xl font-semibold my-3 text-red-600'>Search completed successfully. Here are the top 3 products:</h2>
              <p className="text-lg font-medium text-gray-700">
                Average Price: {averagePrice} EUR
              </p>
              {filteredData.map((item, index) => (
                <div key={index} className="border p-4 mb-4">
                  <h3 className="text-lg font-semibold">{item.productName}</h3>
                  {item.link && (
                    <div className="overflow-hidden">
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 break-words">
                        {item.link}
                      </a>
                    </div>
                  )}
                  <p className="text-gray-600">Price: {item.price} € </p>
                </div>
              ))}
            </div>
          ) : (
            showNoProductsMessage && (
              <p>No products found</p>
            )
          )
        )}
      </div>
    </section>
  );
}
