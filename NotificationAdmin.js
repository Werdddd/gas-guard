import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Image, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, getDocs, orderBy, query, onSnapshot } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { firestore, auth } from './firebase.config'; // Import firestore from config
import useNotifTest from './testNotif';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { signOut } from 'firebase/auth'; // Import signOut from auth
import Ionicons from 'react-native-vector-icons/Ionicons'; // Import Ionicons for icons

const NotificationCard = ({ user, userName, level, ppm, datetime, color, mobileNumber }) => (
  <View style={[styles.card, { backgroundColor: color }]}>
    <View style={styles.textContainer}>
      <Text style={styles.userName}>{userName}</Text>
      <Text style={styles.user}>{user}</Text>  
      <Text style={styles.mobileNumber}>{mobileNumber}</Text>
      <Text style={styles.level}>{level}</Text>
      <Text style={styles.datetime}>{datetime}</Text>
     
    </View>
    <View style={styles.ppmContainer}>
      <Text style={styles.ppm}>{ppm}</Text>
      <Text style={styles.unit}>ppm</Text>
    </View>
  </View>
);

const NotificationAdminScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigation = useNavigation();

  useNotifTest();

  useEffect(() => {
    setLoading(true);
    
    // Set up real-time listener for notifications
    const q = query(
      collection(firestore, 'notifications'), 
      orderBy('datetime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notificationsList = [];
      querySnapshot.forEach((doc) => {
        const notificationData = doc.data();
        notificationsList.push({
          id: doc.id,
          userName: notificationData.userName,
          user: notificationData.userEmail,
          level: notificationData.level,
          ppm: notificationData.ppm,
          datetime: notificationData.datetime,
          color: notificationData.color,
          mobileNumber: notificationData.mobileNumber,
        });
      });
      
      setNotifications(notificationsList);
      setLoading(false);
    }, (error) => {
      setError('Failed to fetch notifications');
      console.error('Error fetching notifications: ', error);
      setLoading(false);
    });

    // Clean up listener on component unmount
    return () => unsubscribe();
  }, []);

  const downloadExcel = async () => {
    try {
      const q = query(collection(firestore, 'notifications'), orderBy('datetime', 'desc')); // Fetch sorted notifications
      const querySnapshot = await getDocs(q);
      const notificationsList = [];

      querySnapshot.forEach((doc) => {
        const notificationData = doc.data();
        notificationsList.push({
          id: doc.id,
          userName: notificationData.userName,
          user: notificationData.userEmail,
          level: notificationData.level,
          ppm: notificationData.ppm,
          datetime: notificationData.datetime,
          color: notificationData.color,
          mobileNumber: notificationData.mobileNumber,
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(notificationsList);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Notifications');

      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const fileUri = FileSystem.documentDirectory + 'notifications.xlsx';

      await FileSystem.writeAsStringAsync(fileUri, excelBuffer, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(fileUri);
    } catch (err) {
      console.error('Error downloading Excel file: ', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.navigate('Login');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007ACC" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Buttons with Icons */}
      <TouchableOpacity style={styles.downloadButton} onPress={downloadExcel}>
        <Ionicons name="download-outline" size={24} color="#fff" />
        
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={24} color="#fff" />
      </TouchableOpacity>
      
      {/* Logo */}
      <Image source={require('./assets/logo.png')} style={styles.logo} />
      <Text style={styles.title}>Admin Notifications</Text>
      <View style={styles.divider} />

      {/* Notifications List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id} // Use the document ID as key
        renderItem={({ item }) => (
          <NotificationCard
            userName={item.userName}
            user={item.user}
            level={item.level}
            ppm={item.ppm}
            datetime={item.datetime}
            color={item.color}
            mobileNumber={item.mobileNumber}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginTop: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  divider: {
    width: '60%',
    height: 2,
    backgroundColor: '#007ACC',
    alignSelf: 'center',
    marginVertical: 10,
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  textContainer: {
    flex: 1,
  },
  user: {
    fontSize: 13,
    color: '#fff',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5, 
  },
  level: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
  },
  datetime: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    marginBottom: 5,
  },
  ppmContainer: {
    alignItems: 'flex-end',
  },
  ppm: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  unit: {
    fontSize: 16,
    color: '#fff',
    marginTop: -5,
  },
  signOutButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#007ACC',
    padding: 10,
    borderRadius: 50,
    zIndex: 1,
    marginTop:40,
  },
  downloadButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#007ACC',
    padding: 10,
    borderRadius: 50,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    marginTop:40,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  mobileNumber: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
});

export default NotificationAdminScreen;
