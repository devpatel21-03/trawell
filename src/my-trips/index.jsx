import { db, readDataWithRetry } from "@/service/firebaseConfig";
import { collection, getDocs, query, where, doc, deleteDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useNavigation } from "react-router-dom";
import UserTripCardItem from "./components/UserTripCardItem";
import { toast } from "sonner";

const MyTrips = () => {
  const navigation = useNavigation();
  const [userTrips, setUserTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  // using to get all trips of a user
  const GetUserTrips = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        navigation("/");
        return;
      }

      const q = query(
        collection(db, "AITrips"),
        where("userEmail", "==", user?.email)
      );
      
      setUserTrips([]);
      
      // Use the new readDataWithRetry function
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
        setUserTrips((prevVal) => [...prevVal, doc.data()]);
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user trips:", error);
      setLoading(false);
      toast.error("Failed to load trips. Please try again.");
    }
  };

  const handleDelete = async (tripId) => {
    try {
      await deleteDoc(doc(db, "AITrips", tripId));
      setUserTrips((prev) => prev.filter((trip) => trip.id !== tripId));
    } catch (error) {
      console.error("Error deleting trip:", error);
    }
  };

  useEffect(() => {
    GetUserTrips();
  }, []);

  return (
    <div className="p-10 md:px-20 lg:px-36">
      <h2 className="font-bold text-4xl text-center">My Trips</h2>
      {loading ? (
        <div className="flex justify-center mt-10">
          <div className="text-lg">Loading your trips...</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 mt-10 md:grid-cols-3 gap-5">
          {userTrips.map((trip, index) => (
            <UserTripCardItem trip={trip} key={index} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTrips;
