import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import WebView from "react-native-webview";
import * as Location from "expo-location";

const html = `
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>html,body,#map{height:100%;margin:0;padding:0}</style>
<script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU"></script>
</head><body><div id="map"></div>
<script>
  let map;
  function init(){
    map = new ymaps.Map('map',{center:[55.75,37.61],zoom:13,controls:['zoomControl']});
  }
  function addPlacemark(type,lat,lon){
    const colors={VU:'islands#redIcon',CPV:'islands#blueIcon',SCOUT:'islands#greenIcon'};
    map.geoObjects.add(new ymaps.Placemark([lat,lon],{balloonContent:type},{preset:colors[type]||'islands#grayIcon'}));
  }
  window.addEventListener('message',e=>{
    try{
      const msg=JSON.parse(e.data);
      if(msg.type==='setCenter'){ map.setCenter([msg.lat,msg.lon],14); }
      if(msg.type==='addMark'){ addPlacemark(msg.kind,msg.lat,msg.lon); }
    }catch(_){}
  });
  ymaps.ready(init);
</script></body></html>
`;

export default function App() {
  const webRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let loc = await Location.getCurrentPositionAsync({});
      setPos({ lat: loc.coords.latitude, lon: loc.coords.longitude });
    })();
  }, []);

  useEffect(() => {
    if (pos && webRef.current) {
      webRef.current.postMessage(JSON.stringify({ type: "setCenter", ...pos }));
    }
  }, [pos]);

  const add = (kind) => {
    const p = pos || { lat: 55.75, lon: 37.61 };
    webRef.current.postMessage(JSON.stringify({ type: "addMark", kind, ...p }));
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled
        onMessage={() => {}}
      />
      <View style={styles.actions}>
        <Btn title="ВУ" color="#b00020" onPress={() => add("VU")} />
        <Btn title="CPV" color="#0057e7" onPress={() => add("CPV")} />
        <Btn title="Разведчик" color="#00897b" onPress={() => add("SCOUT")} />
      </View>
    </View>
  );
}

function Btn({ title, onPress, color }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, { backgroundColor: color }]}>
      <Text style={styles.txt}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  actions: {
    position: "absolute", left: 16, right: 16, bottom: 16,
    flexDirection: "row", justifyContent: "space-between"
  },
  btn: { flex: 1, marginHorizontal: 5, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  txt: { color: "#fff", fontWeight: "700" }
});
