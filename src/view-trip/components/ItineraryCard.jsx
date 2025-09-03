import React, { useEffect, useState } from "react";
import { PHOTO_REF_URL } from "@/constants/options";
import { GetPlaceDetails } from "@/service/GlobalApi";
import { CiStar } from "react-icons/ci";
import { GiTicket } from "react-icons/gi";
import { FaClock, FaMapMarkerAlt } from "react-icons/fa";
import { MdAttachMoney } from "react-icons/md";
import { Link } from "react-router-dom";

const ItineraryCard = ({ plan }) => {
  const [photoUrl, setPhotoUrl] = useState("/placeholder.jpg"); // fallback

  useEffect(() => {
    if (plan?.placeName) {
      fetchPlacePhoto(plan.placeName);
    }
  }, [plan]);

  const fetchPlacePhoto = async (query) => {
    try {
      const result = await GetPlaceDetails(query);
      const photoName = result?.data?.places?.[0]?.photos?.[0]?.name;
      if (photoName) {
        const url = PHOTO_REF_URL.replace("{NAME}", photoName);
        setPhotoUrl(url);
      }
    } catch (error) {
      console.error("Error fetching place photo:", error);
    }
  };

  return (
    <Link
      to={`https://www.google.com/maps/search/?api=1&query=${plan?.placeName}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="flex flex-col bg-white rounded-xl shadow-lg overflow-hidden transition-transform transform hover:scale-105 duration-300">
        {/* Image */}
        <img
          className="w-full h-48 object-cover"
          src={photoUrl}
          alt={plan?.placeName || "Place"}
          onError={() => setPhotoUrl("/placeholder.jpg")}
        />

        {/* Content */}
        <div className="p-4 space-y-2">
          <h4 className="text-lg font-semibold flex items-center">
            <FaMapMarkerAlt className="text-blue-500 mr-2" />
            {plan?.placeName || "Unknown Place"}
          </h4>

          {plan?.rating && (
            <p className="flex items-center text-gray-700">
              <CiStar className="text-yellow-500 mr-1" />
              {plan.rating} ⭐
            </p>
          )}

          {plan?.ticketPricing && (
            <p className="flex items-center text-gray-600">
              <GiTicket className="text-green-500 mr-1" />
              Ticket: {plan.ticketPricing}
            </p>
          )}

          {plan?.timeTravel && (
            <p className="flex items-center text-gray-600">
              <FaClock className="text-gray-500 mr-1" />
              Travel Time: {plan.timeTravel}
            </p>
          )}

          {plan?.placeDetails && (
            <p className="text-sm text-gray-500 line-clamp-3">
              {plan.placeDetails}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ItineraryCard;
