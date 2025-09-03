import React, { useState } from "react";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACE_API_KEY;

const fetchSuggestions = async (input) => {
  if (!input) return [];
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_API_KEY,
      "X-Goog-FieldMask": "places.displayName,places.formattedAddress",
    },
    body: JSON.stringify({ textQuery: input }),
  });
  const data = await response.json();
  return data.places || [];
};

const CustomPlacesAutocomplete = ({ onSelect }) => {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const handleChange = async (e) => {
    const value = e.target.value;
    setInput(value);
    if (value.length > 2) {
      const results = await fetchSuggestions(value);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        placeholder="Search for a place"
        className="border px-2 py-1 rounded w-full"
      />
      {suggestions.length > 0 && (
        <ul className="border rounded bg-white mt-1 max-h-48 overflow-auto">
          {suggestions.map((place, idx) => (
            <li
              key={idx}
              className="px-2 py-1 cursor-pointer hover:bg-gray-100"
              onClick={() => {
                setInput(place.displayName.text);
                setSuggestions([]);
                onSelect(place);
              }}
            >
              {place.displayName.text} - {place.formattedAddress}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomPlacesAutocomplete;