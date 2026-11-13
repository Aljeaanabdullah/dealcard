import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

// المرحلة 0: شاشة فاضية بالعرض. الواجهة الفعلية تنبني في المرحلة 7.
export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar hidden />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2E33',
  },
});
