// src/service/GlobalApi.jsx
import axios from "axios";

const BASE_URL = "https://places.googleapis.com/v1/places:searchText";

// Call Places API and return an ARRAY: places[]
export const GetPlaceDetails = async (textQuery) => {
  if (!textQuery || typeof textQuery !== "string") {
    throw new Error("GetPlaceDetails: textQuery must be a non-empty string");
  }

  const resp = await axios.post(
    BASE_URL,
    { textQuery },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": import.meta.env.VITE_GOOGLE_PLACE_API_KEY,
        // ask explicitly for photos metadata
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.photos.name,places.photos.widthPx,places.photos.heightPx",
      },
    }
  );

  return resp?.data?.places ?? []; // <-- ALWAYS an array
};

// Build a usable image URL from photo metadata
export const getPlacePhotoUrl = (photo) => {
  const name = photo?.name;
  if (!name) return null;
  return `https://places.googleapis.com/v1/${name}/media?maxHeightPx=600&maxWidthPx=800&key=${import.meta.env.VITE_GOOGLE_PLACE_API_KEY}`;
};
