// src/components/InfoSection.jsx
import React, { useEffect, useState } from "react";
import { GetPlaceDetails, getPlacePhotoUrl } from "@/service/GlobalApi";

const InfoSection = ({ trip }) => {
  const [photos, setPhotos] = useState([]);
  const [debug, setDebug] = useState({ query: "", locationShape: null });

  useEffect(() => {
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip]);

  const buildQueryFromTrip = (t) => {
    // Log the raw shape so we see what Firestore stored
    const loc = t?.userChoice?.location;
    console.log("📌 trip.userChoice.location shape:", loc);

    // Try common shapes in your app
    const fromDisplayName = loc?.displayName?.text;
    const fromFormatted = loc?.formattedAddress;

    // If location itself is a string, use it directly
    const fromString =
      typeof loc === "string" ? loc : undefined;

    // Pick the first available
    return fromDisplayName || fromFormatted || fromString || "";
  };

  const fetchPhotos = async () => {
    try {
      if (!trip) return;

      const query = buildQueryFromTrip(trip);
      setDebug({ query, locationShape: trip?.userChoice?.location });

      if (!query) {
        console.warn("⚠️ No valid location found for trip");
        setPhotos([]);
        return;
      }

      console.log("🔎 Querying Places API with:", query);
      const places = await GetPlaceDetails(query); // <-- ARRAY

      console.log("📸 Places (array):", places);

      const first = places?.[0];
      const photoList = first?.photos ?? [];

      if (photoList.length === 0) {
        console.warn("⚠️ No photos found for this location");
        setPhotos([]);
        return;
      }

      setPhotos(photoList);
    } catch (err) {
      console.error("❌ Error fetching place photos:", err);
      setPhotos([]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mt-12 md:mx-16 lg:mx-48 p-6 rounded-lg shadow-lg">
      {/* Photos grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {photos.slice(0, 4).map((p, i) => (
            <img
              key={i}
              src={getPlacePhotoUrl(p)}
              alt={`Trip photo ${i}`}
              className="h-40 w-40 rounded-lg object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="text-gray-500">
          ⚠️ No images available
          {debug.query ? (
            <div className="text-xs mt-2">
              (Query used: <code>{debug.query}</code>)
            </div>
          ) : null}
        </div>
      )}

      {/* Trip Info */}
      <div className="flex flex-col ml-6 items-end">
        <div className="text-4xl font-bold mb-2 flex items-center">
          🗺️{" "}
          {trip?.userChoice?.location?.displayName?.text ||
            trip?.userChoice?.location?.formattedAddress ||
            (typeof trip?.userChoice?.location === "string"
              ? trip.userChoice.location
              : "Unknown location")}
        </div>
        <div className="text-xl mb-1 flex items-center">
          📅 <span className="font-semibold ml-2">Duration:</span>{" "}
          {trip?.userChoice?.noOfDays} days
        </div>
        <div className="text-xl mb-1 flex items-center">
          💰 <span className="font-semibold ml-2">Budget:</span>{" "}
          {trip?.userChoice?.budget}
        </div>
        <div className="text-xl flex items-center">
          👥 <span className="font-semibold ml-2">Traveling with:</span>{" "}
          {trip?.userChoice?.noOfPeople}
        </div>
      </div>
    </div>
  );
};

export default InfoSection;
