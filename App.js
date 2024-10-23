import { app, database, storage } from "./firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useState, useRef, useEffect } from "react";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

export default function App() {
  const [region, setRegion] = useState({
    latitude: 55,
    longitude: 23,
    latitudeDelta: 25,
    longitudeDelta: 25,
  });
  const [markers, setMarkers] = useState([]);
  const markersCollection = collection(database, "markers");
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [modalVisibility, setModalVisibility] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mapView = useRef(null); //ref til map view objektet
  const locationSubscription = useRef(null); //stopper tracking når app lukker

  // listen for location of device:
  useEffect(() => {
    async function startListening() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("ingen adgang til lokation");
        return;
      }
      locationSubscription.current = await Location.watchPositionAsync(
        {
          distanceInterval: 100,
          accuracy: Location.Accuracy.High,
        },
        (lokation) => {
          const newRegion = {
            latitude: lokation.coords.latitude,
            longitude: lokation.coords.longitude,
            latitudeDelta: 5,
            longitudeDelta: 5,
          };
          setRegion(newRegion); //flytter kort til ny lokation
          if (mapView.current) {
            mapView.current.animateToRegion(newRegion);
          }
        }
      );
    }
    startListening();
    return () => {
      if (locationSubscription.current) {
        //sluk location når app luk
        locationSubscription.current.remove();
      }
    };
  }, []);
  // fetch markers:
  useEffect(() => {
    async function fetchMarkers() {
      try {
        const querySnapshot = await getDocs(markersCollection);
        const fetchedMarkers = querySnapshot.docs.map((doc) => ({
          key: doc.id,
          coordinate: {
            latitude: doc.data().latitude,
            longitude: doc.data().longitude,
          },
          title: doc.data().title,
        }));
        setMarkers(fetchedMarkers);
      } catch (error) {
        console.error("Error fetching markers from Firestore: ", error);
      }
    }

    fetchMarkers();
  }, []);

  async function addMarker(data) {
    const { latitude, longitude } = data.nativeEvent.coordinate;
    const newMarker = {
      coordinate: { latitude, longitude },
      key: Date.now(),
      title: "Best place eva",
    };
    try {
      const docRef = await addDoc(markersCollection, {
        latitude,
        longitude,
        title: newMarker.title,
        timeStamp: new Date().toISOString(),
      });
      newMarker.key = docRef.id;
      setMarkers([...markers, newMarker]);
    } catch (error) {
      console.log(error);

      alert("Couldn't upload marker");
    }
  }

  function onMarkerPressed(marker) {
    setSelectedMarker(marker);
    setModalVisibility(true);
  }
  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert(
        `Sorry mate, can't upload any photos from your library without permission`
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setIsUploading(true);
      try {
        const filename = await uploadImage(result.assets[0].uri);

        const updatedMarkers = markers.map((marker) => {
          if (marker.key === selectedMarker.key) {
            return {
              ...marker,
              images: [...(marker.images || []), result.assets[0].uri],
              storedImages: [...(marker.storedImages || []), filename],
            };
          }
          return marker;
        });
        setMarkers(updatedMarkers);
      } catch (error) {
        console.error("Error in pickImage: ", error);
        alert("Der opstod en fejl ved håndtering af billede");
      } finally {
        setIsUploading(false);
      }
    }
  }

  async function uploadImage(imagePath) {
    try {
      const response = await fetch(imagePath);
      const blob = await response.blob();
      const filename = `image_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      alert("Billede uploadet!");

      const imageRef = await addDoc(collection(database, "images"), {
        filename: filename,
        markerKey: selectedMarker.key,
        uploadDate: new Date().toISOString(),
        coordinate: selectedMarker.coordinate,
      });

      return filename;
    } catch (error) {
      console.error("Error uploading image: ", error);
      alert("Der opstod en fejl ved upload af billede");
    }
  }
  return (
    <View style={styles.container}>
      <MapView
        ref={mapView}
        style={styles.map}
        region={region}
        onLongPress={addMarker}
      >
        {markers.map((marker) => (
          <Marker
            coordinate={marker.coordinate}
            key={marker.key}
            title={marker.title}
            onPress={() => onMarkerPressed(marker)}
          />
        ))}
      </MapView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisibility}
        onRequestClose={() => setModalVisibility(false)}
      >
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>{selectedMarker?.title}</Text>
          <ScrollView horizontal style={styles.imageScroll}>
            {selectedMarker?.images?.map((image, index) => (
              <Image key={index} source={{ uri: image }} style={styles.image} />
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.button, isUploading && styles.buttonDisabled]}
            onPress={pickImage}
            disabled={isUploading}
          >
            <Text style={styles.buttonText}>
              {isUploading ? "Uploader..." : "Tilføj foto"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={() => setModalVisibility(false)}
          >
            <Text style={styles.buttonText}>Luk</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  modalView: {
    margin: 20,
    marginTop: "auto",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#2196F3",
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 10,
    minWidth: 150,
  },
  buttonDisabled: {
    backgroundColor: "#cccccc",
  },
  closeButton: {
    backgroundColor: "#ff6b6b",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  imageScroll: {
    maxHeight: 200,
    marginBottom: 10,
  },
  image: {
    width: 200,
    height: 200,
    marginRight: 10,
    borderRadius: 10,
  },
});
