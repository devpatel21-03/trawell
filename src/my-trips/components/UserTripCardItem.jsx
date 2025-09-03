import { PHOTO_REF_URL } from "@/constants/options";
import { GetPlaceDetails } from "@/service/GlobalApi";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/service/firebaseConfig";

const UserTripCardItem = ({ trip, onDelete }) => {
  const [photoURL, setPhotoURL] = useState();

  const GetPlacePhoto = async () => {
    const query = trip?.userChoice?.location?.label || "";
    try {
      const resp = await GetPlaceDetails(query);
      const places = resp?.data?.places;
      // Use the first place and first photo if available
      const photoName = places?.[0]?.photos?.[0]?.name;
      if (photoName) {
        const Url = PHOTO_REF_URL.replace("{NAME}", photoName);
        setPhotoURL(Url);
      } else {
        console.warn("No photo found for place:", query);
        setPhotoURL(""); // Or set a default image URL
      }
    } catch (error) {
      console.error("Error fetching place photo:", error);
      setPhotoURL(""); // Or set a default image URL
    }
  };
  useEffect(() => {
    trip && GetPlacePhoto();
  }, [trip]);
  return (
    <div>
      <Link to={"/view-trip/" + trip?.id}>
        <div className="hover:scale-105 transition-all hover:shadow-md">
          <img
            className="object-cover rounded-xl mx-auto w-80 h-64"
            src={photoURL}
          />
          <h2 className="font-bold text-lg">
            {trip?.userChoice?.location?.label}
          </h2>
          <h2 className="text-sm text-gray-500">
            {trip?.userChoice?.noOfDays} days trip with "
            {trip?.userChoice?.budget}" budget.
          </h2>
        </div>
      </Link>
      <button
        className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
        onClick={() => onDelete(trip?.id)}
      >
        Delete
      </button>
    </div>
  );
};

export default UserTripCardItem;
